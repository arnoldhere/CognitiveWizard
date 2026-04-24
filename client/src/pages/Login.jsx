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
    Link as MuiLink,
} from "@mui/material";
import { Email, Lock } from "@mui/icons-material";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // Get the intended destination from location state, or default to /quiz
    const from = location.state?.from?.pathname || "/quiz";

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            setError(null);
            await login(form);
            // Redirect to the intended page or quiz page
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.response?.data?.detail || "Login failed. Check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Paper
                elevation={3}
                sx={{
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    borderRadius: 3,
                }}
            >
                <Typography
                    component="h1"
                    variant="h4"
                    sx={{
                        mb: 1,
                        fontWeight: 700,
                        color: 'primary.main',
                        textAlign: 'center',
                    }}
                >
                    Welcome back
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        mb: 3,
                        color: 'text.secondary',
                        textAlign: 'center',
                    }}
                >
                    Sign in to your account
                </Typography>

                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                    }}
                >
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                        variant="outlined"
                        InputProps={{
                            startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />,
                        }}
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        variant="outlined"
                        InputProps={{
                            startAdornment: <Lock sx={{ mr: 1, color: 'action.active' }} />,
                        }}
                    />

                    {error && (
                        <Alert severity="error" sx={{ width: '100%' }}>
                            {error}
                        </Alert>
                    )}

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={loading}
                        sx={{
                            mt: 2,
                            py: 1.5,
                            fontSize: '1.1rem',
                            fontWeight: 600,
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Button>

                    <Button
                        type="button"
                        fullWidth
                        variant="outlined"
                        size="large"
                        disabled={loading}
                        onClick={() => navigate('/face-login')}
                        sx={{
                            mt: 2,
                            py: 1.5,
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            textTransform: 'none',
                        }}
                    >
                        {loading ? 'Please wait...' : 'Face Login'}
                    </Button>

                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            <MuiLink
                                component={Link}
                                to="/forgot-password"
                                sx={{
                                    color: 'primary.main',
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                    '&:hover': {
                                        textDecoration: 'underline',
                                    },
                                }}
                            >
                                Forgot Password?
                            </MuiLink>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            New here?{' '}
                            <MuiLink
                                component={Link}
                                to="/signup"
                                sx={{
                                    color: 'primary.main',
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                    '&:hover': {
                                        textDecoration: 'underline',
                                    },
                                }}
                            >
                                Create an account
                            </MuiLink>
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
}
