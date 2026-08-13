import axios from "axios";
import { getApiErrorMessage } from "../utils/apiError";

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || import.meta.env.BACKEND_BASE_URL || "http://localhost:8000";

export const API = axios.create({
  baseURL: BASE_URL,
});

async function requestWithFriendlyErrors(request, fallbackMessage) {
  try {
    return await request();
  } catch (error) {
    throw new Error(getApiErrorMessage(error, fallbackMessage));
  }
}

export const setAuthToken = (token) => {
  if (token) {
    API.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete API.defaults.headers.common.Authorization;
};

export const generateQuiz = async (payload) => {
  return requestWithFriendlyErrors(async () => {
    const res = await API.post("/quiz/generate", payload);
    return res.data;
  }, "Failed to generate quiz. Please try again.");
};

export const submitQuiz = async (payload) => {
  const res = await API.post("/quiz/submit", payload);
  return res.data;
};

export const getQuizResultDetail = async (quizId) => {
  const res = await API.get(`/quiz/results/${quizId}`);
  return res.data;
};

export const summarizeContent = async ({ input_type, source, mode = "brief", model_mode = "api" }) => {
  return requestWithFriendlyErrors(async () => {
    const res = await API.post("/summarize/content", {
      input_type,
      source,
      mode,
      model_mode,
    });
    return res.data;
  }, "Failed to generate summary. Please try again.");
};

export const uploadSummaryFile = async (file, mode = "brief", model_mode = "api") => {
  return requestWithFriendlyErrors(async () => {
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
  }, "Failed to summarize the uploaded file. Please try again.");
};


export const getSubscriptionPlans = async () => {
  const res = await API.get("/subscriptions/plans");
  return res.data;
};

export const createSubscriptionOrder = async (payload) => {
  const res = await API.post("/subscriptions/order", payload);
  return res.data?.data ?? res.data;
};

export const confirmSubscriptionPayment = async (payload) => {
  const res = await API.post("/subscriptions/confirm", payload);
  return res.data;
};

/** Get the authenticated user's current subscription status (plan, expiry, days left). */
export const getSubscriptionStatus = async () => {
  const res = await API.get("/subscriptions/status");
  return res.data;
};

/** Cancel the authenticated user's active subscription. */
export const cancelSubscription = async () => {
  const res = await API.delete("/subscriptions/cancel");
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

export const deleteProfile = async (password) => {
  const res = await API.delete("/auth/profile", {
    data: {
      password,
    },
  });
  return res.data;
};

export const updateProfile = async (payload) => {
  const res = await API.patch("/auth/profile", payload);
  return res.data;
};

export const generateWizardContent = async (payload) => {
  return requestWithFriendlyErrors(async () => {
    const res = await API.post("/wizard/generate", payload);
    return res.data;
  }, "Failed to generate wizard content. Please try again.");
};

export const generateAgenticWizardContent = async (payload) => {
  return requestWithFriendlyErrors(async () => {
    const res = await API.post("/wizard/generate-agentic", payload);
    return res.data;
  }, "Failed to start agentic generation. Please try again.");
};

export const provideWizardFeedback = async (id, feedback) => {
  return requestWithFriendlyErrors(async () => {
    const res = await API.post(`/wizard/${id}/feedback`, { feedback });
    return res.data;
  }, "Failed to submit feedback. Please try again.");
};

export const publishWizardContent = async (id, modulesData) => {
  return requestWithFriendlyErrors(async () => {
    const res = await API.post(`/wizard/${id}/publish`, { modules: modulesData });
    return res.data;
  }, "Failed to publish content. Please try again.");
};

export const exportWizardPdf = async (payload) => {
  return requestWithFriendlyErrors(async () => {
    const res = await API.post("/wizard/export-pdf", payload, {
      responseType: "blob",
    });
    return res.data;
  }, "Failed to generate PDF document. Please try again.");
};

export const getWizardHistory = async (skip = 0, limit = 20) => {
  const res = await API.get(`/wizard/history?skip=${skip}&limit=${limit}`);
  return res.data;
};

export const getWizardContentDetail = async (id) => {
  const res = await API.get(`/wizard/${id}`);
  return res.data;
};

/**
 * Fetch full lesson detail — all sections, resources, and exercises.
 * Called when a learner opens a specific lesson in the CourseViewer.
 */
export const getWizardCourseLesson = async (contentId, lessonId) => {
  const res = await API.get(`/wizard/${contentId}/lesson/${lessonId}`);
  return res.data;
};

export const deleteWizardContent = async (id) => {
  const res = await API.delete(`/wizard/${id}`);
  return res.data;
};

export const getPublishedCourses = async () => {
  const res = await API.get("/wizard/published");
  return res.data;
};
