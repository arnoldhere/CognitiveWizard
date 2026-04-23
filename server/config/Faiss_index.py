import os
import faiss
import numpy as np
from config.settings import settings


class FaissService:
    """
    Service layer to manage FAISS indices for:
    1. Face embeddings (global index)
    2. RAG embeddings (user-specific indices)

    Why FAISS?
    ----------
    FAISS is optimized for fast similarity search in high-dimensional spaces.
    Compared to brute-force numpy search, FAISS is significantly faster and scalable.
    """

    def __init__(self):
        # Embedding dimension (must match model output)
        self.dim = settings.EMBEDDING_DIM

        # Global face index (shared across all users)
        self.face_index = self._load_or_create(settings.FACE_FAISS_INDEX_PATH)

        # Cache for user-specific RAG indices (avoids reloading from disk repeatedly)
        self._rag_indices = {}

    # ------------------------------------------------------------------
    # INDEX LOADING / CREATION
    # ------------------------------------------------------------------
    def _load_or_create(self, path):
        """
        Load FAISS index from disk if exists, else create a new one.

        Why IndexFlatIP?
        ----------------
        - Uses Inner Product (dot product) similarity.
        - When vectors are L2-normalized, inner product == cosine similarity.
        - Faster and simpler than IVF/HNSW for smaller datasets.
        """
        if os.path.exists(path):
            index = faiss.read_index(path)

            # Safety check: ensure embedding dimension matches
            assert index.d == self.dim, "Dimension mismatch in FAISS index"
        else:
            index = faiss.IndexFlatIP(self.dim)

        return index

    def _normalize(self, vec):
        """
        Normalize vectors to unit length (L2 norm = 1).

        Why normalize?
        --------------
        - Ensures cosine similarity works correctly with Inner Product.
        - Prevents magnitude differences from affecting similarity.
        """
        faiss.normalize_L2(vec)
        return vec

    # ------------------------------------------------------------------
    # RAG INDEX HANDLING (USER-SPECIFIC)
    # ------------------------------------------------------------------
    def _rag_index_path(self, user_id):
        """
        Generate file path for a user's RAG index.
        """
        if not user_id:
            raise ValueError("user_id is required for RAG index access")

        os.makedirs(settings.RAG_USER_INDEX_DIR, exist_ok=True)
        return os.path.join(settings.RAG_USER_INDEX_DIR, f"{user_id}.index")

    def _get_rag_index(self, user_id, create=True):
        """
        Retrieve or load a user's RAG index.

        Why cache indices?
        ------------------
        - Disk I/O is expensive.
        - Keeping indices in memory improves performance significantly.
        """
        if not user_id:
            raise ValueError("user_id is required for RAG index access")

        # Return cached index if already loaded
        if user_id in self._rag_indices:
            return self._rag_indices[user_id], self._rag_index_path(user_id)

        path = self._rag_index_path(user_id)

        # If index should not be created and doesn't exist
        if not create and not os.path.exists(path):
            return None, path

        index = self._load_or_create(path)
        self._rag_indices[user_id] = index

        return index, path

    # ------------------------------------------------------------------
    # GENERIC INDEX ROUTER
    # ------------------------------------------------------------------
    def _get_index(self, src, user_id=None, create=True):
        """
        Select index based on source type.

        Why abstraction?
        ----------------
        - Keeps logic centralized.
        - Avoids duplicate code in add/search methods.
        """
        if src == "face":
            return self.face_index, settings.FACE_FAISS_INDEX_PATH

        if src == "rag":
            return self._get_rag_index(user_id, create=create)

        raise ValueError("Invalid index source")

    # ------------------------------------------------------------------
    # ADD OPERATIONS
    # ------------------------------------------------------------------
    def add_vector(self, vector, src, user_id=None):
        """
        Add a single vector to the index.
        """
        index, path = self._get_index(src, user_id=user_id)

        # Convert to float32 (required by FAISS)
        vec = np.array([vector]).astype("float32")

        # Normalize for cosine similarity
        vec = self._normalize(vec)

        # Add vector to index
        index.add(vec)

        # FAISS assigns sequential IDs
        vec_id = index.ntotal - 1

        # Persist to disk
        self._save(index, path)

        return vec_id

    def add_vectors(self, vectors, src, user_id=None):
        """
        Add multiple vectors efficiently.
        """
        index, path = self._get_index(src, user_id=user_id)

        vecs = np.array(vectors).astype("float32")

        # Ensure 2D shape
        if vecs.ndim == 1:
            vecs = np.expand_dims(vecs, axis=0)

        # Handle empty input
        if vecs.size == 0:
            return []

        vecs = self._normalize(vecs)

        start_id = index.ntotal

        index.add(vecs)

        self._save(index, path)

        # Return assigned IDs
        return list(range(start_id, start_id + vecs.shape[0]))

    # ------------------------------------------------------------------
    # SEARCH OPERATIONS
    # ------------------------------------------------------------------
    def search_top_k(self, vector, src, k=3, user_id=None):
        """
        Search top-K similar vectors.

        Why min(k, ntotal)?
        -------------------
        - Prevents FAISS from returning invalid results if k > available vectors.
        """
        index, _ = self._get_index(src, user_id=user_id, create=False)

        if index is None or index.ntotal == 0:
            return []

        vec = np.array([vector]).astype("float32")
        vec = self._normalize(vec)

        search_k = min(k, index.ntotal)

        scores, indices = index.search(vec, search_k)

        results = []
        for i in range(len(indices[0])):
            if indices[0][i] == -1:
                continue

            results.append(
                {"vector_id": int(indices[0][i]), "score": float(scores[0][i])}
            )

        return results

    # ------------------------------------------------------------------
    # UTILITY METHODS
    # ------------------------------------------------------------------
    def count(self, src, user_id=None):
        """
        Return number of vectors in index.
        """
        index, _ = self._get_index(src, user_id=user_id, create=False)

        if index is None:
            return 0

        return int(index.ntotal)

    def delete_vector(self, vector_id, src, user_id=None):
        """
        FAISS Flat index does NOT support deletion.

        Why?
        ----
        - Flat indices store vectors sequentially.
        - Removing one would require shifting all others.

        Alternative:
        ------------
        - Use IndexIDMap OR rebuild index.
        """
        print("FAISS Flat index does not support deletion directly.")
        return True

    def rebuild_index(self, vectors_data, src, user_id=None):
        """
        Rebuild index from scratch.

        Why rebuild?
        ------------
        - Needed for deletion or updates.
        - Ensures clean, compact index.
        """
        try:
            _, path = self._get_index(src, user_id=user_id)

            new_index = faiss.IndexFlatIP(self.dim)

            if vectors_data:
                vec_array = np.array(vectors_data).astype("float32")
                faiss.normalize_L2(vec_array)
                new_index.add(vec_array)

            # Replace existing index
            if src == "face":
                self.face_index = new_index
            else:
                if not user_id:
                    raise ValueError("user_id is required to rebuild RAG index")

                self._rag_indices[user_id] = new_index

            self._save(new_index, path)

            return True

        except Exception as exc:
            print(f"Error rebuilding FAISS index: {exc}")
            return False

    # ------------------------------------------------------------------
    # SAVE INDEX
    # ------------------------------------------------------------------
    def _save(self, index, path):
        """
        Persist index to disk.
        Why explicit save?
        ------------------
        - FAISS does NOT auto-save.
        - Prevents data loss on restart.
        """
        os.makedirs(os.path.dirname(path), exist_ok=True)
        faiss.write_index(index, path)


faiss_service = FaissService()
