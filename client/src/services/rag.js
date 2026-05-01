import { API } from "./api";

function toErrorMessage(error, fallbackMessage) {
  if (error?.response?.data?.detail) return error.response.data.detail;
  if (error?.message) return error.message;
  return fallbackMessage;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await API.post("/rag/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(toErrorMessage(error, "File upload failed."));
  }
}

export async function askRagQuestion({ query, use_rag = true, signal, use_langchain = true }) {
  try {
    // Support both v0 (default) and v1 (LangChain) endpoints
    const endpoint = use_langchain ? "/rag/chat-langchain" : "/rag/chat";

    const response = await API.post(
      endpoint,
      {
        query,
        use_rag,
        use_langchain,
      },
      { signal },
    );
    return response.data;
  } catch (error) {
    throw new Error(toErrorMessage(error, "Failed to get answer from chatbot."));
  }
}

export async function fetchRagSource(sourceUrl) {
  try {
    const response = await API.get(sourceUrl, {
      responseType: "blob",
    });
    return response.data;
  } catch (error) {
    throw new Error(toErrorMessage(error, "Failed to open source document."));
  }
}

export async function askLangChainRagQuestion({ query, use_rag = true, signal }) {
  /**
   * Convenience function to use LangChain RAG endpoint directly.
   * Equivalent to askRagQuestion with use_langchain=true
   */
  return askRagQuestion({ query, use_rag, signal, use_langchain: true });
}

export async function fetchRagStatus() {
  try {
    const response = await API.get("/rag/status");
    return response.data;
  } catch (error) {
    throw new Error(toErrorMessage(error, "Failed to fetch RAG context status."));
  }
}

export async function fetchRagStatusLangChain() {
  /**
   * Fetch status for LangChain RAG implementation.
   */
  try {
    const response = await API.get("/rag/status-langchain");
    return response.data;
  } catch (error) {
    throw new Error(toErrorMessage(error, "Failed to fetch LangChain RAG status."));
  }
}
