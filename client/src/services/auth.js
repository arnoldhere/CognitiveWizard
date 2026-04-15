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
