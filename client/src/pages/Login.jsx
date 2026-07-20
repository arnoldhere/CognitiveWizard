import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    Alert,
    InputAdornment,
    Link as MuiLink,
} from "@mui/material";
import {
    EmailOutlined,
    LockOutlined,
    Psychology,
} from "@mui/icons-material";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const from = location.state?.from?.pathname || "/quiz";

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            setError(null);
            const payload = await login(form);
            const role = payload.role || payload.user?.role;
            if (role === 'admin') {
                navigate('/admin/dashboard', { replace: true });
            } else if (role === 'user') {
                navigate(from, { replace: true });
            }
            else {
                setError("Unknown user role. Please contact support.");
            }
        } catch (err) {
            if (err.response?.status === 403) {
                navigate('/blocked', { replace: true });
            } else {
                setError(err.response?.data?.error || err.response?.detail?.message || "Login failed. Try again later...");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="auth-page">
            <Container maxWidth="lg">
                <div className="auth-layout">
                    <div className="auth-aside">
                        <p className="eyebrow">Welcome back</p>
                        <h1 className="page-title">Resume your focused learning workspace.</h1>
                        <p className="section-copy">
                            Sign in to access your private RAG sessions, quiz history,
                            quick summaries, and profile settings.
                        </p>
                    </div>

                    <Paper elevation={0} className="auth-panel">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                            <Box className="feature-icon" sx={{ mb: 0 }}>
                                <Psychology />
                            </Box>
                            <Box>
                                <Typography variant="h5" fontWeight={900}>Sign in</Typography>
                                <Typography color="text.secondary">Use your CognitiveWizard account.</Typography>
                            </Box>
                        </Box>

                        <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2.25 }}>
                            <TextField
                                fullWidth
                                label="Email Address"
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                required
                                InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlined /></InputAdornment> }}
                            />
                            <TextField
                                fullWidth
                                label="Password"
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                required
                                InputProps={{ startAdornment: <InputAdornment position="start"><LockOutlined /></InputAdornment> }}
                            />

                            {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

                            <Button type="submit" fullWidth variant="contained" disabled={loading}>
                                {loading ? "Signing In..." : "Sign In"}
                            </Button>

                            <Box sx={{ textAlign: "center" }}>
                                <MuiLink component={Link} to="/forgot-password" underline="hover" fontWeight={700}>
                                    Forgot Password?
                                </MuiLink>
                                <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">
                                    New to CognitiveWizard?{" "}
                                    <MuiLink component={Link} to="/signup" underline="hover" fontWeight={800}>
                                        Create account
                                    </MuiLink>
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </div>
            </Container>
        </section>
    );
}
