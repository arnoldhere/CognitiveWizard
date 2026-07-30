import { API } from "./api";

/**
 * Fetch dashboard statistics for the admin panel.
 */
export const getAdminStats = async () => {
    const res = await API.get("/admin/stats");
    return res.data;
};

/**
 * Fetch all users for the admin panel.
 */
export const getAdminUsers = async () => {
    const res = await API.get("/admin/users");
    return res.data;
};

/**
 * Toggle a user's active status.
 */
export const updateUserStatus = async (id, is_active) => {
    const res = await API.patch(`/admin/users/${id}/status`, { is_active });
    return res.data;
};

/**
 * Fetch all LLM configurations.
 */
export const getLLMConfigs = async () => {
    const res = await API.get("/admin/llm-configs");
    return res.data;
};

/**
 * Update a specific LLM configuration.
 */
export const updateLLMConfig = async (taskName, config) => {
    const res = await API.put(`/admin/llm-configs/${taskName}`, config);
    return res.data;
};

// ─── Wizard Question Sets ──────────────────────────────────────────────────────

export const getWizardQuestionSets = async () => {
    const res = await API.get("/admin/wizard-questions");
    return res.data;
};

export const createWizardQuestionSet = async (payload) => {
    const res = await API.post("/admin/wizard-questions", payload);
    return res.data;
};

export const updateWizardQuestionSet = async (id, payload) => {
    const res = await API.put(`/admin/wizard-questions/${id}`, payload);
    return res.data;
};

export const deleteWizardQuestionSet = async (id) => {
    const res = await API.delete(`/admin/wizard-questions/${id}`);
    return res.data;
};

export const toggleWizardQuestionSet = async (id) => {
    const res = await API.patch(`/admin/wizard-questions/${id}/toggle`);
    return res.data;
};

// ─── Admin Courses ─────────────────────────────────────────────────────────────

export const getAdminCourses = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await API.get(`/admin/courses?${query}`);
    return res.data;
};
