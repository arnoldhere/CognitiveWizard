import shutil, os, time, threading
from collections import deque
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import logging
from config.db import get_db
from config.settings import settings
from schemas.auth_schema import (
    UserCreate,
    UserRead,
    UserUpdateRequest,
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
    hash_password,
)
from utils.email_utils import send_password_reset_email
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

FACE_LOGIN_RATE_MAX = settings.FACE_LOGIN_RATE_MAX
FACE_LOGIN_RATE_WINDOW = settings.FACE_LOGIN_RATE_WINDOW
_login_attempts_lock = threading.Lock()
_login_attempts: dict[str, deque[float]] = {}

router = APIRouter(prefix="/auth", tags=["Auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    token_data = decode_access_token(token)
    user = User(id=token_data.id, email=token_data.email, role=token_data.role, is_active=True)
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


def rate_limit_face_login(request: Request):
    client_ip = getattr(request.client, "host", None) or "unknown"
    now = time.time()

    with _login_attempts_lock:
        bucket = _login_attempts.setdefault(client_ip, deque())
        while bucket and now - bucket[0] > FACE_LOGIN_RATE_WINDOW:
            bucket.popleft()
        if len(bucket) >= FACE_LOGIN_RATE_MAX:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many face login attempts. Please try again later.",
            )
        bucket.append(now)


# =============
# Removed endpoints: signup, login, me, profile (PATCH), forgot-password, reset-password
# These are now natively handled by js_server.
# =============


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

    if image.content_type and image.content_type not in {"image/jpeg", "image/jpg", "image/png"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG and PNG face images are supported.",
        )

    if len(contents) > settings.FACE_LOGIN_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Face image is too large. Please upload a smaller image.",
        )

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
@router.delete("/profile/data")
async def delete_profile_data(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Delete user AI profile completely. Called from js_server upon profile deletion.
    This will permanently remove AI data from:
    - MongoDB: all chat sessions and messages
    - ChromaDB: all RAG vector embeddings
    - Disk: all uploaded RAG documents and face images
    """
    try:
        # Delete AI data from systems
        cleanup_result = DataCleanupService.cleanup_user_data(db, current_user.id)
        # remove rag uploads & vectors from disk and chromadb
        rag_upload_path = f"vectorDB/chroma/rag_user_vectors/{current_user.id}"
        if os.path.exists(rag_upload_path):
            shutil.rmtree(rag_upload_path)
        else:
            logger.warning(f"RAG upload path {rag_upload_path} not found for user {current_user.id}")

        face_deletion_result = await delete_user_face_data(db, current_user.id)

        return {
            "status": "success",
            "message": "Profile AI data deleted successfully",
            "cleanup_details": cleanup_result,
            "face_data_deleted": face_deletion_result.get("status") == "success",
        }

    except Exception as e:
        logger.error("Error deleting profile AI data for user %s: %s", current_user.id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete profile AI data.",
        )


@router.post("/face/login")
async def face_login(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit_face_login),
):
    """
    Facial login AI endpoint.
    Accepts a camera image and returns the user_id matching the face.
    """
    contents = await image.read()

    if image.content_type and image.content_type not in {"image/jpeg", "image/jpg", "image/png"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG and PNG face images are supported.",
        )

    if len(contents) > settings.FACE_LOGIN_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Face image is too large. Please upload a smaller image.",
        )

    result = await login_with_face(contents, db)
    logger.info("Facial login attempt with confidence %s", result.get("confidence"))

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=result["error"]
        )
    logger.debug(
        "Detected user id %s with confidence %s",
        result["user_id"],
        result["confidence"],
    )

    return {
        "status": "success",
        "message": result["message"],
        "confidence": result["confidence"],
        "user_id": result["user_id"]
    }
