from pypdf import PdfReader


def load_pdf(file_path: str):
    reader = PdfReader(file_path)
    return "\n".join([page.extract_text() for page in reader.pages])
