import secrets
import shutil, os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import logging
from config.db import get_db
from schemas.auth_schema import (
    UserCreate,
    UserRead,
    LoginRequest,
    Token,
    FaceLoginResponse,
    DeleteProfileRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from services.auth_service import (
    create_user,
    authenticate_user,
    get_user_by_email,
    get_user_by_id,
    verify_password,
)
from services.facial_service.facial_auth import login_with_face
from services.facial_service.facial_auth import register as register_face_service
from services.facial_service.facial_auth import (
    delete_user_face_data,
    user_has_face_data,
)
from services.data_cleanup_service import DataCleanupService
from utils.security import create_access_token, decode_access_token
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    token_data = decode_access_token(token)
    user = get_user_by_email(db, token_data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized"
        )
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user"
        )
    return current_user


def require_role(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient privileges"
            )
        return current_user

    return role_checker


@router.post("/signup", response_model=UserRead)
def signup(user_details: UserCreate, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, user_details.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )
    user = create_user(
        db,
        email=user_details.email,
        password=user_details.password,
        full_name=user_details.full_name,
        role="user",
    )
    return user


@router.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token({"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, request.email)
    if user:
        otp = f"{secrets.randbelow(1_000_000):06d}"
        user.otp = otp
        user.otp_expires = datetime.utcnow() + timedelta(minutes=10)
        db.commit()
        logger.debug("Generated OTP for password reset for email %s", request.email)
        # In production, send the OTP via email rather than logging it.

    return {"message": "If the email exists, a password reset code has been sent."}


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, request.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    expires_at = user.otp_expires
    now = (
        datetime.now(expires_at.tzinfo)
        if expires_at and expires_at.tzinfo
        else datetime.utcnow()
    )
    if not user.otp or user.otp != request.otp or not expires_at or expires_at < now:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    from services.auth_service import hash_password

    user.hashed_password = hash_password(request.new_password)
    user.otp = None
    user.otp_expires = None
    db.commit()

    return {"message": "Password reset successfully"}


# =============
# Facial login endpoints
# =============
@router.post("/face/register")
async def register_face(
    userid: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    contents = await image.read()

    logger.debug(
        "Registering face for user %s with image size %d bytes",
        userid,
        len(contents),
    )
    res = await register_face_service(contents, userid, db)
    if not res or "error" in res:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(res or {}).get(
                "error", "Failed to register face. Please try again."
            ),
        )
    return {"message": "face registered..", "data": res}


@router.get("/face/status")
async def face_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Return whether the current user has facial login data registered."""
    has_face_login = await user_has_face_data(db, current_user.id)
    return {"has_face_login": has_face_login}


@router.delete("/face")
async def delete_face_setup(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Remove the current user's facial login setup without deleting the user account."""
    result = await delete_user_face_data(db, current_user.id)
    if result.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("message", "Failed to remove facial login setup."),
        )
    return {"status": "success", "message": "Facial login setup removed."}


# =============
# Profile deletion endpoint
# =============
@router.delete("/profile")
async def delete_profile(
    delete_request: DeleteProfileRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Delete user profile completely with password confirmation.
    This will permanently remove ALL user data from:
    - MySQL: user account, chat sessions, RAG documents, subscriptions
    - MongoDB: all chat sessions and messages
    - ChromaDB: all RAG vector embeddings
    - Disk: all uploaded RAG documents and face images

    Requires password confirmation for security.
    """
    try:
        # 1. Verify password
        if not verify_password(delete_request.password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Invalid password"
            )

        # 2. Delete all user data comprehensively
        cleanup_result = DataCleanupService.cleanup_user_data(db, current_user.id)
        # remove rag uploads & vectors from disk and chromadb, and all chat sessions from mongodb
        rag_upload_path = f"vectorDB/chroma/rag_user_vectors/{current_user.id}"
        if os.path.exists(rag_upload_path):
            shutil.rmtree(rag_upload_path)
        else:
            logger.warning(
                f"RAG upload path {rag_upload_path} does not found for user {current_user.id}"
            )

        # 3. Delete facial recognition data (also handles RAG uploads and other related data)
        face_deletion_result = await delete_user_face_data(db, current_user.id)

        # 4. Delete user record from database
        db.delete(current_user)
        db.commit()

        return {
            "status": "success",
            "message": "Profile and all associated data deleted successfully",
            "cleanup_details": cleanup_result,
            "face_data_deleted": face_deletion_result.get("status") == "success",
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error("Error deleting profile for user %s: %s", current_user.id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete profile. Please try again later.",
        )


@router.post("/face/login", response_model=FaceLoginResponse)
async def face_login(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Facial login endpoint.
    Accepts a camera image and returns a JWT plus user profile data.
    """
    contents = await image.read()
    result = await login_with_face(contents, db)

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=result["error"]
        )
    logger.debug(
        "Detected user id %s with confidence %s",
        result["user_id"],
        result["confidence"],
    )

    user = get_user_by_id(db, result["user_id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found for recognized face",
        )

    token = create_access_token({"sub": user.email, "role": user.role})
    return {
        "status": "success",
        "message": result["message"],
        "confidence": result["confidence"],
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }
