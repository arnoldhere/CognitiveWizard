from collections import defaultdict
import logging
from datetime import datetime
import os

import cv2

from config.chroma_index import chroma_service
from services.facial_service.face_embedding import embedder
from services.facial_service.liveness import verify_liveness
from utils.decode_image import decode_image, normalize

logger = logging.getLogger(__name__)


async def register(image_bytes, userid):
    # Decode image
    img = decode_image(image_bytes)

    if img is None:
        return {"error": "Invalid face image format"}

    # Get embedding using the consolidated service
    embedding, bbox = await embedder.process_image(img)

    if embedding is None:
        return {"error": "No face detected or embedding failed"}

    # Optional: Save cropped face if you still need to see it
    x1, y1, x2, y2 = bbox.astype(int)
    face_crop = img[y1:y2, x1:x2]
    os.makedirs("media/faces", exist_ok=True)
    cv2.imwrite(f"media/faces/{userid}.jpg", face_crop)

    # Normalize before storing so Chroma cosine distance maps cleanly to confidence.
    embeddings = normalize(embedding)
    vec_id = chroma_service.add_vector(embeddings, src="face")

    if vec_id is None:
        return {"error": "Unable to save face embeddings"}

    return {"message": "Face registered successfully", "vec_id": vec_id}


async def delete_user_face_data(user_id: int, vector_ids: list[int]):
    """
    Delete face vectors from ChromaDB and stored face image files
    """
    try:
        # Delete face image files and Chroma vectors
        for vector_id in vector_ids:
            chroma_service.delete_vector(vector_id, src="face")

        # Delete face image file
        face_image_path = f"media/faces/{user_id}.jpg"
        if os.path.exists(face_image_path):
            try:
                os.remove(face_image_path)
            except Exception as e:
                logger.warning(
                    f"Warning: Could not delete face image {face_image_path}: {e}"
                )

        return {
            "status": "success",
            "message": "Face data deleted successfully",
            "deleted_vectors": len(vector_ids),
        }

    except Exception as e:
        logger.error(f"Error deleting face data for user {user_id}: {e}")
        return {"status": "error", "message": f"Failed to delete face data: {str(e)}"}


async def login_with_face(image_bytes):
    """
    Authenticate user for login with face - returns matched vectors
    """
    # ========
    # decode the image
    # ========
    image = decode_image(image_bytes)

    if image is None:
        return {"error": "Invalid face image format"}

    # Get embedding using the consolidated service
    embedding, bbox = await embedder.process_image(image)

    if embedding is None:
        return {"error": "No face detected or embedding failed"}

    live, live_score, live_message = verify_liveness(image_bytes, image, bbox)
    logger.info(
        f"Liveness check: live={live}, score={live_score:.4f}, message='{live_message}'"
    )
    if not live:
        return {"error": f"Liveness check failed: {live_message}"}

    # ========
    # normalize the image
    # ========
    embedding = normalize(embedding)
    # ========
    # Search ChromaDB for the most similar registered faces.
    # ========
    results = chroma_service.search_top_k(embedding, src="face", k=3)
    if not results:
        return {"error": "No matching face found..."}
        
    return {
        "status": "success",
        "matches": results
    }
