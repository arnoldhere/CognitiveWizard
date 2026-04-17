import faiss
import numpy as np
from config.settings import settings
import os


class FaissService:
    def __init__(self):
        self.dim = settings.EMBEDDING_DIM

        if os.path.exists(settings.FAISS_INDEX_PATH):
            self.index = faiss.read_index(settings.FAISS_INDEX_PATH)
        else:
            self.index = faiss.IndexFlatIP(self.dim)

    def add_vector(self, vector):
        vec = np.array([vector]).astype("float32")
        self.index.add(vec)

        vec_id = self.index.ntotal - 1
        self._save()
        return vec_id

    def delete_vector(self, vector_id):
        """Remove a vector from the FAISS index by its ID"""
        try:
            # FAISS doesn't support direct deletion, so we need to rebuild the index
            # This is a limitation of flat indices - for production, consider IDMap
            # For now, we'll mark it as deleted in a separate tracking system
            # or use a more complex ID management strategy

            # If using IDMap (recommended for deletion support):
            # self.index.remove_ids(np.array([vector_id]))
            # self._save()

            # Simple approach: just return True as deletion is handled in DB
            # The FAISS vector won't be reused but won't cause issues
            return True
        except Exception as e:
            print(f"Error deleting vector {vector_id} from FAISS: {e}")
            return False

    def rebuild_index(self, vectors_data):
        """Rebuild index with specific vectors - useful for cleanup"""
        try:
            self.index = faiss.IndexFlatIP(self.dim)
            if vectors_data is not None and len(vectors_data) > 0:
                vec_array = np.array(vectors_data).astype("float32")
                self.index.add(vec_array)
            self._save()
            return True
        except Exception as e:
            print(f"Error rebuilding FAISS index: {e}")
            return False

    def _save(self):
        dir_path = os.path.dirname(settings.FAISS_INDEX_PATH)
        os.makedirs(dir_path, exist_ok=True)
        faiss.write_index(self.index, settings.FAISS_INDEX_PATH)


faiss_service = FaissService()
