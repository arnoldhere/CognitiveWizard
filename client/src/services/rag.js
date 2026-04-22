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

export async function askRagQuestion({ query, use_rag = true, signal }) {
  try {
    const response = await API.post(
      "/rag/chat",
      {
        query,
        use_rag,
      },
      { signal },
    );
    return response.data;
  } catch (error) {
    throw new Error(toErrorMessage(error, "Failed to get answer from chatbot."));
  }
}

export async function fetchRagStatus() {
  try {
    const response = await API.get("/rag/status");
    return response.data;
  } catch (error) {
    throw new Error(toErrorMessage(error, "Failed to fetch RAG context status."));
  }
}
