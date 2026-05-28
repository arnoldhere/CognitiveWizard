import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
    Divider,
    InputAdornment,
    Grid,
} from "@mui/material";

import {
    EmailOutlined,
    LockOutlined,
    PhoneOutlined,
    CalendarMonthOutlined,
    Psychology,
} from "@mui/icons-material";
import Person2OutlinedIcon from '@mui/icons-material/Person2Outlined';

export default function Signup() {
    const { signup } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        dob: "",
    });

    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();

        setLoading(true);

        try {
            setError(null);
            await signup(form);
            navigate("/login", { replace: true });
        } catch (err) {
            setError(
                err.response?.data?.detail ||
                "Unable to create account."
            );
        } finally {
            setLoading(false);
        }
    };

    const inputStyles = {
        "& .MuiOutlinedInput-root": {
            borderRadius: 3,
            background: "rgba(255,255,255,0.06)",
            color: "#fff",

            "& fieldset": {
                borderColor: "rgba(255,255,255,0.1)",
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

        "& input": {
            color: "#fff",
        },
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
                py: 4,
            }}
        >
            <Container maxWidth="md">
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
                    {/* Glow Background */}
                    <Box
                        sx={{
                            position: "absolute",
                            top: -100,
                            right: -80,
                            width: 240,
                            height: 240,
                            borderRadius: "50%",
                            background:
                                "radial-gradient(circle, rgba(99,102,241,0.45), transparent 70%)",
                        }}
                    />

                    {/* Header */}
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
                            <Psychology
                                sx={{
                                    fontSize: 40,
                                    color: "#fff",
                                }}
                            />
                        </Box>

                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 800,
                                color: "#fff",
                                mb: 1,
                            }}
                        >
                            Join CognitiveWizard
                        </Typography>

                        <Typography
                            variant="body1"
                            sx={{
                                color: "rgba(255,255,255,0.7)",
                                textAlign: "center",
                                maxWidth: 420,
                            }}
                        >
                            Create your intelligent learning profile and unlock
                            personalized AI-powered experiences
                        </Typography>
                    </Box>

                    {/* Form */}
                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{
                            position: "relative",
                            zIndex: 2,
                        }}
                    >
                        <Grid container spacing={2.5}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Full Name"
                                    value={form.full_name}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            full_name:
                                                e.target.value,
                                        })
                                    }
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Person2OutlinedIcon
                                                    sx={{
                                                        color:
                                                            "#94a3b8",
                                                    }}
                                                />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={inputStyles}
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Phone Number"
                                    value={form.phone}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            phone:
                                                e.target.value,
                                        })
                                    }
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PhoneOutlined
                                                    sx={{
                                                        color:
                                                            "#94a3b8",
                                                    }}
                                                />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={inputStyles}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Date of Birth"
                                    type="date"
                                    value={form.dob}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            dob: e.target.value,
                                        })
                                    }
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <CalendarMonthOutlined
                                                    sx={{
                                                        color:
                                                            "#94a3b8",
                                                    }}
                                                />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={inputStyles}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Email Address"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            email:
                                                e.target.value,
                                        })
                                    }
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <EmailOutlined
                                                    sx={{
                                                        color:
                                                            "#94a3b8",
                                                    }}
                                                />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={inputStyles}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Password"
                                    type="password"
                                    value={form.password}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            password:
                                                e.target.value,
                                        })
                                    }
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlined
                                                    sx={{
                                                        color:
                                                            "#94a3b8",
                                                    }}
                                                />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={inputStyles}
                                />
                            </Grid>
                        </Grid>

                        {error && (
                            <Alert
                                severity="error"
                                sx={{
                                    mt: 3,
                                    borderRadius: 3,
                                }}
                            >
                                {error}
                            </Alert>
                        )}

                        {/* CTA */}
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{
                                mt: 4,
                                py: 1.7,
                                borderRadius: 3,
                                fontWeight: 700,
                                fontSize: "1rem",
                                textTransform: "none",
                                background:
                                    "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                boxShadow:
                                    "0 10px 25px rgba(99,102,241,0.35)",

                                "&:hover": {
                                    transform:
                                        "translateY(-2px)",
                                    boxShadow:
                                        "0 15px 35px rgba(99,102,241,0.45)",
                                },

                                transition:
                                    "all 0.25s ease",
                            }}
                        >
                            {loading
                                ? "Creating Account..."
                                : "Create Account"}
                        </Button>

                        <Divider
                            sx={{
                                my: 4,
                                color:
                                    "rgba(255,255,255,0.4)",
                                "&::before, &::after": {
                                    borderColor:
                                        "rgba(255,255,255,0.1)",
                                },
                            }}
                        >
                            Secure AI Authentication
                        </Divider>

                        {/* Footer */}
                        <Box textAlign="center">
                            <Typography
                                variant="body2"
                                sx={{
                                    color:
                                        "rgba(255,255,255,0.7)",
                                }}
                            >
                                Already have an account?{" "}
                                <MuiLink
                                    component={Link}
                                    to="/login"
                                    underline="hover"
                                    sx={{
                                        color: "#a5b4fc",
                                        fontWeight: 600,
                                    }}
                                >
                                    Sign In
                                </MuiLink>
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}