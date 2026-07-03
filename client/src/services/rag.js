import { API } from "./api";
import { getApiErrorMessage } from "../utils/apiError";

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
    throw new Error(getApiErrorMessage(error, "File upload failed."));
  }
}

export async function askRagQuestion({ query, use_rag = true, signal, use_langchain = true, session_id = null }) {
  try {
    const endpoint = use_langchain ? "/rag/chat-langchain" : "/rag/chat";
    const payload = {
      query,
      use_rag,
      use_langchain,
      // Always include session_id (null is fine — backend ignores null)
      session_id: session_id || null,
    };

    const response = await API.post(endpoint, payload, { signal });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to get answer from chatbot."));
  }
}

export async function fetchChatSessions() {
  try {
    const response = await API.get("/rag/sessions");
    // Gateway wraps: { status: "success", data: [...sessions] }
    const payload = response.data;
    return Array.isArray(payload) ? payload : (payload?.data ?? []);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load chat sessions."));
  }
}

export async function createChatSession({ title = null, initial_prompt = null } = {}) {
  try {
    const response = await API.post("/rag/sessions", {
      title,
      initial_prompt,
    });
    // Gateway wraps: { status: "success", data: session }
    const payload = response.data;
    return payload?.data ?? payload;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to start a new chat session."));
  }
}

export async function deleteChatSession(session_id) {
  if (!session_id || session_id === "undefined") {
    throw new Error("Invalid session ID.");
  }
  try {
    const response = await API.delete(`/rag/sessions/${session_id}`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to delete the chat session."));
  }
}

export async function renameChatSession(session_id, new_title) {
  if (!session_id || session_id === "undefined") {
    throw new Error("Invalid session ID.");
  }
  try {
    const response = await API.put(`/rag/sessions/${session_id}`, {
      title: new_title,
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to rename the chat session."));
  }
}

export async function fetchChatSessionHistory(session_id) {
  if (!session_id || session_id === "undefined") {
    return { messages: [] };
  }
  try {
    const response = await API.get(`/rag/sessions/${session_id}/history`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load session history."));
  }
}

export async function deleteRagDocument(document_name) {
  try {
    const response = await API.delete(`/rag/documents/${encodeURIComponent(document_name)}`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to delete document."));
  }
}

export async function fetchRagSource(sourceUrl) {
  try {
    const response = await API.get(sourceUrl, {
      responseType: "blob",
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to open source document."));
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
    throw new Error(getApiErrorMessage(error, "Failed to fetch RAG context status."));
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
    throw new Error(getApiErrorMessage(error, "Failed to fetch LangChain RAG status."));
  }
}
