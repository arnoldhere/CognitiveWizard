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
    FormControlLabel,
    Checkbox,
} from "@mui/material";
import {
    EmailOutlined,
    LockOutlined,
    PhoneOutlined,
    CalendarMonthOutlined,
    Psychology,
    Person2Outlined,
    School,
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
        is_tutor: false,
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
            setError(err.response?.data?.detail || err.response?.data?.error || "Unable to create account.");
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field) => (event) => {
        const val = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        setForm({ ...form, [field]: val });
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
                                <Typography color="text.secondary">Start with a secure account.</Typography>
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
                                <Grid item xs={12}>
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 2.5,
                                            background: "rgba(20, 140, 255, 0.04)",
                                            border: "1px solid rgba(20, 140, 255, 0.16)",
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: 1.5
                                        }}
                                    >
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={form.is_tutor}
                                                    onChange={updateField("is_tutor")}
                                                    color="primary"
                                                    icon={<School sx={{ opacity: 0.5 }} />}
                                                    checkedIcon={<School color="primary" />}
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                                                        Are you a Tutor / Educator?
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Enable tutor role to publish and introduce courses, roadmaps, and guides for students.
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </Box>
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
