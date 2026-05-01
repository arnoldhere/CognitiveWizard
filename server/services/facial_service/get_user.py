from models.face_embeddings import FaceEmbedding
from sqlalchemy.orm import Session
from fastapi import Depends
from config.db import get_db


def get_user_by_vector_id(vector_ids, db: Session):
    """
    Fetch user IDs mapped to Chroma vector IDs.
    """
    try:
        results = (
            db.query(FaceEmbedding)
            .filter(FaceEmbedding.vector_id.in_(vector_ids))
            .all()
        )
        # Map Chroma vector_id -> user_id for the facial-auth decision step.
        mapping = {r.vector_id: r.user_id for r in results}
        return mapping
    except Exception as e:
        print(f"Error in mapping : \n {e}")
        return {"error": "Problem to map vectorDB with the Original DB"}
