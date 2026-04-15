import axios from "axios";

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || import.meta.env.BACKEND_BASE_URL || "http://localhost:8000";

export const API = axios.create({
  baseURL: BASE_URL,
});

export const setAuthToken = (token) => {
  if (token) {
    API.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete API.defaults.headers.common.Authorization;
};

export const generateQuiz = async (payload) => {
  const res = await API.post("/quiz/generate", payload);
  return res.data;
};

export const submitQuiz = async (payload) => {
  const res = await API.post("/quiz/submit", payload);
  return res.data;
};

export const summarizeContent = async ({ input_type, source, mode = "brief", model_mode = "api" }) => {
  const res = await API.post("/summarize/content", {
    input_type,
    source,
    mode,
    model_mode,
  });
  return res.data;
};

export const uploadSummaryFile = async (file, mode = "brief", model_mode = "api") => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);
  formData.append("model_mode", model_mode);

  const res = await API.post("/summarize/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const getQuizResults = async ({
  skip = 0,
  limit = 10,
  sort_by = "submitted_at",
  sort_order = "desc",
  status_filter = undefined,
  topic_search = undefined,
} = {}) => {
  const params = new URLSearchParams({
    skip,
    limit,
    sort_by,
    sort_order,
  });

  if (status_filter) params.append("status_filter", status_filter);
  if (topic_search) params.append("topic_search", topic_search);

  const res = await API.get(`/quiz/results?${params.toString()}`);
  return res.data;
};
