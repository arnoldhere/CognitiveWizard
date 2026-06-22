import numpy as np

from config import chroma_index
from config.chroma_index import ChromaVectorService


def test_chroma_service_add_and_search_face_vector(tmp_path, monkeypatch):
    monkeypatch.setattr(
        chroma_index.settings, "CHROMA_PERSIST_DIR", str(tmp_path / "chroma")
    )
    service = ChromaVectorService()

    vec = np.random.rand(512).astype("float32")
    vec = vec / np.linalg.norm(vec)

    vector_id = service.add_vector(vec, src="face")
    results = service.search_top_k(vec, src="face", k=3)

    assert vector_id in [item["vector_id"] for item in results]
    assert all(0.0 <= item["score"] <= 1.0 for item in results)
