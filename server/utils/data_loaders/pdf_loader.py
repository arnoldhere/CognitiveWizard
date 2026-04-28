from langchain_community.document_loaders import PyPDFLoader


def load_pdf(path: str):
    # load pdf docs
    loader = PyPDFLoader(path)
    return loader.load()
