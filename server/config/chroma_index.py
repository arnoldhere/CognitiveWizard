import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import chromadb
import numpy as np
from chromadb.api.models.Collection import Collection

from config.settings import settings

logger = logging.getLogger(__name__)


class ChromaVectorService:
    """
    Persistent ChromaDB service for face and RAG vectors.

    The public methods intentionally match the previous in-process vector service
    so facial login, v0 RAG, and other callers can migrate without changing their
    business logic. Chroma handles persistence internally, supports deletion, and
    stores metadata alongside embeddings for future filtering.
    """

    def __init__(self):
        self.dim = int(settings.EMBEDDING_DIM)
        self.persist_dir = Path(settings.CHROMA_PERSIST_DIR)
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(path=str(self.persist_dir))
        self._collections: Dict[Tuple[str, Optional[str]], Collection] = {}
        self._counter_path = self.persist_dir / "vector_id_counters.json"
        self._counters = self._load_counters()

    def add_vector(self, vector, src: str, user_id: Optional[str] = None) -> int:
        """Add one normalized vector and return the stable integer vector id."""
        vector_id = self._next_vector_id(src, user_id)
        self.add_vectors([vector], src=src, user_id=user_id, ids=[vector_id])
        return vector_id

    def add_vectors(
        self,
        vectors,
        src: str,
        user_id: Optional[str] = None,
        ids: Optional[Iterable[int]] = None,
    ) -> List[int]:
        """Batch insert embeddings into the selected Chroma collection."""
        embeddings = self._prepare_vectors(vectors)
        if embeddings.size == 0:
            return []

        collection = self._get_collection(src, user_id=user_id)
        vector_ids = list(ids) if ids is not None else self._next_vector_ids(
            src, user_id, embeddings.shape[0]
        )
        if len(vector_ids) != embeddings.shape[0]:
            raise ValueError("Number of vector IDs must match number of embeddings.")

        collection.add(
            ids=[str(vector_id) for vector_id in vector_ids],
            embeddings=embeddings.tolist(),
            metadatas=[
                {"src": src, "user_id": str(user_id) if user_id is not None else ""}
                for _ in vector_ids
            ],
        )
        return [int(vector_id) for vector_id in vector_ids]

    def search_top_k(
        self, vector, src: str, k: int = 3, user_id: Optional[str] = None
    ) -> List[Dict[str, float]]:
        """Return the closest vector IDs with cosine-style similarity scores."""
        collection = self._get_collection(src, user_id=user_id, create=False)
        if collection is None or collection.count() == 0:
            return []

        query = self._prepare_vectors([vector])
        limit = min(max(int(k), 1), collection.count())

        try:
            result = collection.query(
                query_embeddings=query.tolist(),
                n_results=limit,
                include=["distances"],
            )
        except Exception as exc:
            logger.exception("Chroma query failed for src=%s user_id=%s", src, user_id)
            raise RuntimeError("Unable to search vector store.") from exc

        ids = result.get("ids", [[]])[0]
        distances = result.get("distances", [[]])[0]
        return [
            {"vector_id": int(vector_id), "score": self._distance_to_score(distance)}
            for vector_id, distance in zip(ids, distances)
        ]

    def count(self, src: str, user_id: Optional[str] = None) -> int:
        """Return the number of stored embeddings for the selected collection."""
        collection = self._get_collection(src, user_id=user_id, create=False)
        return 0 if collection is None else int(collection.count())

    def delete_vector(
        self, vector_id: int, src: str, user_id: Optional[str] = None
    ) -> bool:
        """Delete a vector by stable ID. Missing IDs are treated as already gone."""
        collection = self._get_collection(src, user_id=user_id, create=False)
        if collection is None:
            return True
        try:
            collection.delete(ids=[str(vector_id)])
            return True
        except Exception as exc:
            logger.warning(
                "Failed to delete Chroma vector src=%s user_id=%s vector_id=%s: %s",
                src,
                user_id,
                vector_id,
                exc,
            )
            return False

    def rebuild_index(
        self, vectors_data, src: str, user_id: Optional[str] = None
    ) -> bool:
        """Replace a collection from scratch while preserving caller-facing IDs."""
        try:
            collection_name = self._collection_name(src, user_id)
            try:
                self._client.delete_collection(collection_name)
            except Exception:
                pass

            self._collections.pop((src, str(user_id) if user_id else None), None)
            embeddings = self._prepare_vectors(vectors_data)
            count = int(embeddings.shape[0]) if embeddings.size else 0
            self._reset_counter(src, user_id)
            if count:
                self.add_vectors(embeddings, src=src, user_id=user_id)
            else:
                self._get_collection(src, user_id=user_id)
            return True
        except Exception as exc:
            logger.exception(
                "Failed to rebuild Chroma collection src=%s user_id=%s", src, user_id
            )
            return False

    def _get_collection(
        self, src: str, user_id: Optional[str] = None, create: bool = True
    ) -> Optional[Collection]:
        key = (src, str(user_id) if user_id else None)
        if key in self._collections:
            return self._collections[key]

        name = self._collection_name(src, user_id)
        try:
            collection = self._client.get_or_create_collection(
                name=name,
                metadata={
                    "hnsw:space": "cosine",
                    "src": src,
                    "user_id": str(user_id) if user_id else "",
                },
            )
        except Exception as exc:
            if not create:
                return None
            logger.exception("Unable to create/load Chroma collection %s", name)
            raise RuntimeError(
                f"Unable to initialize vector collection: {name}"
            ) from exc

        self._collections[key] = collection
        return collection

    def _collection_name(self, src: str, user_id: Optional[str] = None) -> str:
        if src == "face":
            return settings.FACE_CHROMA_COLLECTION
        if src == "rag":
            if not user_id:
                raise ValueError("user_id is required for RAG vector access.")
            return f"{settings.RAG_CHROMA_COLLECTION_PREFIX}_{self._safe_name(user_id)}"
        raise ValueError(f"Unsupported vector collection source: {src}")

    def _prepare_vectors(self, vectors) -> np.ndarray:
        arr = np.asarray(vectors, dtype="float32")
        if arr.size == 0:
            return np.empty((0, self.dim), dtype="float32")
        if arr.ndim == 1:
            arr = np.expand_dims(arr, axis=0)
        if arr.ndim != 2:
            raise ValueError("Embeddings must be a 1D vector or 2D vector batch.")

        arr = self._align_dim(arr)
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return (arr / norms).astype("float32")

    def _align_dim(self, embeddings: np.ndarray) -> np.ndarray:
        current_dim = embeddings.shape[1]
        if current_dim == self.dim:
            return embeddings

        logger.warning(
            "Embedding dimension mismatch detected (incoming=%s, expected=%s). "
            "Applying runtime alignment before storing in Chroma.",
            current_dim,
            self.dim,
        )
        if current_dim > self.dim:
            return embeddings[:, : self.dim]

        padding = np.zeros(
            (embeddings.shape[0], self.dim - current_dim), dtype="float32"
        )
        return np.concatenate([embeddings, padding], axis=1)

    def _distance_to_score(self, distance: Any) -> float:
        # Chroma cosine distance is lower for better matches; keep the old API as
        # "higher is better" because facial auth thresholds depend on that shape.
        try:
            return max(0.0, min(1.0, 1.0 - float(distance)))
        except (TypeError, ValueError):
            return 0.0

    def _counter_key(self, src: str, user_id: Optional[str]) -> str:
        return f"{src}:{user_id or 'global'}"

    def _next_vector_id(self, src: str, user_id: Optional[str]) -> int:
        return self._next_vector_ids(src, user_id, 1)[0]

    def _next_vector_ids(
        self, src: str, user_id: Optional[str], count: int
    ) -> List[int]:
        key = self._counter_key(src, user_id)
        start = int(self._counters.get(key, self._discover_next_id(src, user_id)))
        vector_ids = list(range(start, start + count))
        self._counters[key] = start + count
        self._save_counters()
        return vector_ids

    def _reset_counter(self, src: str, user_id: Optional[str]) -> None:
        key = self._counter_key(src, user_id)
        self._counters[key] = 0
        self._save_counters()

    def _discover_next_id(self, src: str, user_id: Optional[str]) -> int:
        collection = self._get_collection(src, user_id=user_id)
        if collection is None or collection.count() == 0:
            return 0
        try:
            existing = collection.get(include=[])
            ids = [int(item) for item in existing.get("ids", []) if str(item).isdigit()]
            return max(ids, default=-1) + 1
        except Exception:
            logger.warning("Could not discover next Chroma vector id; starting at count.")
            return int(collection.count())

    def _load_counters(self) -> Dict[str, int]:
        if not self._counter_path.exists():
            return {}
        try:
            with open(self._counter_path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
            return {str(key): int(value) for key, value in payload.items()}
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            logger.warning("Failed to load Chroma vector id counters: %s", exc)
            return {}

    def _save_counters(self) -> None:
        os.makedirs(self._counter_path.parent, exist_ok=True)
        with open(self._counter_path, "w", encoding="utf-8") as handle:
            json.dump(self._counters, handle, indent=2, sort_keys=True)

    def _safe_name(self, value: Any) -> str:
        raw = str(value).strip().lower()
        safe = "".join(char if char.isalnum() or char in "_-" else "_" for char in raw)
        safe = safe.strip("_-")[:48].strip("_-")
        return safe or "default"


chroma_service = ChromaVectorService()
