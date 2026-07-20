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
