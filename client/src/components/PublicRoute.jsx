import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Box, CircularProgress } from "@mui/material";

export default function PublicRoute({ children }) {
    const { isAuthenticated, isLoading } = useAuth();
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
        // Check if there's a saved location from a protected route redirect
        const from = location.state?.from?.pathname || "/quiz";
        return <Navigate to={from} replace />;
    }

    // Render public content (login/signup)
    return children;
}
