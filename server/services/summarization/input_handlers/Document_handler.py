import fitz
import os
from services.summarization.preprocess.text_cleaner import TextCleaner

try:
    import docx
except ImportError:
    docx = None


def extract_text(filepath: str) -> str:
    """
    Extract textual content from PDF and DOCX documents with validation.

    Args:
        filepath: Path to the document file

    Returns:
        Extracted text content

    Raises:
        ValueError: If extraction fails or file type is unsupported
    """
    try:
        if not os.path.exists(filepath):
            raise ValueError(f"File not found: {filepath}")

        if not os.access(filepath, os.R_OK):
            raise ValueError(f"File not readable: {filepath}")

        extension = os.path.splitext(filepath)[1].lower()
        if extension not in [".pdf", ".docx"]:
            raise ValueError("Unsupported file type. Only PDF and DOCX are supported.")

        if extension == ".pdf":
            # Check file size (max 50MB)
            file_size = os.path.getsize(filepath)
            if file_size > 50 * 1024 * 1024:
                raise ValueError(f"PDF file too large: {file_size} bytes (max 50MB)")

            doc = fitz.open(filepath)
            text = ""

            for page_num, page in enumerate(doc):
                try:
                    page_text = page.get_text()
                    if page_text.strip():
                        text += page_text + "\n"
                except Exception as e:
                    print(
                        f"Warning: Failed to extract text from page {page_num + 1}: {str(e)}"
                    )

            doc.close()

        else:
            if not docx:
                raise ValueError(
                    "DOCX processing requires python-docx. Please install the dependency."
                )

            document = docx.Document(filepath)
            paragraphs = [p.text.strip() for p in document.paragraphs if p.text.strip()]
            text = "\n".join(paragraphs)

        if not text.strip():
            raise ValueError("No text content found in the document")

        is_valid, validation_msg = TextCleaner.validate_content(text)
        if not is_valid:
            raise ValueError(f"Extracted content validation failed: {validation_msg}")

        return text.strip()

    except fitz.FileDataError:
        raise ValueError(f"Invalid or corrupted PDF file: {filepath}")
    except fitz.FileNotFoundError:
        raise ValueError(f"File not found: {filepath}")
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Document extraction failed: {str(e)}")
