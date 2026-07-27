import { useEffect, useState, useCallback } from "react";
import { login as authLogin, signup as authSignup, getCurrentUser } from "../services/auth";
import { API, setAuthToken } from "../services/api";
import { AuthContext } from "./auth-context";

const TOKEN_KEY = "cw_token";
const USER_KEY = "cw_user";

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(true);

    const clearSession = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        setToken(null);
        setUser(null);
        setAuthToken(null);
    }, []);

    const persistSession = useCallback((tokenValue, userData) => {
        localStorage.setItem(TOKEN_KEY, tokenValue);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));

        setToken(tokenValue);
        setUser(userData);
        setAuthToken(tokenValue);
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const savedToken = localStorage.getItem(TOKEN_KEY);
                const savedUser = localStorage.getItem(USER_KEY);

                if (savedToken) {
                    setToken(savedToken);
                    setAuthToken(savedToken);

                    if (savedUser) {
                        setUser(JSON.parse(savedUser));
                    }

                    const response = await getCurrentUser();
                    persistSession(savedToken, response.data);
                }
            } catch (error) {
                console.error("Error initializing auth:", error);
                clearSession();
            } finally {
                setLoading(false);
                setInitializing(false);
            }
        };

        initializeAuth();
    }, [clearSession, persistSession]);

    useEffect(() => {
        const interceptor = API.interceptors.response.use(
            (response) => response,
            (error) => {
                const requestUrl = error.config?.url || "";
                // Do NOT clear the session for non-auth 401s.
                // Only clear if the 401 comes from a protected route where
                // the JWT itself was rejected — not from missing x-user-id
                // headers on internal proxy calls.
                const isAuthEndpoint = (
                    requestUrl.startsWith("/auth/login") ||
                    requestUrl.startsWith("/auth/signup")
                );
                // RAG session history proxies to /rag/sessions-raw/... which
                // may 401 when the gateway forgets to forward x-user-id.
                // This is a proxy bug — NOT an invalid JWT — so skip logout.
                const isRagProxy = requestUrl.startsWith("/rag/");

                if (
                    error.response?.status === 401 &&
                    token &&
                    !isAuthEndpoint &&
                    !isRagProxy
                ) {
                    clearSession();
                }

                return Promise.reject(error);
            }
        );

        return () => {
            API.interceptors.response.eject(interceptor);
        };
    }, [clearSession, token]);

    const login = async (credentials) => {
        try {
            const response = await authLogin(credentials);
            const payload = response.data;

            if (!payload.access_token || !payload.user) {
                throw new Error("Invalid response format");
            }

            persistSession(payload.access_token, payload.user);
            return payload;
        } catch (error) {
            clearSession();
            throw error;
        }
    };

    const loginWithToken = useCallback((payload) => {
        if (!payload?.access_token || !payload?.user) {
            throw new Error("Invalid login payload");
        }
        persistSession(payload.access_token, payload.user);
    }, [persistSession]);

    const signup = async (values) => {
        const response = await authSignup(values);
        return response.data;
    };

    const logout = useCallback(() => {
        clearSession();
    }, [clearSession]);

    const updateUser = useCallback((userData) => {
        const updatedUser = { ...user, ...userData };
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        setUser(updatedUser);
    }, [user]);

    const refreshUser = useCallback(async () => {
        try {
            const response = await getCurrentUser();
            persistSession(token, response.data);
        } catch (error) {
            console.error("Error refreshing user:", error);
            throw error;
        }
    }, [token, persistSession]);

    const value = {
        user,
        token,
        loading,
        initializing,
        login,
        loginWithToken,
        signup,
        logout,
        updateUser,
        refreshUser,
        isAuthenticated: Boolean(token && user),
        isTutor: user?.role === "tutor",
        isAdmin: user?.role === "admin",
        isUser: user?.role === "user" || !user?.role,
        isLoading: loading || initializing,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
