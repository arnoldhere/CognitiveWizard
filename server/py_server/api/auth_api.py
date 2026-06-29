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
from pydantic import BaseModel
import logging
from config.settings import settings
from services.facial_service.facial_auth import login_with_face
from services.facial_service.facial_auth import register as register_face_service
from services.facial_service.facial_auth import delete_user_face_data

logger = logging.getLogger(__name__)

FACE_LOGIN_RATE_MAX = settings.FACE_LOGIN_RATE_MAX
FACE_LOGIN_RATE_WINDOW = settings.FACE_LOGIN_RATE_WINDOW
_login_attempts_lock = threading.Lock()
_login_attempts: dict[str, deque[float]] = {}

router = APIRouter(prefix="/auth", tags=["Auth"])


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
# Facial login endpoints (Raw)
# =============
@router.post("/face/register-raw")
async def register_face_raw(
    userid: str = Form(...),
    image: UploadFile = File(...),
):
    contents = await image.read()

    if image.content_type and image.content_type not in {
        "image/jpeg",
        "image/jpg",
        "image/png",
    }:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG and PNG face images are supported.",
        )

    if len(contents) > settings.FACE_LOGIN_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Face image is too large. Please upload a smaller image.",
        )

    res = await register_face_service(contents, userid)
    if not res or "error" in res:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(res or {}).get(
                "error", "Failed to register face. Please try again."
            ),
        )
    return {"message": "face registered..", "data": res}


class DeleteFaceRequest(BaseModel):
    user_id: int
    vector_ids: list[int]


@router.delete("/face-raw")
async def delete_face_setup_raw(request: DeleteFaceRequest):
    """Remove the current user's facial login setup from disk and chroma."""
    result = await delete_user_face_data(request.user_id, request.vector_ids)
    if result.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("message", "Failed to remove facial login setup."),
        )
    return {"status": "success", "message": "Facial login setup removed."}


@router.delete("/profile/data-raw/{user_id}")
async def delete_profile_data_raw(user_id: int):
    """
    Delete user AI profile completely.
    - Disk: all uploaded RAG documents and face images
    - ChromaDB: all RAG vector embeddings
    Note: MongoDB and ChromaDB chat histories should be cleared if applicable.
    """
    try:
        rag_upload_path = f"vectorDB/chroma/rag_user_vectors/{user_id}"
        if os.path.exists(rag_upload_path):
            shutil.rmtree(rag_upload_path)

        return {
            "status": "success",
            "message": "Profile AI data deleted successfully",
        }

    except Exception as e:
        logger.error("Error deleting profile AI data for user %s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete profile AI data.",
        )


@router.post("/face/login-raw")
async def face_login_raw(
    image: UploadFile = File(...),
    _: None = Depends(rate_limit_face_login),
):
    """
    Facial login AI endpoint.
    Accepts a camera image and returns matched vectors.
    """
    contents = await image.read()

    if image.content_type and image.content_type not in {
        "image/jpeg",
        "image/jpg",
        "image/png",
    }:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG and PNG face images are supported.",
        )

    if len(contents) > settings.FACE_LOGIN_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Face image is too large. Please upload a smaller image.",
        )

    result = await login_with_face(contents)

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=result["error"]
        )

    return result
