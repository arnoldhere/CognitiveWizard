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
} from "@mui/material";
import { Email, Lock, Person, Face2Outlined, SettingsEthernet } from "@mui/icons-material";
export default function Signup() {
    const { signup } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "", full_name: "" });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // on form submit
    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            setError(null);
            await signup(form);
            navigate("/login", { replace: true });
        } catch (err) {
            setError(err.response?.data?.detail || "Unable to create account.");
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
                    Create access
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        mb: 3,
                        color: 'text.secondary',
                        textAlign: 'center',
                    }}
                >
                    Sign up for free
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
                        label="Full name"
                        type="text"
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        placeholder="Optional"
                        variant="outlined"
                        InputProps={{
                            startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />,
                        }}
                    />
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
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
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
                            {loading ? 'Creating account...' : 'Sign Up'}
                        </Button>


                    </Box>
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            Already have an account?{' '}
                            <MuiLink
                                component={Link}
                                to="/login"
                                sx={{
                                    color: 'primary.main',
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                    '&:hover': {
                                        textDecoration: 'underline',
                                    },
                                }}
                            >
                                Sign in
                            </MuiLink>
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Container >
    );
}
