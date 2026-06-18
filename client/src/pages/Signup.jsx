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
    Person2Outlined,
} from "@mui/icons-material";

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
            setError(err.response?.data?.detail || "Unable to create account.");
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field) => (event) => {
        setForm({ ...form, [field]: event.target.value });
    };

    return (
        <section className="auth-page">
            <Container maxWidth="lg">
                <div className="auth-layout">
                    <div className="auth-aside">
                        <p className="eyebrow">Create account</p>
                        <h1 className="page-title">Build your intelligent learning profile.</h1>
                        <p className="section-copy">
                            Your profile connects study sessions, quiz outcomes,
                            secure login options, and future adaptive planning signals.
                        </p>
                    </div>

                    <Paper elevation={0} className="auth-panel">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                            <Box className="feature-icon" sx={{ mb: 0 }}>
                                <Psychology />
                            </Box>
                            <Box>
                                <Typography variant="h5" fontWeight={900}>Join CognitiveWizard</Typography>
                                <Typography color="text.secondary">Start with a secure learner account.</Typography>
                            </Box>
                        </Box>

                        <Box component="form" onSubmit={handleSubmit}>
                            <Grid container spacing={2.25}>
                                <Grid item xs={12} md={6}>
                                    <TextField fullWidth label="Full Name" value={form.full_name} onChange={updateField("full_name")} InputProps={{ startAdornment: <InputAdornment position="start"><Person2Outlined /></InputAdornment> }} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField fullWidth label="Phone Number" value={form.phone} onChange={updateField("phone")} InputProps={{ startAdornment: <InputAdornment position="start"><PhoneOutlined /></InputAdornment> }} />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField fullWidth label="Date of Birth" type="date" value={form.dob} onChange={updateField("dob")} InputLabelProps={{ shrink: true }} InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonthOutlined /></InputAdornment> }} />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField fullWidth required label="Email Address" type="email" value={form.email} onChange={updateField("email")} InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlined /></InputAdornment> }} />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField fullWidth required label="Password" type="password" value={form.password} onChange={updateField("password")} InputProps={{ startAdornment: <InputAdornment position="start"><LockOutlined /></InputAdornment> }} />
                                </Grid>
                            </Grid>

                            {error && <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>{error}</Alert>}

                            <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 3 }}>
                                {loading ? "Creating Account..." : "Create Account"}
                            </Button>

                            <Divider sx={{ my: 3 }}>Secure Authentication</Divider>

                            <Box textAlign="center">
                                <Typography variant="body2" color="text.secondary">
                                    Already have an account?{" "}
                                    <MuiLink component={Link} to="/login" underline="hover" fontWeight={800}>
                                        Sign In
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
