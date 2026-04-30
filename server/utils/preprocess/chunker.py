from langchain_classic.text_splitter import RecursiveCharacterTextSplitter


def chunker(docs):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800, chunk_overlap=100, separators=["\n\n", "\n", ".", " ", ""]
    )
    return splitter.split_documents(docs)
