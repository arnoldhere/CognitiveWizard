"""
Build a deterministic golden RAG evaluation dataset from sample JSMS PDFs.

The output is intentionally RAGAS-compatible:
question, answer, contexts, ground_truth, user_input, response,
retrieved_contexts, and reference are all included. Extra metadata supports
dashboard slicing by source paper, query type, difficulty, and negative cases.
"""

from __future__ import annotations
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
from statistics import mean
from typing import Iterable
import fitz

PROJECT_ROOT = Path(__file__).resolve().parents[3]
SAMPLES_DIR = PROJECT_ROOT / "samples"
ARTIFACT_DIR = PROJECT_ROOT / "server" / "artifacts"
OUTPUT_PATH = ARTIFACT_DIR / "rag_golden_dataset.json"
OUTPUT_JSONL_PATH = ARTIFACT_DIR / "rag_golden_dataset.jsonl"

SOURCE_PDFS = [
    SAMPLES_DIR / "jsms-1537.pdf",
    SAMPLES_DIR / "jsms-1503.pdf",
]

MIN_CONTEXT_CHARS = 360
MAX_CONTEXT_CHARS = 1300
TARGET_SAMPLES_PER_DOC = 18


QUERY_TEMPLATES = [
    {
        "query_type": "factual",
        "difficulty": "easy",
        "template": "What does the paper say about {topic}?",
    },
    {
        "query_type": "conceptual",
        "difficulty": "medium",
        "template": "Can you explain the main idea around {topic} in simple terms?",
    },
    {
        "query_type": "evidence_lookup",
        "difficulty": "easy",
        "template": "Which evidence in the paper supports this point: {topic}?",
    },
    {
        "query_type": "why_how",
        "difficulty": "medium",
        "template": "Why is {topic} important according to the authors?",
    },
    {
        "query_type": "synthesis",
        "difficulty": "hard",
        "template": "Summarise how the paper connects {topic} with its wider argument.",
    },
    {
        "query_type": "human_language",
        "difficulty": "medium",
        "template": "I'm trying to understand {topic}. What should I take away from this paper?",
    },
    {
        "query_type": "limitation_or_risk",
        "difficulty": "hard",
        "template": "What problems, constraints, or concerns are mentioned around {topic}?",
    },
]


NEGATIVE_TEMPLATES = [
    "Does this paper give implementation details for a blockchain payment gateway?",
    "What does the paper conclude about clinical trial outcomes for a new vaccine?",
    "Does the document provide Python code for training a neural network?",
    "What are the authors' recommendations for cryptocurrency portfolio allocation?",
]


