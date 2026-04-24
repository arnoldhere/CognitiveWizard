import { API } from "./api";

export const signup = async (payload) => {
    return API.post("/auth/signup", payload);
};

export const login = async (payload) => {
    return API.post("/auth/login", payload);
};

export const getCurrentUser = async () => {
    return API.get("/auth/me");
};

export const forgotPassword = async (email) => {
    return API.post("/auth/forgot-password", { email });
};

export const resetPassword = async (email, otp, newPassword) => {
    return API.post("/auth/reset-password", { email, otp, new_password: newPassword });
};
