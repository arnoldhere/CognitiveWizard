from models.face_embeddings import FaceEmbedding
from sqlalchemy.orm import Session
from fastapi import Depends
from config.db import get_db


def get_user_by_vector_id(vector_ids, db: Session):
    """
    fetch userids mapped to FAISS vector ids
    """
    try:
        results = (
            db.query(FaceEmbedding)
            .filter(FaceEmbedding.vector_id.in_(vector_ids))
            .all()
        )
        # Map: vector_id → user_id
        mapping = {r.vector_id: r.user_id for r in results}
        return mapping
    except Exception as e:
        print(f"Error in mapping : \n {e}")
        return {"error": "Problem to map vectorDB with the Original DB"}
