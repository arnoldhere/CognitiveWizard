def chunk_text(txt, chunk_size=500, overlap=100):
    words = txt.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = words[i : i + chunk_size]
        chunks.append(" ".join(chunk))

    return chunks
