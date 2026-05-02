from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
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
from utils.security import create_access_token, decode_access_token
from models.user import User

# OTP storage (in production, use Redis)
otp_store = {}

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
        role=user_details.role or "user",
    )
    return user


@router.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, credentials.email, credentials.password)
    exists = db.query(User).filter(User.email == credentials.email).first()
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    access_token = create_access_token({"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, request.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Generate OTP
    import random

    otp = str(random.randint(100000, 999999))
    otp_store[request.email] = otp

    # Send email (placeholder)
    print(f"OTP for {request.email}: {otp}")  # In production, send email

    return {"message": "OTP sent to email"}


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    if request.email not in otp_store or otp_store[request.email] != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    user = get_user_by_email(db, request.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update password
    from services.auth_service import hash_password

    user.hashed_password = hash_password(request.new_password)
    db.commit()

    # Clear OTP
    del otp_store[request.email]

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

    print(f"Registering face for user {userid} with image size {len(contents)} bytes")
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
    This will delete:
    - User account from MySQL
    - Face embeddings from MySQL
    - Face vectors from ChromaDB
    - Stored face image files

    Requires password confirmation for security.
    """
    try:
        # 1. Verify password
        if not verify_password(delete_request.password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Invalid password"
            )

        # 2. Delete facial recognition data
        face_deletion_result = await delete_user_face_data(db, current_user.id)

        # 3. Delete user record from database
        db.delete(current_user)
        db.commit()

        return {
            "status": "success",
            "message": "Profile deleted successfully",
            "face_data_deleted": face_deletion_result.get("status") == "success",
            "face_details": face_deletion_result,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting profile for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete profile: {str(e)}",
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
    print(f"Detected User Id {result['user_id']} with score {result['confidence']}")

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
