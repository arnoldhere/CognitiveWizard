import faiss
import numpy as np
import os
from config.settings import settings


class FaissService:
    def __init__(self):
        self.dim = settings.EMBEDDING_DIM

        # Load or create indices
        self.face_index = self._load_or_create(settings.FACE_FAISS_INDEX_PATH)
        self.rag_index = self._load_or_create(settings.RAG_FAISS_INDEX_PATH)

    def _load_or_create(self, path):
        if os.path.exists(path):
            index = faiss.read_index(path)
            assert index.d == self.dim, "Dimension mismatch in FAISS index"
        else:
            index = faiss.IndexFlatIP(self.dim)  # cosine if normalized
        return index

    def _normalize(self, vec):
        """Ensure vector is normalized for cosine similarity"""
        faiss.normalize_L2(vec)
        return vec

    def _get_index(self, src):
        if src == "face":
            return self.face_index, settings.FACE_FAISS_INDEX_PATH
        elif src == "rag":
            return self.rag_index, settings.RAG_FAISS_INDEX_PATH
        else:
            raise ValueError("Invalid index source")

    # -------------------------
    # ADD VECTOR
    # -------------------------
    def add_vector(self, vector, src):
        index, path = self._get_index(src)

        vec = np.array([vector]).astype("float32")
        vec = self._normalize(vec)

        index.add(vec)
        vec_id = index.ntotal - 1

        self._save(index, path)
        return vec_id

    def add_vectors(self, vectors, src):
        """
        Add a batch of vectors to the selected index.
        Returns list of inserted vector IDs.
        """
        index, path = self._get_index(src)

        vecs = np.array(vectors).astype("float32")
        if vecs.ndim == 1:
            vecs = np.expand_dims(vecs, axis=0)
        if vecs.size == 0:
            return []

        vecs = self._normalize(vecs)
        start_id = index.ntotal
        index.add(vecs)
        self._save(index, path)
        return list(range(start_id, start_id + vecs.shape[0]))

    # -------------------------
    # SEARCH
    # -------------------------
    def search_top_k(self, vector, src, k=3):
        index, _ = self._get_index(src)
        if index.ntotal == 0:
            return []

        vec = np.array([vector]).astype("float32")
        vec = self._normalize(vec)

        scores, indices = index.search(vec, k)

        results = []
        for i in range(len(indices[0])):
            if indices[0][i] == -1:
                continue

            results.append(
                {"vector_id": int(indices[0][i]), "score": float(scores[0][i])}
            )

        return results

    def count(self, src):
        index, _ = self._get_index(src)
        return int(index.ntotal)

    # -------------------------
    # DELETE (Best Practice)
    # -------------------------
    def delete_vector(self, vector_id, src):
        """
        Flat index doesn't support deletion.
        Recommended: use IndexIDMap OR handle via DB filtering.
        """
        print("⚠️ FAISS Flat index does not support deletion directly.")
        return True

    # -------------------------
    # REBUILD INDEX
    # -------------------------
    def rebuild_index(self, vectors_data, src):
        try:
            index, path = self._get_index(src)

            new_index = faiss.IndexFlatIP(self.dim)

            if vectors_data:
                vec_array = np.array(vectors_data).astype("float32")
                faiss.normalize_L2(vec_array)
                new_index.add(vec_array)

            if src == "face":
                self.face_index = new_index
            else:
                self.rag_index = new_index

            self._save(new_index, path)
            return True

        except Exception as e:
            print(f"Error rebuilding FAISS index: {e}")
            return False

    # -------------------------
    # SAVE
    # -------------------------
    def _save(self, index, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        faiss.write_index(index, path)


# Singleton instance
faiss_service = FaissService()
