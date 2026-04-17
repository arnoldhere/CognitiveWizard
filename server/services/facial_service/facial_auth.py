from utils.decode_image import decode_image
import cv2
import os
from services.facial_service.detect_face import detect_face
from services.facial_service.face_embedding import embedder
from utils.decode_image import normalize
from config.Faiss_index import faiss_service
from sqlalchemy.orm import Session
from models.face_embeddings import FaceEmbedding


async def register(db: Session, image_bytes, userid):
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
    vec_id = faiss_service.add_vector(embeddings)

    if not vec_id:
        return {"error": "Unable to save face embeddings"}

    # MySQL metadata
    new_embedding = FaceEmbedding(user_id=userid, vector_id=vec_id)
    db.add(new_embedding)
    db.commit()

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
            faiss_service.delete_vector(embedding.vector_id)
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
