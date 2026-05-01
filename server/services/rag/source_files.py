import os
import re
import shutil
from pathlib import Path
from typing import Optional
from config.settings import settings

MEDIA_DIR = Path(settings.MEDIA_DIR)
RAG_UPLOAD_DIR = MEDIA_DIR / "rag_uploads"


def safe_filename(filename: str) -> str:
    stem, extension = os.path.splitext(filename or "uploaded-document")
    safe_stem = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("._-") or "document"
    safe_extension = re.sub(r"[^A-Za-z0-9.]+", "", extension.lower())
    return f"{safe_stem[:80]}{safe_extension}"


def build_source_url(filename: str) -> str:
    return f"/rag/source/{safe_filename(filename)}"


def persist_uploaded_file(temp_file_path: str, user_id: str, filename: str) -> str:
    user_dir = RAG_UPLOAD_DIR / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)

    safe_name = safe_filename(filename)
    destination = user_dir / safe_name
    if destination.exists():
        destination = (
            user_dir / f"{destination.stem}_{os.urandom(4).hex()}{destination.suffix}"
        )

    shutil.copyfile(temp_file_path, destination)
    return build_source_url(destination.name)


def get_user_source_path(user_id: str, filename: str) -> Path:
    return RAG_UPLOAD_DIR / str(user_id) / safe_filename(filename)


def resolve_source_url(user_id: Optional[str], title: Optional[str]) -> Optional[str]:
    if not user_id or not title:
        return None

    source_path = get_user_source_path(str(user_id), title)
    if source_path.exists() and source_path.is_file():
        return build_source_url(source_path.name)

    return None
