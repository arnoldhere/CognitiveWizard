import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Box, CircularProgress } from "@mui/material";

export default function PublicRoute({ children }) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking authentication
    if (isLoading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '50vh',
                }}
            >
                <CircularProgress size={60} />
            </Box>
        );
    }

    // Redirect authenticated users to their intended destination or home
    if (isAuthenticated) {
        if (user?.role === 'admin') {
            return <Navigate to="/admin/dashboard" replace />;
        }
        const from = location.state?.from?.pathname || "/quiz";
        return <Navigate to={from} replace />;
    }

    // Render public content (login/signup)
    return children;
}
