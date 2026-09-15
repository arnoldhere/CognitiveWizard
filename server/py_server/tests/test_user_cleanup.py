import os
import shutil
from pathlib import Path
from config.settings import settings
from services.rag.v1_rag_service import langchain_rag_service
from api.auth_api import delete_user_ai_data


def test_user_cleanup_deletes_all_data(tmp_path, monkeypatch):
    test_user_id = "test_cleanup_user_9999"

    # Setup temporary media and vector paths
    temp_media_dir = tmp_path / "media"
    temp_vector_dir = tmp_path / "vectors"
    temp_data_dir = tmp_path / "data"

    monkeypatch.setattr(settings, "MEDIA_DIR", str(temp_media_dir))
    monkeypatch.setattr(settings, "RAG_USER_VECTOR_DIR", str(temp_vector_dir))
    monkeypatch.setattr(settings, "RAG_USER_DATA_DIR", str(temp_data_dir))

    # 1. Create mock upload file in user upload dir
    user_upload_dir = temp_media_dir / "rag_uploads" / test_user_id
    user_upload_dir.mkdir(parents=True, exist_ok=True)
    sample_file = user_upload_dir / "test_doc.txt"
    sample_file.write_text("Test content for cleanup")

    # 2. Create mock user vector directory
    user_vec_dir = temp_vector_dir / test_user_id
    user_vec_dir.mkdir(parents=True, exist_ok=True)
    (user_vec_dir / "chroma.sqlite3").write_text("mock sqlite")

    # 3. Create mock user json state
    temp_data_dir.mkdir(parents=True, exist_ok=True)
    state_file = temp_data_dir / f"{test_user_id}.json"
    state_file.write_text('{"chunks": ["test"]}')

    # 4. Populate in-memory cache in langchain_rag_service
    langchain_rag_service._chunk_store[test_user_id] = [{"id": 1, "title": "test_doc.txt"}]
    langchain_rag_service._documents_ingested[test_user_id] = 1
    langchain_rag_service._user_documents[test_user_id] = ["test_doc.txt"]

    # Verify setup
    assert sample_file.exists()
    assert user_vec_dir.exists()
    assert state_file.exists()
    assert test_user_id in langchain_rag_service._chunk_store

    # 5. Execute cleanup endpoint handler
    response = delete_user_ai_data(test_user_id)

    # 6. Assertions
    assert response["status"] == "success"
    assert not user_upload_dir.exists()
    assert not user_vec_dir.exists()
    assert not state_file.exists()
    assert test_user_id not in langchain_rag_service._chunk_store
    assert test_user_id not in langchain_rag_service._documents_ingested
    assert test_user_id not in langchain_rag_service._user_documents
