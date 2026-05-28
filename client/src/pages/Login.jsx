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
    Divider,
    InputAdornment,
    Link as MuiLink,
} from "@mui/material";

import {
    EmailOutlined,
    LockOutlined,
    Psychology,
    FaceRetouchingNatural,
} from "@mui/icons-material";

export default function Login() {
    const { login } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const from = location.state?.from?.pathname || "/quiz";

    const handleSubmit = async (event) => {
        event.preventDefault();

        setLoading(true);

        try {
            setError(null);
            await login(form);
            navigate(from, { replace: true });
        } catch (err) {
            setError(
                err.response?.data?.detail ||
                "Login failed. Please verify your credentials."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                    "linear-gradient(135deg, #0f172a 0%, #111827 40%, #1e293b 100%)",
                px: 2,
            }}
        >
            <Container maxWidth="sm">
                <Paper
                    elevation={0}
                    sx={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: 5,
                        backdropFilter: "blur(20px)",
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        boxShadow:
                            "0 8px 32px rgba(0,0,0,0.35)",
                        p: { xs: 4, md: 5 },
                    }}
                >
                    {/* Top Glow */}
                    <Box
                        sx={{
                            position: "absolute",
                            top: -120,
                            right: -100,
                            width: 240,
                            height: 240,
                            borderRadius: "50%",
                            background:
                                "radial-gradient(circle, rgba(99,102,241,0.45), transparent 70%)",
                        }}
                    />

                    {/* Branding */}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            mb: 4,
                            position: "relative",
                            zIndex: 2,
                        }}
                    >
                        <Box
                            sx={{
                                width: 72,
                                height: 72,
                                borderRadius: "20px",
                                background:
                                    "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                mb: 2,
                                boxShadow:
                                    "0 10px 30px rgba(99,102,241,0.4)",
                            }}
                        >
                            <Psychology sx={{ fontSize: 40, color: "#fff" }} />
                        </Box>

                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 800,
                                color: "#fff",
                                mb: 1,
                                letterSpacing: 0.5,
                            }}
                        >
                            CognitiveWizard
                        </Typography>

                        <Typography
                            variant="body1"
                            sx={{
                                color: "rgba(255,255,255,0.7)",
                                textAlign: "center",
                                maxWidth: 320,
                            }}
                        >
                            Securely access your AI-powered learning experience
                        </Typography>
                    </Box>

                    {/* Form */}
                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2.5,
                            position: "relative",
                            zIndex: 2,
                        }}
                    >
                        <TextField
                            fullWidth
                            label="Email Address"
                            type="email"
                            value={form.email}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    email: e.target.value,
                                })
                            }
                            required
                            variant="outlined"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <EmailOutlined
                                            sx={{
                                                color: "#94a3b8",
                                            }}
                                        />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 3,
                                    background: "rgba(255,255,255,0.06)",
                                    color: "#fff",

                                    "& fieldset": {
                                        borderColor:
                                            "rgba(255,255,255,0.1)",
                                    },

                                    "&:hover fieldset": {
                                        borderColor: "#6366f1",
                                    },

                                    "&.Mui-focused fieldset": {
                                        borderColor: "#8b5cf6",
                                        borderWidth: "2px",
                                    },
                                },

                                "& .MuiInputLabel-root": {
                                    color: "#cbd5e1",
                                },
                            }}
                        />

                        <TextField
                            fullWidth
                            label="Password"
                            type="password"
                            value={form.password}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    password: e.target.value,
                                })
                            }
                            required
                            variant="outlined"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlined
                                            sx={{
                                                color: "#94a3b8",
                                            }}
                                        />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 3,
                                    background: "rgba(255,255,255,0.06)",
                                    color: "#fff",

                                    "& fieldset": {
                                        borderColor:
                                            "rgba(255,255,255,0.1)",
                                    },

                                    "&:hover fieldset": {
                                        borderColor: "#6366f1",
                                    },

                                    "&.Mui-focused fieldset": {
                                        borderColor: "#8b5cf6",
                                        borderWidth: "2px",
                                    },
                                },

                                "& .MuiInputLabel-root": {
                                    color: "#cbd5e1",
                                },
                            }}
                        />

                        {error && (
                            <Alert
                                severity="error"
                                sx={{
                                    borderRadius: 3,
                                }}
                            >
                                {error}
                            </Alert>
                        )}

                        {/* Primary Login */}
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{
                                py: 1.6,
                                borderRadius: 3,
                                fontWeight: 700,
                                fontSize: "1rem",
                                textTransform: "none",
                                background:
                                    "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                boxShadow:
                                    "0 10px 25px rgba(99,102,241,0.35)",

                                "&:hover": {
                                    transform: "translateY(-2px)",
                                    boxShadow:
                                        "0 15px 35px rgba(99,102,241,0.45)",
                                },

                                transition: "all 0.25s ease",
                            }}
                        >
                            {loading ? "Signing In..." : "Sign In"}
                        </Button>

                        <Divider
                            sx={{
                                color: "rgba(255,255,255,0.4)",
                                "&::before, &::after": {
                                    borderColor:
                                        "rgba(255,255,255,0.1)",
                                },
                            }}
                        >
                            OR
                        </Divider>

                        {/* Face Login */}
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => navigate("/face-login")}
                            startIcon={<FaceRetouchingNatural />}
                            sx={{
                                py: 1.5,
                                borderRadius: 3,
                                fontWeight: 600,
                                textTransform: "none",
                                color: "#fff",
                                borderColor:
                                    "rgba(255,255,255,0.15)",
                                background:
                                    "rgba(255,255,255,0.03)",

                                "&:hover": {
                                    borderColor: "#6366f1",
                                    background:
                                        "rgba(99,102,241,0.08)",
                                },
                            }}
                        >
                            Continue with Face Login
                        </Button>

                        {/* Footer Links */}
                        <Box
                            sx={{
                                mt: 2,
                                textAlign: "center",
                            }}
                        >
                            <MuiLink
                                component={Link}
                                to="/forgot-password"
                                underline="hover"
                                sx={{
                                    color: "#a5b4fc",
                                    fontWeight: 500,
                                }}
                            >
                                Forgot Password?
                            </MuiLink>

                            <Typography
                                variant="body2"
                                sx={{
                                    mt: 1.5,
                                    color: "rgba(255,255,255,0.65)",
                                }}
                            >
                                New to CognitiveWizard?{" "}
                                <MuiLink
                                    component={Link}
                                    to="/signup"
                                    underline="hover"
                                    sx={{
                                        color: "#a5b4fc",
                                        fontWeight: 600,
                                    }}
                                >
                                    Create account
                                </MuiLink>
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}