def clean_text(text: str) -> str:
    text = text.replace("\u00a0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)
    return text.strip()


def split_sentences(text: str) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", clean_text(text))
    return [sentence.strip() for sentence in sentences if len(sentence.strip()) > 45]


def extract_pdf(path: Path) -> dict:
    doc = fitz.open(path)
    pages = []
    all_text = []
    first_page_lines = []
    for index, page in enumerate(doc, start=1):
        raw_page_text = page.get_text()
        if index == 1:
            first_page_lines = [
                line.strip()
                for line in raw_page_text.splitlines()
                if line.strip() and line.strip() != "©"
            ]
        page_text = clean_text(raw_page_text)
        if page_text:
            pages.append({"page": index, "text": page_text})
            all_text.append(page_text)
    doc.close()

    text = "\n\n".join(all_text)
    title_parts = []
    for line in first_page_lines:
        if any(marker in line for marker in ("§", "†", "*")):
            break
        if line.lower().startswith(("abstract", "journal of statistics")):
            break
        if (
            len(title_parts) >= 2
            and len(line.split()) <= 4
            and not " ".join(title_parts).lower().endswith(" in")
        ):
            break
        title_parts.append(line)
        if len(title_parts) >= 4:
            break
    title = clean_text(" ".join(title_parts)) or path.stem
    doi_match = re.search(r"DOI\s*:\s*([^\s]+)", text)
    keywords_match = re.search(
        r"Keywords:\s*(.+?)(?:Journal of Statistics|1\.\s|Introduction)",
        text,
        re.I | re.S,
    )
    keywords = []
    if keywords_match:
        keywords = [
            keyword.strip(" .")
            for keyword in re.split(r",|;", clean_text(keywords_match.group(1)))
            if keyword.strip(" .")
        ][:10]

    return {
        "path": path,
        "source_file": path.name,
        "title": title,
        "doi": doi_match.group(1).strip() if doi_match else None,
        "keywords": keywords,
        "pages": pages,
        "text": text,
    }


def build_chunks(document: dict) -> list[dict]:
    chunks = []
    for page in document["pages"]:
        paragraphs = [
            paragraph.strip()
            for paragraph in re.split(r"\n\s*\n|(?<=\.)\s{2,}", page["text"])
            if len(paragraph.strip()) > 120
        ]
        buffer = ""
        for paragraph in paragraphs:
            next_buffer = f"{buffer} {paragraph}".strip()
            if len(next_buffer) < MAX_CONTEXT_CHARS:
                buffer = next_buffer
                continue
            if len(buffer) >= MIN_CONTEXT_CHARS:
                chunks.append(
                    {
                        "chunk_id": f"{document['source_file']}:p{page['page']}:c{len(chunks) + 1}",
                        "source_file": document["source_file"],
                        "source_title": document["title"],
                        "page_start": page["page"],
                        "page_end": page["page"],
                        "text": buffer,
                    }
                )
            buffer = paragraph

        if len(buffer) >= MIN_CONTEXT_CHARS:
            chunks.append(
                {
                    "chunk_id": f"{document['source_file']}:p{page['page']}:c{len(chunks) + 1}",
                    "source_file": document["source_file"],
                    "source_title": document["title"],
                    "page_start": page["page"],
                    "page_end": page["page"],
                    "text": buffer,
                }
            )

    return chunks


def choose_topic(chunk: dict, keywords: list[str]) -> str:
    text = chunk["text"].lower()
    for keyword in keywords:
        if keyword and keyword.lower() in text:
            return keyword

    candidates = re.findall(r"\b[A-Za-z][A-Za-z-]{5,}\b", chunk["text"])
    stop_words = {
        "according",
        "authors",
        "between",
        "different",
        "figure",
        "however",
        "journal",
        "research",
        "section",
        "system",
        "therefore",
        "through",
        "various",
    }
    ranked = sorted(
        {
            candidate.strip("-").lower()
            for candidate in candidates
            if candidate.lower() not in stop_words
        },
        key=lambda value: (-text.count(value), value),
    )
    return ranked[0].replace("-", " ") if ranked else "the discussed topic"


def answer_from_chunk(chunk: dict, max_sentences: int = 3) -> str:
    sentences = split_sentences(chunk["text"])
    if not sentences:
        return chunk["text"][:420].strip()
    return " ".join(sentences[:max_sentences]).strip()


def stable_id(*parts: str) -> str:
    digest = hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()[:10]
    return f"golden-{digest}"


def make_positive_samples(document: dict, chunks: list[dict]) -> list[dict]:
    samples = []
    usable_chunks = chunks[:]
    step = max(1, len(usable_chunks) // TARGET_SAMPLES_PER_DOC)
    selected_chunks = usable_chunks[::step][:TARGET_SAMPLES_PER_DOC]

    for index, chunk in enumerate(selected_chunks):
        template = QUERY_TEMPLATES[index % len(QUERY_TEMPLATES)]
        topic = choose_topic(chunk, document["keywords"])
        question = template["template"].format(topic=topic)
        answer = answer_from_chunk(chunk, max_sentences=3)
        contexts = [chunk["text"]]
        if index + 1 < len(selected_chunks):
            contexts.append(selected_chunks[index + 1]["text"])

        sample = {
            "id": stable_id(document["source_file"], chunk["chunk_id"], question),
            "source_file": document["source_file"],
            "source_title": document["title"],
            "doi": document["doi"],
            "page_start": chunk["page_start"],
            "page_end": chunk["page_end"],
            "query_type": template["query_type"],
            "difficulty": template["difficulty"],
            "is_negative": False,
            "question": question,
            "answer": answer,
            "ground_truth": answer,
            "contexts": contexts,
            "expected_context_ids": [chunk["chunk_id"]],
            "user_input": question,
            "response": answer,
            "reference": answer,
            "retrieved_contexts": contexts,
        }
        samples.append(sample)

    return samples


def make_negative_samples(
    documents: list[dict], chunks_by_source: dict[str, list[dict]]
) -> list[dict]:
    samples = []
    for index, question in enumerate(NEGATIVE_TEMPLATES):
        document = documents[index % len(documents)]
        chunks = chunks_by_source[document["source_file"]]
        context = chunks[(index * 3) % len(chunks)]["text"]
        answer = (
            "The provided context does not contain enough information to answer this "
            "question. A grounded answer should state that the requested detail is not "
            "available in the retrieved material."
        )
        samples.append(
            {
                "id": stable_id("negative", document["source_file"], question),
                "source_file": document["source_file"],
                "source_title": document["title"],
                "doi": document["doi"],
                "page_start": chunks[(index * 3) % len(chunks)]["page_start"],
                "page_end": chunks[(index * 3) % len(chunks)]["page_end"],
                "query_type": "negative_context",
                "difficulty": "hard",
                "is_negative": True,
                "question": question,
                "answer": answer,
                "ground_truth": answer,
                "contexts": [context],
                "expected_context_ids": [],
                "user_input": question,
                "response": answer,
                "reference": answer,
                "retrieved_contexts": [context],
            }
        )
    return samples


def summarize(samples: Iterable[dict], documents: list[dict]) -> dict:
    samples = list(samples)

    def counts(key: str) -> dict:
        values = {}
        for sample in samples:
            values[sample[key]] = values.get(sample[key], 0) + 1
        return values

    return {
        "sample_count": len(samples),
        "sources": counts("source_file"),
        "query_types": counts("query_type"),
        "difficulties": counts("difficulty"),
        "negative_cases": sum(1 for sample in samples if sample["is_negative"]),
        "avg_context_chars": round(
            mean(len(sample["contexts"][0]) for sample in samples), 2
        ),
        "source_documents": [
            {
                "source_file": document["source_file"],
                "title": document["title"],
                "doi": document["doi"],
                "keywords": document["keywords"],
                "page_count": len(document["pages"]),
            }
            for document in documents
        ],
    }


def main() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    documents = [extract_pdf(path) for path in SOURCE_PDFS]
    chunks_by_source = {
        document["source_file"]: build_chunks(document) for document in documents
    }

    samples = []
    for document in documents:
        samples.extend(
            make_positive_samples(document, chunks_by_source[document["source_file"]])
        )
    samples.extend(make_negative_samples(documents, chunks_by_source))

    artifact = {
        "schema_version": "1.0",
        "name": "jsms_rag_golden_dataset",
        "description": (
            "Hybrid synthetic golden dataset generated from JSMS sample PDFs for "
            "RAGAS-based CognitiveWizard RAG evaluation."
        ),
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "generation_strategy": {
            "approach": "hybrid_synthetic",
            "evidence_source": "PDF-extracted source chunks",
            "query_generation": "deterministic templates over source topics and chunks",
            "negative_cases": "out-of-context user questions paired with refusal-style references",
        },
        "summary": summarize(samples, documents),
        "samples": samples,
    }

    OUTPUT_PATH.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
    with OUTPUT_JSONL_PATH.open("w", encoding="utf-8") as handle:
        for sample in samples:
            handle.write(json.dumps(sample, ensure_ascii=False) + "\n")

    print(f"Wrote {len(samples)} samples to {OUTPUT_PATH}")
    print(f"Wrote JSONL mirror to {OUTPUT_JSONL_PATH}")


if __name__ == "__main__":
    main()
