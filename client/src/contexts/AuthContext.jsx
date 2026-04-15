import { useEffect, useState, useCallback, useContext } from "react";
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
                const isAuthRequest = requestUrl.startsWith("/auth/login") || requestUrl.startsWith("/auth/signup");

                if (error.response?.status === 401 && token && !isAuthRequest) {
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

    const value = {
        user,
        token,
        loading,
        initializing,
        login,
        signup,
        logout,
        updateUser,
        isAuthenticated: Boolean(token && user),
        isLoading: loading || initializing,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
