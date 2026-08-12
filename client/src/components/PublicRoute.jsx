import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function PublicRoute({ children }) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking authentication
    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 size={40} className="animate-spin text-primary" />
            </div>
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
