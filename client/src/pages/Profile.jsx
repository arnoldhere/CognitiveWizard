import { useCallback } from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
    getQuizResults,
    deleteProfile,
    getFaceLoginStatus,
    removeFaceLogin,
    getQuizResultDetail,
    getSubscriptionPlans,
    createSubscriptionOrder,
    confirmSubscriptionPayment,
    updateProfile,
} from "../services/api";
import QuizResultsHistory from "../components/quiz/QuizResultsHistory";
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Avatar,
    Chip,
    Divider,
    Button,
    Alert,
    Tab,
    Tabs,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
} from "@mui/material";
import { Person, Email, AdminPanelSettings, History, Delete, WarningAmber, SettingsEthernet, Face2Outlined, CheckCircle, Close } from "@mui/icons-material";

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

export default function Profile() {
    const navigate = useNavigate()
    const { user, logout, refreshUser } = useAuth();
    const [tabValue, setTabValue] = useState(0);
    const [results, setResults] = useState({ data: [], total: 0, pages: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedQuizDetail, setSelectedQuizDetail] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    // Delete profile modal states
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    const [profileForm, setProfileForm] = useState({
        full_name: user?.full_name || "",
        phone: user?.phone || "",
        dob: user?.dob || "",
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState(null);
    const [profileSuccess, setProfileSuccess] = useState(null);

    const [faceLoginStatus, setFaceLoginStatus] = useState(null);
    const [faceLoading, setFaceLoading] = useState(true);
    const [faceError, setFaceError] = useState(null);
    const [faceDeleteLoading, setFaceDeleteLoading] = useState(false);
    const [faceDeleteSuccess, setFaceDeleteSuccess] = useState(null);

    // Subscription states
    const [subscriptionPlans, setSubscriptionPlans] = useState([]);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);
    const [subscriptionError, setSubscriptionError] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentError, setPaymentError] = useState(null);

    const formatDuration = (seconds) => {
        if (seconds === null || seconds === undefined) {
            return "N/A";
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const handleFetchResults = useCallback(async (params) => {
        try {
            setLoading(true);
            setError(null);
            const data = await getQuizResults(params);
            setResults(data);
        } catch (err) {
            console.error("Error fetching results:", err);
            setError("Failed to fetch quiz results");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSaveProfile = async () => {
        setProfileLoading(true);
        setProfileError(null);
        setProfileSuccess(null);

        try {
            const payload = {
                full_name: profileForm.full_name || null,
                phone: profileForm.phone || null,
                dob: profileForm.dob || null,
            };
            await updateProfile(payload);
            await refreshUser();
            setProfileSuccess("Your profile has been updated.");
        } catch (err) {
            console.error("Error updating profile:", err);
            setProfileError(err.response?.data?.detail || "Unable to update profile.");
        } finally {
            setProfileLoading(false);
        }
    };

    const handleDeleteProfile = async () => {
        if (!deletePassword.trim()) {
            setDeleteError("Please enter your password");
            return;
        }

        try {
            setDeleteLoading(true);
            setDeleteError(null);

            await deleteProfile(deletePassword);

            // Close modal and logout
            setDeleteModalOpen(false);
            setDeletePassword("");

            // Show success message
            await new Promise(resolve => setTimeout(resolve, 500));

            // Logout and redirect
            await logout();
            navigate("/login", {
                state: { message: "Your profile has been successfully deleted" }
            });
        } catch (err) {
            console.error("Error deleting profile:", err);
            setDeleteError(
                "Failed to delete profile, Invalid password."
            );
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleViewQuizDetails = async (quizId) => {
        try {
            setDetailLoading(true);
            setError(null);
            const detail = await getQuizResultDetail(quizId);
            setSelectedQuizDetail(detail);
            setDetailOpen(true);
        } catch (err) {
            console.error("Error fetching quiz detail:", err);
            setError(err.response?.data?.detail || "Failed to fetch quiz details");
        } finally {
            setDetailLoading(false);
        }
    };

    const loadFaceLoginStatus = useCallback(async () => {
        try {
            setFaceLoading(true);
            setFaceError(null);
            const data = await getFaceLoginStatus();
            setFaceLoginStatus(Boolean(data.has_face_login));
        } catch (err) {
            console.error("Error fetching face login status:", err);
            setFaceError("Unable to load facial login status.");
            setFaceLoginStatus(false);
        } finally {
            setFaceLoading(false);
        }
    }, []);

    const loadSubscriptionPlans = useCallback(async () => {
        try {
            setSubscriptionLoading(true);
            setSubscriptionError(null);
            const plans = await getSubscriptionPlans();
            setSubscriptionPlans(plans);
        } catch (err) {
            console.error("Error fetching subscription plans:", err);
            setSubscriptionError("Unable to load subscription plans.");
        } finally {
            setSubscriptionLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            loadFaceLoginStatus();
            loadSubscriptionPlans();
        }
    }, [user, loadFaceLoginStatus, loadSubscriptionPlans]);

    useEffect(() => {
        if (user) {
            setProfileForm({
                full_name: user.full_name || "",
                phone: user.phone || "",
                dob: user.dob || "",
            });
        }
    }, [user]);

    const handleRemoveFaceSetup = async () => {
        const confirmed = window.confirm(
            "Remove facial login setup? You can re-add it later from this profile page."
        );
        if (!confirmed) return;

        try {
            setFaceDeleteLoading(true);
            setFaceDeleteSuccess(null);
            setFaceError(null);
            await removeFaceLogin();
            setFaceLoginStatus(false);
            setFaceDeleteSuccess("Facial login setup removed successfully.");
        } catch (err) {
            console.error("Error removing facial login setup:", err);
            setFaceError(
                err.response?.data?.detail || err.message || "Failed to remove facial login setup."
            );
        } finally {
            setFaceDeleteLoading(false);
        }
    };

    useEffect(() => {
        if (tabValue === 1 && results.data.length === 0) {
            handleFetchResults({
                skip: 0,
                limit: 10,
                sort_by: "submitted_at",
                sort_order: "desc",
            });
        }
    }, [tabValue, handleFetchResults, results.data.length]);

    const handlePurchaseSubscription = (plan) => {
        setSelectedPlan(plan);
        setPaymentModalOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!selectedPlan) return;

        try {
            setPaymentLoading(true);
            setPaymentError(null);

            // Create order
            const orderData = await createSubscriptionOrder({
                plan: selectedPlan.id,
            });

            // Initialize Razorpay
            const options = {
                key:
                    import.meta.env.VITE_RAZORPAY_KEY_ID ||
                    import.meta.env.VITE_REACT_APP_RAZORPAY_KEY_ID ||
                    "rzp_test_your_key_here",
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Cognitive Wizard",
                description: `Subscription: ${selectedPlan.name}`,
                order_id: orderData.order_id,
                handler: async (response) => {
                    try {
                        // Confirm payment on backend
                        await confirmSubscriptionPayment({
                            plan: selectedPlan.id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        // Refresh user data to show updated subscription
                        await refreshUser();
                        setPaymentModalOpen(false);
                        setSelectedPlan(null);
                        alert("Subscription purchased successfully!");
                    } catch (err) {
                        console.error("Payment confirmation failed:", err);
                        setPaymentError("Payment confirmation failed. Please contact support.");
                    }
                },
                prefill: {
                    name: user?.full_name || "",
                    email: user?.email || "",
                },
                theme: {
                    color: "#7c3aed",
                },
            };

            if (!window.Razorpay) {
                throw new Error("Razorpay checkout script not loaded. Please ensure the Razorpay SDK is available.");
            }

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            console.error("Error creating subscription order:", err);
            setPaymentError(err.response?.data?.detail || "Failed to create payment order.");
        } finally {
            setPaymentLoading(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 6 }}>
            {/* TABS CONTAINER */}
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 4,
                    background: "rgba(22, 27, 39, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    backdropFilter: "blur(20px)",
                    mb: 4,
                }}
            >
                <Tabs
                    value={tabValue}
                    onChange={(event, newValue) => setTabValue(newValue)}
                    sx={{
                        px: 3,
                        py: 0.5,
                        "& .MuiTab-root": {
                            textTransform: "none",
                            fontWeight: 700,
                            color: "#94a3b8",
                            minHeight: 52,
                            "&.Mui-selected": {
                                color: "#06b6d4",
                            }
                        },
                        "& .MuiTabs-indicator": {
                            backgroundColor: "#06b6d4",
                        }
                    }}
                >
                    <Tab label="Account Details" icon={<Person />} iconPosition="start" />
                    <Tab
                        label={`Quiz History (${results.total || 0})`}
                        icon={<History />}
                        iconPosition="start"
                    />
                    <Tab label="Subscriptions" icon={<AdminPanelSettings />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* Account Details Tab */}
            <TabPanel value={tabValue} index={0}>
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 3, md: 5 },
                        borderRadius: 4,
                        background: "rgba(22, 27, 39, 0.95)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                        <Avatar
                            sx={{
                                width: 80,
                                height: 80,
                                background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                                mr: 2,
                                fontSize: '2rem',
                                fontWeight: 800,
                                border: "2px solid rgba(255, 255, 255, 0.15)",
                            }}
                        >
                            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                            <Typography
                                variant="overline"
                                sx={{
                                    color: '#06b6d4',
                                    fontWeight: 700,
                                    letterSpacing: 2,
                                }}
                            >
                                Profile
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: '#f1f5f9' }}>
                                Account details
                            </Typography>
                            <Chip
                                label={user?.role?.toUpperCase()}
                                icon={<AdminPanelSettings />}
                                variant="outlined"
                                sx={{
                                    fontWeight: 700,
                                    color: user?.role === 'admin' ? '#22d3ee' : '#a855f7',
                                    borderColor: user?.role === 'admin' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(168, 85, 247, 0.3)',
                                    backgroundColor: user?.role === 'admin' ? 'rgba(6, 182, 212, 0.06)' : 'rgba(168, 85, 247, 0.06)',
                                }}
                            />
                        </Box>
                    </Box>

                    <Divider sx={{ my: 3.5, borderColor: "rgba(255,255,255,0.08)" }} />

                    <Grid container spacing={4}>
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Email sx={{ mr: 1, color: '#a855f7' }} />
                                <Typography variant="subtitle2" fontWeight={700} color="#cbd5e1">
                                    Email Address
                                </Typography>
                            </Box>
                            <Typography variant="body1" sx={{ color: '#f1f5f9', fontWeight: 500 }}>
                                {user?.email}
                            </Typography>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Person sx={{ mr: 1, color: '#a855f7' }} />
                                <Typography variant="subtitle2" fontWeight={700} color="#cbd5e1">
                                    Full Name
                                </Typography>
                            </Box>
                            <Typography variant="body1" sx={{ color: '#f1f5f9', fontWeight: 500 }}>
                                {user?.full_name || "Not provided"}
                            </Typography>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <AdminPanelSettings sx={{ mr: 1, color: '#a855f7' }} />
                                <Typography variant="subtitle2" fontWeight={700} color="#cbd5e1">
                                    User Role
                                </Typography>
                            </Box>
                            <Typography variant="body1" sx={{ color: '#f1f5f9', fontWeight: 500, textTransform: "capitalize" }}>
                                {user?.role}
                            </Typography>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <SettingsEthernet sx={{ mr: 1, color: '#a855f7' }} />
                                <Typography variant="subtitle2" fontWeight={700} color="#cbd5e1">
                                    Phone Number
                                </Typography>
                            </Box>
                            <Typography variant="body1" sx={{ color: '#f1f5f9', fontWeight: 500 }}>
                                {user?.phone || "Not provided"}
                            </Typography>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Face2Outlined sx={{ mr: 1, color: '#a855f7' }} />
                                <Typography variant="subtitle2" fontWeight={700} color="#cbd5e1">
                                    Date of Birth
                                </Typography>
                            </Box>
                            <Typography variant="body1" sx={{ color: '#f1f5f9', fontWeight: 500 }}>
                                {user?.dob || "Not provided"}
                            </Typography>
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 4.5, borderColor: "rgba(255,255,255,0.08)" }} />

                    {/* Edit profile details */}
                    <Box sx={{ mb: 5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, color: "#f1f5f9" }}>
                            Edit Profile Details
                        </Typography>

                        {profileSuccess && (
                            <Alert severity="success" sx={{ mb: 3 }}>
                                {profileSuccess}
                            </Alert>
                        )}
                        {profileError && (
                            <Alert severity="error" sx={{ mb: 3 }}>
                                {profileError}
                            </Alert>
                        )}

                        <Paper
                            elevation={0}
                            sx={{
                                p: 4,
                                borderRadius: 3,
                                background: 'rgba(255, 255, 255, 0.01)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                            }}
                        >
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Email"
                                        type="email"
                                        value={user?.email || ""}
                                        disabled
                                        variant="outlined"
                                        sx={{
                                            "& .MuiOutlinedInput-root": {
                                                backgroundColor: "rgba(255,255,255,0.02)",
                                                "& fieldset": { borderColor: "rgba(255,255,255,0.05)" }
                                            }
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Full Name"
                                        type="text"
                                        value={profileForm.full_name}
                                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                                        variant="outlined"
                                        sx={{
                                            "& .MuiOutlinedInput-root": {
                                                backgroundColor: "rgba(255,255,255,0.02)",
                                                "& fieldset": { borderColor: "rgba(255,255,255,0.08)" }
                                            }
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Phone"
                                        type="tel"
                                        value={profileForm.phone}
                                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                        variant="outlined"
                                        sx={{
                                            "& .MuiOutlinedInput-root": {
                                                backgroundColor: "rgba(255,255,255,0.02)",
                                                "& fieldset": { borderColor: "rgba(255,255,255,0.08)" }
                                            }
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Date of birth"
                                        type="date"
                                        value={profileForm.dob || ""}
                                        onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                                        InputLabelProps={{ shrink: true }}
                                        variant="outlined"
                                        sx={{
                                            "& .MuiOutlinedInput-root": {
                                                backgroundColor: "rgba(255,255,255,0.02)",
                                                "& fieldset": { borderColor: "rgba(255,255,255,0.08)" }
                                            }
                                        }}
                                    />
                                </Grid>
                            </Grid>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 4 }}>
                                <Button
                                    variant="contained"
                                    onClick={handleSaveProfile}
                                    disabled={profileLoading}
                                    sx={{
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        px: 4.5,
                                        py: 1.25,
                                        fontWeight: 700,
                                        background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
                                        color: "#ffffff",
                                        "&:hover": {
                                            background: "linear-gradient(90deg, #6d28d9, #0891b2)"
                                        }
                                    }}
                                >
                                    {profileLoading ? 'Saving...' : 'Save changes'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={() => {
                                        setProfileSuccess(null);
                                        setProfileError(null);
                                        if (user) {
                                            setProfileForm({
                                                full_name: user.full_name || "",
                                                phone: user.phone || "",
                                                dob: user.dob || "",
                                            });
                                        }
                                    }}
                                    disabled={profileLoading}
                                    sx={{
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        px: 4.5,
                                        py: 1.25,
                                        fontWeight: 700,
                                        color: "#cbd5e1",
                                        borderColor: "rgba(255,255,255,0.12)",
                                        "&:hover": {
                                            borderColor: "rgba(255,255,255,0.25)",
                                            backgroundColor: "rgba(255,255,255,0.04)"
                                        }
                                    }}
                                >
                                    Cancel
                                </Button>
                            </Box>
                        </Paper>
                    </Box>

                    {/* Security Section */}
                    <Box sx={{ mb: 5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, color: "#f1f5f9" }}>
                            Security settings
                        </Typography>

                        <Paper
                            elevation={0}
                            sx={{
                                p: 4,
                                borderRadius: 3,
                                display: "flex",
                                flexDirection: { xs: "column", md: "row" },
                                alignItems: { xs: "flex-start", md: "center" },
                                justifyContent: "space-between",
                                gap: 3,
                                background: "rgba(255, 255, 255, 0.01)",
                                border: "1px solid rgba(255, 255, 255, 0.05)",
                            }}
                        >
                            <Box>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#f1f5f9" }}>
                                    Facial Recognition Login
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Secure your account using face recognition for instant, keyless logins.
                                </Typography>

                                <Chip
                                    label={
                                        faceLoading
                                            ? "Checking status..."
                                            : faceLoginStatus
                                                ? "Face Login Activated"
                                                : "Not Configured"
                                    }
                                    variant="outlined"
                                    sx={{
                                        mt: 2,
                                        fontWeight: 700,
                                        color: faceLoading ? "#93c5fd" : faceLoginStatus ? "#34d399" : "#fbbf24",
                                        borderColor: faceLoading ? "rgba(59, 130, 246, 0.25)" : faceLoginStatus ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)",
                                        backgroundColor: faceLoading ? "rgba(59, 130, 246, 0.06)" : faceLoginStatus ? "rgba(16, 185, 129, 0.06)" : "rgba(245, 158, 11, 0.06)",
                                    }}
                                />
                                {faceError && (
                                    <Alert severity="error" sx={{ mt: 3 }}>
                                        {faceError}
                                    </Alert>
                                )}
                                {faceDeleteSuccess && (
                                    <Alert severity="success" sx={{ mt: 3 }}>
                                        {faceDeleteSuccess}
                                    </Alert>
                                )}
                            </Box>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                <Button
                                    variant="contained"
                                    onClick={() => navigate("/face-register")}
                                    sx={{
                                        borderRadius: 2,
                                        textTransform: "none",
                                        fontWeight: 700,
                                        px: 3,
                                        py: 1.25,
                                        background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
                                        color: "#ffffff",
                                        "&:hover": {
                                            background: "linear-gradient(90deg, #6d28d9, #0891b2)"
                                        }
                                    }}
                                >
                                    {faceLoginStatus ? "Re-configure Face" : "Setup Face Login"}
                                </Button>
                                {faceLoginStatus && !faceLoading ? (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={handleRemoveFaceSetup}
                                        disabled={faceDeleteLoading}
                                        sx={{
                                            borderRadius: 2,
                                            textTransform: "none",
                                            fontWeight: 700,
                                            px: 3,
                                            py: 1.25,
                                            borderColor: "rgba(239, 68, 68, 0.4)",
                                            color: "#fca5a5",
                                            "&:hover": {
                                                borderColor: "#ef4444",
                                                backgroundColor: "rgba(239, 68, 68, 0.06)"
                                            }
                                        }}
                                    >
                                        {faceDeleteLoading ? "Removing..." : "Remove Face Setup"}
                                    </Button>
                                ) : null}
                            </Box>
                        </Paper>
                    </Box>

                    {/* Danger Zone */}
                    <Box>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 800,
                                mb: 3,
                                color: "#ef4444",
                            }}
                        >
                            Danger Zone
                        </Typography>

                        <Paper
                            elevation={0}
                            sx={{
                                p: 4,
                                borderRadius: 3,
                                display: "flex",
                                flexDirection: { xs: "column", md: "row" },
                                alignItems: { xs: "flex-start", md: "center" },
                                justifyContent: "space-between",
                                gap: 3,
                                background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.02) 100%)",
                                border: "1px solid rgba(239, 68, 68, 0.25)",
                            }}
                        >
                            <Box>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#fca5a5" }}>
                                    Delete Account Permanent
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#e2e8f0', mt: 0.5 }}>
                                    This will delete your credentials, facial bio, quiz milestones, and document index databases permanently.
                                </Typography>
                            </Box>

                            <Button
                                variant="contained"
                                color="error"
                                startIcon={<Delete />}
                                onClick={() => setDeleteModalOpen(true)}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: "none",
                                    fontWeight: 700,
                                    px: 3.5,
                                    py: 1.25,
                                    backgroundColor: "#ef4444",
                                    color: "#ffffff",
                                    "&:hover": {
                                        backgroundColor: "#dc2626",
                                    }
                                }}
                            >
                                Delete Profile
                            </Button>
                        </Paper>
                    </Box>
                </Paper>
            </TabPanel>

            {/* Quiz History Tab */}
            <TabPanel value={tabValue} index={1}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <QuizResultsHistory
                    results={results}
                    loading={loading}
                    onFetchResults={handleFetchResults}
                    onViewDetails={handleViewQuizDetails}
                />
            </TabPanel>

            {/* Subscription plans */}
            <TabPanel value={tabValue} index={2}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3.5, color: "#f1f5f9" }}>
                    Select Subscription Plan
                </Typography>
                {subscriptionError && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {subscriptionError}
                    </Alert>
                )}
                {subscriptionLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                        <CircularProgress color="secondary" />
                    </Box>
                ) : (
                    <Grid container spacing={4}>
                        {subscriptionPlans.map((plan) => {
                            const isCurrent = user?.subscription_plan === plan.id;
                            return (
                                <Grid item xs={12} md={4} key={plan.id}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 4,
                                            textAlign: "center",
                                            borderRadius: 4,
                                            background: isCurrent ? "rgba(6, 182, 212, 0.05)" : "rgba(255, 255, 255, 0.02)",
                                            border: isCurrent ? "2.5px solid #06b6d4" : "1px solid rgba(255, 255, 255, 0.08)",
                                            boxShadow: isCurrent ? "0 0 24px rgba(6, 182, 212, 0.15)" : "none",
                                            position: "relative",
                                        }}
                                    >
                                        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: "#f1f5f9" }}>
                                            {plan.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 40 }}>
                                            {plan.description}
                                        </Typography>
                                        <Typography variant="h3" sx={{ fontWeight: 900, color: "#06b6d4", mb: 0.5 }}>
                                            ₹ {plan.amount_inr}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5 }}>
                                            per month
                                        </Typography>
                                        
                                        <Divider sx={{ my: 2.5, borderColor: "rgba(255,255,255,0.06)" }} />

                                        <Typography variant="body2" sx={{ mb: 3.5, color: "#cbd5e1", fontWeight: 600 }}>
                                            Daily Limit: {plan.daily_chat_limit} chat sessions
                                        </Typography>

                                        {isCurrent ? (
                                            <Chip 
                                                label="Active Plan" 
                                                icon={<CheckCircle style={{ color: "#ffffff" }} />}
                                                sx={{ 
                                                    fontWeight: 700, 
                                                    backgroundColor: "#06b6d4", 
                                                    color: "#ffffff",
                                                    px: 1.5
                                                }} 
                                            />
                                        ) : (
                                            <Button
                                                variant="contained"
                                                fullWidth
                                                onClick={() => handlePurchaseSubscription(plan)}
                                                sx={{ 
                                                    mt: 2, 
                                                    py: 1.25, 
                                                    fontWeight: 700,
                                                    borderRadius: 2.5,
                                                    background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
                                                    color: "#ffffff",
                                                    "&:hover": {
                                                        background: "linear-gradient(90deg, #6d28d9, #0891b2)"
                                                    }
                                                }}
                                            >
                                                Subscribe Now
                                            </Button>
                                        )}
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}
            </TabPanel>

            {/* Quiz detail Dialog */}
            <Dialog
                open={detailOpen}
                onClose={() => {
                    setDetailOpen(false);
                    setSelectedQuizDetail(null);
                }}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: "#161b27",
                        backgroundImage: "none",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: 3,
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#f1f5f9" }}>Quiz Attempt Details</DialogTitle>
                <DialogContent>
                    {detailLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                            <CircularProgress color="secondary" />
                        </Box>
                    ) : selectedQuizDetail ? (
                        <Box sx={{ pt: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: "#f1f5f9" }}>
                                {selectedQuizDetail.quiz_topic}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 3, color: "#cbd5e1", fontWeight: 500 }}>
                                Score: {selectedQuizDetail.score_percentage}% ({selectedQuizDetail.correct_answers}/
                                {selectedQuizDetail.total_questions}) | Time Taken: {formatDuration(selectedQuizDetail.time_taken)} / {formatDuration(selectedQuizDetail.time_limit_seconds)}
                            </Typography>
                            <Divider sx={{ mb: 3, borderColor: "rgba(255,255,255,0.08)" }} />
                            {selectedQuizDetail.feedback?.map((item, index) => (
                                <Paper
                                    key={`${item.question_id}-${index}`}
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        mb: 2,
                                        borderRadius: 2.5,
                                        border: "1px solid",
                                        borderColor: item.is_correct ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)",
                                        background: item.is_correct ? "rgba(16, 185, 129, 0.04)" : "rgba(245, 158, 11, 0.04)",
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "#f1f5f9" }}>
                                        Q{index + 1}. {item.question}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: item.is_correct ? "#6ee7b7" : "#fca5a5", mb: 0.5 }}>
                                        Your answer: {item.selected_option || "Not answered"}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "#6ee7b7" }}>
                                        Correct answer: {item.correct_answer}
                                    </Typography>
                                </Paper>
                            ))}
                        </Box>
                    ) : (
                        <Alert severity="info" sx={{ mt: 1 }}>No details found for this quiz.</Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button
                        onClick={() => {
                            setDetailOpen(false);
                            setSelectedQuizDetail(null);
                        }}
                        variant="outlined"
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 700,
                            color: "#cbd5e1",
                            borderColor: "rgba(255,255,255,0.12)",
                            "&:hover": {
                                borderColor: "rgba(255,255,255,0.25)",
                                backgroundColor: "rgba(255,255,255,0.04)"
                            }
                        }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Profile Confirmation Dialog */}
            <Dialog
                open={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setDeletePassword("");
                    setDeleteError(null);
                }}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: "#161b27",
                        backgroundImage: "none",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: 3,
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, pb: 1, color: "#fca5a5" }}>
                    Confirm Delete Profile
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Alert 
                        severity="error" 
                        sx={{ 
                            mb: 3,
                            bgcolor: "rgba(239, 68, 68, 0.08)",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            color: "#fca5a5",
                            "& .MuiAlert-icon": { color: "#f87171" }
                        }}
                    >
                        <Typography variant="body2" fontWeight={700}>
                            <WarningAmber fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                            This action is permanent and irreversible!
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 500 }}>
                            Deleting your profile will:
                        </Typography>
                        <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2, fontWeight: 500 }}>
                            <li>Remove your login account permanently</li>
                            <li>Delete facial bio template metadata</li>
                            <li>Wipe quiz result archives</li>
                            <li>Delete all uploaded files & embeddings</li>
                        </Typography>
                    </Alert>

                    <Typography variant="body2" sx={{ mb: 2, color: "#cbd5e1", fontWeight: 600 }}>
                        Enter your password to verify your identity:
                    </Typography>

                    <TextField
                        fullWidth
                        type="password"
                        label="Confirm Password"
                        placeholder="Enter password to confirm"
                        value={deletePassword}
                        onChange={(e) => {
                            setDeletePassword(e.target.value);
                            if (deleteError) setDeleteError(null);
                        }}
                        error={!!deleteError}
                        helperText={deleteError}
                        disabled={deleteLoading}
                        sx={{
                            mb: 1,
                            "& .MuiOutlinedInput-root": {
                                backgroundColor: "rgba(255,255,255,0.02)",
                                "& fieldset": { borderColor: "rgba(255,255,255,0.08)" }
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2.5, pt: 0 }}>
                    <Button
                        onClick={() => {
                            setDeleteModalOpen(false);
                            setDeletePassword("");
                            setDeleteError(null);
                        }}
                        disabled={deleteLoading}
                        variant="outlined"
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 700,
                            color: "#cbd5e1",
                            borderColor: "rgba(255,255,255,0.12)",
                            "&:hover": {
                                borderColor: "rgba(255,255,255,0.25)",
                                backgroundColor: "rgba(255,255,255,0.04)"
                            }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteProfile}
                        color="error"
                        variant="contained"
                        disabled={deleteLoading || !deletePassword.trim()}
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 700,
                            px: 3,
                            backgroundColor: "#ef4444",
                            color: "#ffffff",
                            "&:hover": {
                                backgroundColor: "#dc2626",
                            }
                        }}
                    >
                        {deleteLoading ? (
                            <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                        ) : null}
                        {deleteLoading ? "Deleting..." : "Permanently Delete"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Subscription Confirm Dialog */}
            <Dialog
                open={paymentModalOpen}
                onClose={() => {
                    setPaymentModalOpen(false);
                    setSelectedPlan(null);
                    setPaymentError(null);
                }}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: "#161b27",
                        backgroundImage: "none",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: 3,
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#f1f5f9" }}>
                    Confirm Subscription Order
                </DialogTitle>
                <DialogContent>
                    {selectedPlan && (
                        <Box sx={{ pt: 1 }}>
                            <Typography variant="h6" sx={{ color: "#f1f5f9", fontWeight: 800 }} gutterBottom>
                                {selectedPlan.name} Plan
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 1, color: "#cbd5e1", fontWeight: 600 }}>
                                Amount: ₹ {selectedPlan.amount_inr}
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 2, color: "#cbd5e1", fontWeight: 600 }}>
                                Daily Limit: {selectedPlan.daily_chat_limit} chat sessions
                            </Typography>
                            {paymentError && (
                                <Alert severity="error" sx={{ mb: 2.5 }}>
                                    {paymentError}
                                </Alert>
                            )}
                            <Typography variant="body2" color="text.secondary">
                                You will be redirected to Razorpay checkout to finish payment processing.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button
                        onClick={() => {
                            setPaymentModalOpen(false);
                            setSelectedPlan(null);
                            setPaymentError(null);
                        }}
                        disabled={paymentLoading}
                        variant="outlined"
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 700,
                            color: "#cbd5e1",
                            borderColor: "rgba(255,255,255,0.12)",
                            "&:hover": {
                                borderColor: "rgba(255,255,255,0.25)",
                                backgroundColor: "rgba(255,255,255,0.04)"
                            }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmPayment}
                        variant="contained"
                        disabled={paymentLoading}
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 700,
                            px: 3.5,
                            background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
                            color: "#ffffff",
                            "&:hover": {
                                background: "linear-gradient(90deg, #6d28d9, #0891b2)"
                            }
                        }}
                    >
                        {paymentLoading ? (
                            <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                        ) : null}
                        {paymentLoading ? "Processing..." : "Pay Now"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
