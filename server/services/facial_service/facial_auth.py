from collections import defaultdict
from utils.decode_image import decode_image
from datetime import datetime

# from fastapi import
import cv2
import os
from services.facial_service.detect_face import detect_face
from services.facial_service.face_embedding import embedder
from utils.decode_image import normalize
from config.Faiss_index import faiss_service
from sqlalchemy.orm import Session
from models.face_embeddings import FaceEmbedding
from services.facial_service.get_user import get_user_by_vector_id


async def register(image_bytes, userid, db: Session):
    # Decode image
    img = decode_image(image_bytes)

    # Get embedding using the consolidated service
    embedding, bbox = embedder.process_image(img)

    if embedding is None:
        return {"error": "No face detected or embedding failed"}

    # Optional: Save cropped face if you still need to see it
    x1, y1, x2, y2 = bbox.astype(int)
    face_crop = img[y1:y2, x1:x2]
    os.makedirs("media/faces", exist_ok=True)
    cv2.imwrite(f"media/faces/{userid}.jpg", face_crop)

    # Normalization and FAISS storage
    embeddings = normalize(embedding)
    vec_id = faiss_service.add_vector(embeddings, src="face")

    if vec_id is None:
        return {"error": "Unable to save face embeddings"}

    try:
        # MySQL metadata
        new_embedding = FaceEmbedding(user_id=int(userid), vector_id=int(vec_id))
        db.add(new_embedding)
        db.commit()
        db.refresh(new_embedding)
    except Exception as e:
        db.rollback()
        faiss_service.delete_vector(int(vec_id))
        return {"error": f"Unable to save face metadata: {str(e)}"}

    return {"message": "Face registered successfully", "vec_id": vec_id}


async def delete_user_face_data(db: Session, user_id: int):
    """
    Delete all facial data associated with a user:
    - Face embeddings from MySQL
    - Face vectors from FAISS index
    - Stored face image files
    Args:
        db: Database session
        user_id: ID of the user whose face data to delete
    """
    try:
        # 1. Get all face embeddings for this user
        face_embeddings = (
            db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user_id).all()
        )

        if not face_embeddings:
            return {"status": "success", "message": "No face data found for user"}

        vector_ids_deleted = []

        # 2. Delete face image files and FAISS vectors
        for embedding in face_embeddings:
            # Delete from FAISS
            faiss_service.delete_vector(embedding.vector_id, src="face")
            vector_ids_deleted.append(embedding.vector_id)

            # Delete face image file
            face_image_path = f"media/faces/{user_id}.jpg"
            if os.path.exists(face_image_path):
                try:
                    os.remove(face_image_path)
                except Exception as e:
                    print(
                        f"Warning: Could not delete face image {face_image_path}: {e}"
                    )

        # 3. Delete records from MySQL face_embeddings table
        db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user_id).delete()
        db.commit()

        return {
            "status": "success",
            "message": "Face data deleted successfully",
            "deleted_vectors": len(vector_ids_deleted),
            "vector_ids": vector_ids_deleted,
        }

    except Exception as e:
        db.rollback()
        print(f"Error deleting face data for user {user_id}: {e}")
        return {"status": "error", "message": f"Failed to delete face data: {str(e)}"}


async def login_with_face(image, db: Session):
    """
    Authenticate user for login with face
    """
    # ========
    # decode the image
    # ========
    image = decode_image(image)

    # Get embedding using the consolidated service
    embedding, bbox = embedder.process_image(image)

    if embedding is None:
        return {"error": "No face detected or embedding failed"}
    # Optional: Save cropped face if you still need to see it
    x1, y1, x2, y2 = bbox.astype(int)
    face_crop = image[y1:y2, x1:x2]
    os.makedirs("media/faces", exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    cv2.imwrite(f"media/faces/login_at_{timestamp}.jpg", face_crop)
    # ========
    # normalize the image
    # ========
    embedding = normalize(embedding)
    # ========
    # search the FAISS
    # ========
    results = faiss_service.search_top_k(embedding, src="face", k=3)
    if not results:
        return {"error": "No matching face found..."}
    # ========
    # extract vectorids and map to userid
    # ========
    vector_ids = [r["vector_id"] for r in results]
    mapping = get_user_by_vector_id(vector_ids, db)
    if not mapping:
        return {"error": "No users mapped with the face"}
    # ========
    # aggregate scores per user
    # ========
    user_scores = defaultdict(list)

    for r in results:
        vid = r["vector_id"]
        score = r["score"]

        if vid in mapping:
            user_id = mapping[vid]
            user_scores[user_id].append(score)

    if not user_scores:
        return {"error": "No valid user match"}
    # ============
    # final decision call
    # ============
    best_user = None
    best_score = 0
    for user_id, scores in user_scores.items():
        max_score = max(scores)
        avg_score = sum(scores) / len(scores)
        count = len(scores)
        if max_score > 0.6 and count >= 1:
            if max_score > best_score:
                best_score = max_score
                best_user = user_id
    if best_user is None:
        return {"error": "Face not recognized"}
    return {
        "message": "Authenticated sucessfully",
        "user_id": best_user,
        "confidence": best_score,
    }
