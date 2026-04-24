import { API } from "./api";

export const getDashboardStats = async () => {
    return API.get("/admin/dashboard");
};

export const getAllUsers = async () => {
    return API.get("/admin/users");
};

export const updateUserStatus = async (userId, isActive) => {
    return API.put(`/admin/users/${userId}/status`, { is_active: isActive });
};

export const getSystemConfig = async () => {
    return API.get("/admin/config");
};

export const updateSystemConfig = async (config) => {
    return API.put("/admin/config", config);
};