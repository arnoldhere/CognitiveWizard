import json
from pathlib import Path


ARTIFACT_PATH = Path(__file__).resolve().parents[1] / "artifacts" / "rag_golden_dataset.json"


def load_golden_dataset(limit: int | None = None) -> tuple[list[dict], dict]:
    if not ARTIFACT_PATH.exists():
        raise FileNotFoundError(
            f"Golden RAG dataset not found at {ARTIFACT_PATH}. "
            "Run server/utils/rag_eval/build_golden_dataset.py first."
        )

    artifact = json.loads(ARTIFACT_PATH.read_text(encoding="utf-8"))
    samples = artifact.get("samples") or []
    if limit:
        samples = samples[:limit]

    return samples, {
        "name": artifact.get("name"),
        "schema_version": artifact.get("schema_version"),
        "generated_at": artifact.get("generated_at"),
        "generation_strategy": artifact.get("generation_strategy"),
        "summary": artifact.get("summary") or {},
        "artifact_path": str(ARTIFACT_PATH),
    }
