import { useCallback } from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
    getQuizResults,
    deleteProfile,
    getQuizResultDetail,
    getSubscriptionPlans,
    createSubscriptionOrder,
    confirmSubscriptionPayment,
    getSubscriptionStatus,
    cancelSubscription,
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
    LinearProgress,
    Tooltip,
} from "@mui/material";
import {
    Person,
    Email,
    AdminPanelSettings,
    History,
    Delete,
    WarningAmber,
    SettingsEthernet,
    CheckCircle,
    Close,
    AccessTime,
    Cancel,
    Face2Outlined,
} from "@mui/icons-material";

/* ─── Teal Palette Constants ─────────────────────────────── */
const T = {
    bg:           "#F5F9FF",
    surface:      "rgba(255,255,255,0.88)",
    surfaceSolid: "#ffffff",
    border:       "rgba(20, 140, 255,0.14)",
    borderStrong: "rgba(20, 140, 255,0.28)",
    borderWhite:  "rgba(255,255,255,0.88)",
    text:         "#07152E",
    textLight:    "#4D6486",
    muted:        "#7187A9",
    primary:      "#148CFF",
    primaryDark:  "#0666D9",
    primaryLight: "#1ED9F2",
    accent:       "#7655F6",
    cyan:         "#1ED9F2",
    shadow:       "0 12px 40px rgba(20, 140, 255,0.09)",
    shadowLg:     "0 20px 60px rgba(20, 140, 255,0.12)",
};

/* ─── Shared sx helpers ──────────────────────────────────── */
const glassCard = {
    background: T.surface,
    backdropFilter: "blur(24px)",
    border: `1px solid ${T.borderWhite}`,
    outline: `1px solid ${T.border}`,
    boxShadow: T.shadow,
    backgroundImage: "none",
};

const tealGradientBtn = {
    borderRadius: 2.5,
    textTransform: "none",
    fontWeight: 700,
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
    color: "#fff",
    boxShadow: "0 4px 14px rgba(20, 140, 255,0.28)",
    position: "relative",
    overflow: "hidden",
    "&:hover": {
        background: `linear-gradient(135deg, #148CFF, ${T.primaryDark})`,
        boxShadow: "0 8px 24px rgba(20, 140, 255,0.40)",
        transform: "translateY(-1px)",
    },
    "&:disabled": {
        background: "rgba(20, 140, 255,0.18)",
        color: "rgba(255,255,255,0.6)",
        boxShadow: "none",
    },
};

const outlinedBtn = {
    borderRadius: 2.5,
    textTransform: "none",
    fontWeight: 700,
    color: T.textLight,
    borderColor: T.border,
    "&:hover": {
        borderColor: T.primary,
        color: T.primary,
        background: "rgba(20, 140, 255,0.05)",
    },
};

/* ─── Tab panel ──────────────────────────────────────────── */
function TabPanel({ children, value, index, ...other }) {
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

/* ─── Info Row ───────────────────────────────────────────── */
function InfoRow({ icon, label, value }) {
    return (
        <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}>
                <Box
                    sx={{
                        display: "inline-flex",
                        p: 0.7,
                        borderRadius: 1.5,
                        background: "rgba(20, 140, 255,0.08)",
                        border: "1px solid rgba(20, 140, 255,0.16)",
                        color: T.primary,
                        fontSize: 18,
                    }}
                >
                    {icon}
                </Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: T.textLight }}>
                    {label}
                </Typography>
            </Box>
            <Typography variant="body1" sx={{ color: T.text, fontWeight: 600, pl: 0.5 }}>
                {value}
            </Typography>
        </Grid>
    );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function Profile() {
    const navigate = useNavigate();
    const { user, logout, refreshUser } = useAuth();
    const [tabValue, setTabValue] = useState(0);
    const [results, setResults] = useState({ data: [], total: 0, pages: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedQuizDetail, setSelectedQuizDetail] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    /* Delete profile */
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    /* Profile edit */
    const [profileForm, setProfileForm] = useState({
        full_name: user?.full_name || "",
        phone: user?.phone || "",
        dob: user?.dob || "",
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState(null);
    const [profileSuccess, setProfileSuccess] = useState(null);

    /* Subscription */
    const [subscriptionPlans, setSubscriptionPlans] = useState([]);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);
    const [subscriptionError, setSubscriptionError] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentError, setPaymentError] = useState(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [cancelError, setCancelError] = useState(null);
    const [cancelSuccess, setCancelSuccess] = useState(null);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

    /* ── helpers ── */
    const formatDuration = (seconds) => {
        if (seconds === null || seconds === undefined) return "N/A";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    /* ── data fetchers ── */
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
            setDeleteModalOpen(false);
            setDeletePassword("");
            await new Promise((resolve) => setTimeout(resolve, 500));
            await logout();
            navigate("/login", {
                state: { message: "Your profile has been successfully deleted" },
            });
        } catch (err) {
            console.error("Error deleting profile:", err);
            setDeleteError("Failed to delete profile, Invalid password.");
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

    const loadSubscriptionPlans = useCallback(async () => {
        try {
            setSubscriptionLoading(true);
            setSubscriptionError(null);
            const [plans, status] = await Promise.all([
                getSubscriptionPlans(),
                getSubscriptionStatus().catch(() => null),
            ]);
            setSubscriptionPlans(plans);
            setSubscriptionStatus(status);
        } catch (err) {
            console.error("Error fetching subscription plans:", err);
            setSubscriptionError("Unable to load subscription plans.");
        } finally {
            setSubscriptionLoading(false);
        }
    }, []);

    const handleCancelSubscription = async () => {
        try {
            setCancelLoading(true);
            setCancelError(null);
            setCancelSuccess(null);
            await cancelSubscription();
            await refreshUser();
            const status = await getSubscriptionStatus().catch(() => null);
            setSubscriptionStatus(status);
            setCancelSuccess("Your subscription has been cancelled. You are now on the free tier.");
            setCancelConfirmOpen(false);
        } catch (err) {
            console.error("Error cancelling subscription:", err);
            setCancelError(err?.message || "Failed to cancel subscription. Please try again.");
        } finally {
            setCancelLoading(false);
        }
    };

    const handlePurchaseSubscription = (plan) => {
        setSelectedPlan(plan);
        setPaymentModalOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!selectedPlan) return;
        try {
            setPaymentLoading(true);
            setPaymentError(null);
            const orderData = await createSubscriptionOrder({ plan: selectedPlan.id });
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
                        await confirmSubscriptionPayment({
                            plan: selectedPlan.id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        await refreshUser();
                        const newStatus = await getSubscriptionStatus().catch(() => null);
                        setSubscriptionStatus(newStatus);
                        setPaymentModalOpen(false);
                        setSelectedPlan(null);
                    } catch (err) {
                        console.error("Payment confirmation failed:", err);
                        setPaymentError("Payment confirmation failed. Please contact support.");
                    }
                },
                prefill: { name: user?.full_name || "", email: user?.email || "" },
                theme: { color: "#148CFF" },
            };
            if (!window.Razorpay) {
                throw new Error("Razorpay checkout script not loaded.");
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

    /* ── effects ── */
    useEffect(() => { if (user) loadSubscriptionPlans(); }, [user, loadSubscriptionPlans]);

    useEffect(() => {
        if (user) {
            setProfileForm({
                full_name: user.full_name || "",
                phone: user.phone || "",
                dob: user.dob || "",
            });
        }
    }, [user]);

    useEffect(() => {
        if (tabValue === 1 && results.data.length === 0) {
            handleFetchResults({ skip: 0, limit: 10, sort_by: "submitted_at", sort_order: "desc" });
        }
    }, [tabValue, handleFetchResults, results.data.length]);

    /* ════════════════════════════════════ RENDER ══════════════════════════════ */
    return (
        <Container maxWidth="lg" sx={{ py: 6, position: "relative", zIndex: 1 }}>

            {/* ── Page Hero ── */}
            <Box sx={{ mb: 4, display: "flex", alignItems: "center", gap: 3 }}>
                <Avatar
                    sx={{
                        width: 64,
                        height: 64,
                        background: `linear-gradient(135deg, ${T.primary}, ${T.cyan})`,
                        fontSize: "1.6rem",
                        fontWeight: 800,
                        border: `3px solid rgba(255,255,255,0.9)`,
                        boxShadow: "0 4px 16px rgba(20, 140, 255,0.22)",
                    }}
                >
                    {user?.full_name
                        ? user.full_name.charAt(0).toUpperCase()
                        : user?.email?.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                    <Typography
                        variant="overline"
                        sx={{
                            color: T.primary,
                            fontWeight: 700,
                            letterSpacing: 2,
                            display: "block",
                        }}
                    >
                        My Account
                    </Typography>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 900,
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            letterSpacing: "-0.02em",
                            color: T.text,
                        }}
                    >
                        {user?.full_name || user?.email?.split("@")[0] || "Profile"}
                    </Typography>
                </Box>
            </Box>

            {/* ── TABS HEADER ── */}
            <Paper
                elevation={0}
                sx={{
                    ...glassCard,
                    borderRadius: 3,
                    mb: 3,
                }}
            >
                <Tabs
                    value={tabValue}
                    onChange={(_, v) => setTabValue(v)}
                    sx={{
                        px: 2,
                        py: 0.5,
                        "& .MuiTab-root": {
                            textTransform: "none",
                            fontWeight: 700,
                            color: T.muted,
                            minHeight: 52,
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            "&.Mui-selected": { color: T.primary },
                        },
                        "& .MuiTabs-indicator": {
                            backgroundColor: T.primary,
                            height: 3,
                            borderRadius: "3px 3px 0 0",
                        },
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

            {/* ════════════ TAB 0 — Account Details ════════════ */}
            <TabPanel value={tabValue} index={0}>
                <Paper elevation={0} sx={{ ...glassCard, borderRadius: 4, p: { xs: 3, md: 5 } }}>

                    {/* Profile Header Row */}
                    <Box sx={{ display: "flex", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
                        <Avatar
                            sx={{
                                width: 80,
                                height: 80,
                                background: `linear-gradient(135deg, ${T.primary}, ${T.cyan})`,
                                mr: 2,
                                fontSize: "2rem",
                                fontWeight: 800,
                                border: `3px solid rgba(255,255,255,0.9)`,
                                boxShadow: "0 6px 20px rgba(20, 140, 255,0.20)",
                            }}
                        >
                            {user?.full_name
                                ? user.full_name.charAt(0).toUpperCase()
                                : user?.email?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                            <Typography
                                variant="overline"
                                sx={{ color: T.primary, fontWeight: 700, letterSpacing: 2 }}
                            >
                                Profile
                            </Typography>
                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 800,
                                    mb: 1,
                                    color: T.text,
                                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                                }}
                            >
                                Account Details
                            </Typography>
                            <Chip
                                label={user?.role?.toUpperCase()}
                                icon={<AdminPanelSettings />}
                                variant="outlined"
                                sx={{
                                    fontWeight: 700,
                                    color: user?.role === "admin" ? T.cyan : T.primary,
                                    borderColor:
                                        user?.role === "admin"
                                            ? "rgba(30, 217, 242,0.35)"
                                            : "rgba(20, 140, 255,0.35)",
                                    backgroundColor:
                                        user?.role === "admin"
                                            ? "rgba(30, 217, 242,0.08)"
                                            : "rgba(20, 140, 255,0.08)",
                                }}
                            />
                        </Box>
                    </Box>

                    <Divider sx={{ my: 3.5, borderColor: T.border }} />

                    {/* Info Grid */}
                    <Grid container spacing={3}>
                        <InfoRow
                            icon={<Email fontSize="inherit" />}
                            label="Email Address"
                            value={user?.email}
                        />
                        <InfoRow
                            icon={<Person fontSize="inherit" />}
                            label="Full Name"
                            value={user?.full_name || "Not provided"}
                        />
                        <InfoRow
                            icon={<AdminPanelSettings fontSize="inherit" />}
                            label="User Role"
                            value={user?.role}
                        />
                        <InfoRow
                            icon={<SettingsEthernet fontSize="inherit" />}
                            label="Phone Number"
                            value={user?.phone || "Not provided"}
                        />
                        <InfoRow
                            icon={<Face2Outlined fontSize="inherit" />}
                            label="Date of Birth"
                            value={user?.dob || "Not provided"}
                        />
                    </Grid>

                    <Divider sx={{ my: 4.5, borderColor: T.border }} />

                    {/* ── Edit Profile ── */}
                    <Box sx={{ mb: 5 }}>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 800,
                                mb: 3,
                                color: T.text,
                                fontFamily: '"Plus Jakarta Sans", sans-serif',
                            }}
                        >
                            Edit Profile Details
                        </Typography>

                        {profileSuccess && (
                            <Alert
                                severity="success"
                                sx={{
                                    mb: 3,
                                    bgcolor: "rgba(20, 140, 255,0.08)",
                                    border: "1px solid rgba(20, 140, 255,0.24)",
                                    color: T.primary,
                                    "& .MuiAlert-icon": { color: T.primary },
                                    borderRadius: 2,
                                }}
                            >
                                {profileSuccess}
                            </Alert>
                        )}
                        {profileError && (
                            <Alert
                                severity="error"
                                sx={{
                                    mb: 3,
                                    bgcolor: "rgba(239,68,68,0.07)",
                                    border: "1px solid rgba(239,68,68,0.22)",
                                    borderRadius: 2,
                                }}
                            >
                                {profileError}
                            </Alert>
                        )}

                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 3, md: 4 },
                                borderRadius: 3,
                                background: "rgba(245,249,255,0.76)",
                                border: `1px solid ${T.border}`,
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
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Full Name"
                                        type="text"
                                        value={profileForm.full_name}
                                        onChange={(e) =>
                                            setProfileForm({ ...profileForm, full_name: e.target.value })
                                        }
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Phone"
                                        type="tel"
                                        value={profileForm.phone}
                                        onChange={(e) =>
                                            setProfileForm({ ...profileForm, phone: e.target.value })
                                        }
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Date of Birth"
                                        type="date"
                                        value={profileForm.dob || ""}
                                        onChange={(e) =>
                                            setProfileForm({ ...profileForm, dob: e.target.value })
                                        }
                                        InputLabelProps={{ shrink: true }}
                                        variant="outlined"
                                    />
                                </Grid>
                            </Grid>
                            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 4 }}>
                                <Button
                                    variant="contained"
                                    onClick={handleSaveProfile}
                                    disabled={profileLoading}
                                    sx={{ ...tealGradientBtn, px: 4.5, py: 1.25 }}
                                >
                                    {profileLoading ? "Saving…" : "Save Changes"}
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
                                    sx={{ ...outlinedBtn, px: 4.5, py: 1.25 }}
                                >
                                    Cancel
                                </Button>
                            </Box>
                        </Paper>
                    </Box>

                    {/* ── Danger Zone ── */}
                    <Box>
                        <Typography
                            variant="h6"
                            sx={{ fontWeight: 800, mb: 3, color: "#dc2626", fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                        >
                            Danger Zone
                        </Typography>
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 3, md: 4 },
                                borderRadius: 3,
                                display: "flex",
                                flexDirection: { xs: "column", md: "row" },
                                alignItems: { xs: "flex-start", md: "center" },
                                justifyContent: "space-between",
                                gap: 3,
                                background: "linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(220,38,38,0.02) 100%)",
                                border: "1px solid rgba(239,68,68,0.22)",
                            }}
                        >
                            <Box>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#b91c1c" }}>
                                    Delete Account Permanently
                                </Typography>
                                <Typography variant="body2" sx={{ color: T.textLight, mt: 0.5 }}>
                                    This will delete your credentials, quiz milestones, and document index databases permanently.
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                color="error"
                                startIcon={<Delete />}
                                onClick={() => setDeleteModalOpen(true)}
                                sx={{
                                    borderRadius: 2.5,
                                    textTransform: "none",
                                    fontWeight: 700,
                                    px: 3.5,
                                    py: 1.25,
                                    backgroundColor: "#ef4444",
                                    "&:hover": { backgroundColor: "#dc2626" },
                                }}
                            >
                                Delete Profile
                            </Button>
                        </Paper>
                    </Box>
                </Paper>
            </TabPanel>

            {/* ════════════ TAB 1 — Quiz History ════════════ */}
            <TabPanel value={tabValue} index={1}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
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

            {/* ════════════ TAB 2 — Subscriptions ════════════ */}
            <TabPanel value={tabValue} index={2}>
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 800,
                        mb: 1,
                        color: T.text,
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                    }}
                >
                    Subscription Plans
                </Typography>
                <Typography variant="body2" sx={{ color: T.textLight, mb: 3.5 }}>
                    Upgrade your plan to increase your daily chat limit.
                </Typography>

                {subscriptionError && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                        {subscriptionError}
                    </Alert>
                )}
                {cancelSuccess && (
                    <Alert
                        severity="success"
                        sx={{
                            mb: 3,
                            borderRadius: 2,
                            bgcolor: "rgba(20, 140, 255,0.08)",
                            border: "1px solid rgba(20, 140, 255,0.22)",
                            color: T.primary,
                        }}
                        onClose={() => setCancelSuccess(null)}
                    >
                        {cancelSuccess}
                    </Alert>
                )}
                {cancelError && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setCancelError(null)}>
                        {cancelError}
                    </Alert>
                )}

                {subscriptionLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                        <CircularProgress sx={{ color: T.primary }} />
                    </Box>
                ) : (
                    <>
                        {/* ── Active Subscription Card ── */}
                        {user?.subscribed && subscriptionStatus && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    mb: 4,
                                    borderRadius: 4,
                                    background: "rgba(20, 140, 255,0.05)",
                                    border: `1.5px solid ${T.borderStrong}`,
                                    boxShadow: "0 0 24px rgba(20, 140, 255,0.10)",
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexWrap: "wrap",
                                        gap: 2,
                                    }}
                                >
                                    {/* Left: plan name + dates */}
                                    <Box>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                            <CheckCircle sx={{ color: T.primary, fontSize: 20 }} />
                                            <Typography
                                                variant="subtitle1"
                                                sx={{
                                                    fontWeight: 800,
                                                    color: T.text,
                                                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                                                }}
                                            >
                                                Active Plan:{" "}
                                                {user.subscription_plan?.charAt(0).toUpperCase() +
                                                    user.subscription_plan?.slice(1)}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" sx={{ color: T.textLight }}>
                                            Purchased:{" "}
                                            <strong style={{ color: T.text }}>
                                                {subscriptionStatus.subscription_started_at
                                                    ? new Date(
                                                          subscriptionStatus.subscription_started_at
                                                      ).toLocaleDateString("en-IN", {
                                                          day: "numeric",
                                                          month: "long",
                                                          year: "numeric",
                                                      })
                                                    : "—"}
                                            </strong>
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: T.textLight, mt: 0.4 }}>
                                            Expires:{" "}
                                            <strong style={{ color: T.text }}>
                                                {subscriptionStatus.subscription_expires_at
                                                    ? new Date(
                                                          subscriptionStatus.subscription_expires_at
                                                      ).toLocaleDateString("en-IN", {
                                                          day: "numeric",
                                                          month: "long",
                                                          year: "numeric",
                                                      })
                                                    : "—"}
                                            </strong>
                                        </Typography>
                                    </Box>

                                    {/* Right: days remaining */}
                                    <Box sx={{ textAlign: "center", minWidth: 120 }}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 0.5,
                                                justifyContent: "center",
                                                mb: 0.5,
                                            }}
                                        >
                                            <AccessTime
                                                sx={{
                                                    fontSize: 16,
                                                    color:
                                                        subscriptionStatus.days_left <= 5
                                                            ? subscriptionStatus.days_left <= 1
                                                                ? "#ef4444"
                                                                : "#7655F6"
                                                            : T.primary,
                                                }}
                                            />
                                            <Typography
                                                variant="h5"
                                                sx={{
                                                    fontWeight: 900,
                                                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                                                    color:
                                                        subscriptionStatus.days_left <= 5
                                                            ? subscriptionStatus.days_left <= 1
                                                                ? "#ef4444"
                                                                : "#7655F6"
                                                            : T.primary,
                                                }}
                                            >
                                                {subscriptionStatus.days_left ?? 0}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" sx={{ color: T.muted }}>
                                            day{subscriptionStatus.days_left !== 1 ? "s" : ""} left
                                        </Typography>
                                        <Tooltip
                                            title={`${subscriptionStatus.days_left} of 30 days remaining`}
                                        >
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min(
                                                    100,
                                                    ((subscriptionStatus.days_left ?? 0) / 30) * 100
                                                )}
                                                sx={{
                                                    mt: 1,
                                                    height: 6,
                                                    borderRadius: 3,
                                                    backgroundColor: "rgba(20, 140, 255,0.10)",
                                                    "& .MuiLinearProgress-bar": {
                                                        borderRadius: 3,
                                                        backgroundColor:
                                                            subscriptionStatus.days_left <= 5
                                                                ? subscriptionStatus.days_left <= 1
                                                                    ? "#ef4444"
                                                                    : "#7655F6"
                                                                : T.primary,
                                                    },
                                                }}
                                            />
                                        </Tooltip>
                                    </Box>
                                </Box>

                                {/* Expiry warning */}
                                {subscriptionStatus.days_left !== null &&
                                    subscriptionStatus.days_left <= 5 && (
                                        <Alert
                                            severity={
                                                subscriptionStatus.days_left <= 1 ? "error" : "warning"
                                            }
                                            icon={<AccessTime />}
                                            sx={{ mt: 2, borderRadius: 2 }}
                                        >
                                            {subscriptionStatus.days_left <= 1
                                                ? "Your subscription expires today! Renew now to avoid losing access."
                                                : `Your subscription expires in ${subscriptionStatus.days_left} days. Renew before it lapses.`}
                                        </Alert>
                                    )}

                                {/* Cancel button */}
                                <Box sx={{ mt: 2.5, display: "flex", justifyContent: "flex-end" }}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<Cancel />}
                                        onClick={() => setCancelConfirmOpen(true)}
                                        sx={{
                                            color: "#ef4444",
                                            borderColor: "rgba(239,68,68,0.35)",
                                            fontWeight: 700,
                                            textTransform: "none",
                                            borderRadius: 2,
                                            "&:hover": {
                                                borderColor: "#ef4444",
                                                background: "rgba(239,68,68,0.06)",
                                            },
                                        }}
                                    >
                                        Cancel Subscription
                                    </Button>
                                </Box>
                            </Paper>
                        )}

                        {/* ── Plan Cards ── */}
                        <Grid container spacing={3}>
                            {subscriptionPlans.map((plan) => {
                                const isCurrent = user?.subscription_plan === plan.id;
                                const isSubscribed = !!user?.subscribed;

                                return (
                                    <Grid item xs={12} md={4} key={plan.id}>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 4,
                                                textAlign: "center",
                                                borderRadius: 4,
                                                height: "100%",
                                                background: isCurrent
                                                    ? "rgba(20, 140, 255,0.06)"
                                                    : T.surface,
                                                border: isCurrent
                                                    ? `2px solid ${T.primary}`
                                                    : `1px solid ${T.borderWhite}`,
                                                outline: isCurrent
                                                    ? `1px solid ${T.borderStrong}`
                                                    : `1px solid ${T.border}`,
                                                boxShadow: isCurrent
                                                    ? `0 0 28px rgba(20, 140, 255,0.16), ${T.shadow}`
                                                    : T.shadow,
                                                opacity: isSubscribed && !isCurrent ? 0.65 : 1,
                                                position: "relative",
                                                transition: "all 0.25s ease",
                                                "&:hover": !isSubscribed
                                                    ? {
                                                          transform: "translateY(-4px)",
                                                          boxShadow: T.shadowLg,
                                                          border: `1.5px solid ${T.primary}`,
                                                      }
                                                    : {},
                                            }}
                                        >
                                            {isCurrent && (
                                                <Chip
                                                    label="Current"
                                                    size="small"
                                                    sx={{
                                                        position: "absolute",
                                                        top: 16,
                                                        right: 16,
                                                        fontWeight: 700,
                                                        background: T.primary,
                                                        color: "#fff",
                                                        fontSize: "0.7rem",
                                                    }}
                                                />
                                            )}
                                            <Typography
                                                variant="h5"
                                                sx={{
                                                    fontWeight: 800,
                                                    mb: 1,
                                                    color: T.text,
                                                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                                                }}
                                            >
                                                {plan.name}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: T.textLight, mb: 3, minHeight: 40 }}
                                            >
                                                {plan.description}
                                            </Typography>
                                            <Typography
                                                variant="h3"
                                                sx={{
                                                    fontWeight: 900,
                                                    color: T.primary,
                                                    mb: 0.5,
                                                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                                                }}
                                            >
                                                ₹ {plan.amount_inr}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: T.muted, mb: 3.5 }}
                                            >
                                                per month
                                            </Typography>

                                            <Divider sx={{ my: 2.5, borderColor: T.border }} />

                                            <Typography
                                                variant="body2"
                                                sx={{ mb: 3.5, color: T.textLight, fontWeight: 600 }}
                                            >
                                                Daily Limit:{" "}
                                                <strong style={{ color: T.text }}>
                                                    {plan.daily_chat_limit}
                                                </strong>{" "}
                                                chat sessions
                                            </Typography>

                                            {isCurrent ? (
                                                <Chip
                                                    label="Active Plan"
                                                    icon={
                                                        <CheckCircle style={{ color: "#ffffff", fontSize: 16 }} />
                                                    }
                                                    sx={{
                                                        fontWeight: 700,
                                                        backgroundColor: T.primary,
                                                        color: "#fff",
                                                        px: 1.5,
                                                    }}
                                                />
                                            ) : (
                                                <Tooltip
                                                    title={
                                                        isSubscribed
                                                            ? "Cancel your current plan first to switch plans"
                                                            : ""
                                                    }
                                                >
                                                    <span style={{ display: "block" }}>
                                                        <Button
                                                            variant="contained"
                                                            fullWidth
                                                            disabled={isSubscribed}
                                                            onClick={() => handlePurchaseSubscription(plan)}
                                                            sx={{
                                                                ...tealGradientBtn,
                                                                mt: 1,
                                                                py: 1.25,
                                                                "&.Mui-disabled": {
                                                                    background: "rgba(20, 140, 255,0.12)",
                                                                    color: "rgba(20, 140, 255,0.4)",
                                                                },
                                                            }}
                                                        >
                                                            Subscribe Now
                                                        </Button>
                                                    </span>
                                                </Tooltip>
                                            )}
                                        </Paper>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </>
                )}
            </TabPanel>

            {/* ════════ DIALOG: Cancel Subscription ════════ */}
            <Dialog
                open={cancelConfirmOpen}
                onClose={() => !cancelLoading && setCancelConfirmOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { ...glassCard, borderRadius: 3 } }}
            >
                <DialogTitle
                    sx={{
                        fontWeight: 800,
                        color: T.text,
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                    }}
                >
                    Cancel Subscription?
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                        Cancelling will immediately remove your premium access and revert you to the
                        free tier (5 chats/day). This action cannot be undone.
                    </Alert>
                    {cancelError && (
                        <Alert severity="error" sx={{ borderRadius: 2 }}>
                            {cancelError}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 0, gap: 1 }}>
                    <Button
                        onClick={() => setCancelConfirmOpen(false)}
                        disabled={cancelLoading}
                        sx={{ color: T.muted, fontWeight: 600, textTransform: "none" }}
                    >
                        Keep Plan
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCancelSubscription}
                        disabled={cancelLoading}
                        startIcon={
                            cancelLoading ? <CircularProgress size={16} color="inherit" /> : <Cancel />
                        }
                        sx={{
                            fontWeight: 700,
                            textTransform: "none",
                            borderRadius: 2,
                            backgroundColor: "#ef4444",
                            "&:hover": { backgroundColor: "#dc2626" },
                            "&.Mui-disabled": { backgroundColor: "rgba(239,68,68,0.35)" },
                        }}
                    >
                        {cancelLoading ? "Cancelling…" : "Yes, Cancel"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ════════ DIALOG: Quiz Detail ════════ */}
            <Dialog
                open={detailOpen}
                onClose={() => { setDetailOpen(false); setSelectedQuizDetail(null); }}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { ...glassCard, borderRadius: 3 } }}
            >
                <DialogTitle
                    sx={{
                        fontWeight: 800,
                        color: T.text,
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    Quiz Attempt Details
                    <Close
                        sx={{ cursor: "pointer", color: T.muted, "&:hover": { color: T.text } }}
                        onClick={() => { setDetailOpen(false); setSelectedQuizDetail(null); }}
                    />
                </DialogTitle>
                <DialogContent>
                    {detailLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                            <CircularProgress sx={{ color: T.primary }} />
                        </Box>
                    ) : selectedQuizDetail ? (
                        <Box sx={{ pt: 1 }}>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 800,
                                    color: T.text,
                                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                                }}
                            >
                                {selectedQuizDetail.quiz_topic}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 3, color: T.textLight, fontWeight: 500 }}>
                                Score: {selectedQuizDetail.score_percentage}% (
                                {selectedQuizDetail.correct_answers}/
                                {selectedQuizDetail.total_questions}) | Time Taken:{" "}
                                {formatDuration(selectedQuizDetail.time_taken)} /{" "}
                                {formatDuration(selectedQuizDetail.time_limit_seconds)}
                            </Typography>
                            <Divider sx={{ mb: 3, borderColor: T.border }} />
                            {selectedQuizDetail.feedback?.map((item, index) => (
                                <Paper
                                    key={`${item.question_id}-${index}`}
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        mb: 2,
                                        borderRadius: 2.5,
                                        border: "1px solid",
                                        borderColor: item.is_correct
                                            ? "rgba(20, 140, 255,0.25)"
                                            : "rgba(118, 85, 246,0.25)",
                                        background: item.is_correct
                                            ? "rgba(20, 140, 255,0.05)"
                                            : "rgba(118, 85, 246,0.05)",
                                    }}
                                >
                                    <Typography
                                        variant="subtitle2"
                                        sx={{ fontWeight: 700, mb: 1.5, color: T.text }}
                                    >
                                        Q{index + 1}. {item.question}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: item.is_correct ? T.primary : "#5736C8",
                                            mb: 0.5,
                                            fontWeight: 600,
                                        }}
                                    >
                                        Your answer: {item.selected_option || "Not answered"}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: T.primary, fontWeight: 600 }}
                                    >
                                        Correct answer: {item.correct_answer}
                                    </Typography>
                                </Paper>
                            ))}
                        </Box>
                    ) : (
                        <Alert severity="info" sx={{ mt: 1, borderRadius: 2 }}>
                            No details found for this quiz.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button
                        onClick={() => { setDetailOpen(false); setSelectedQuizDetail(null); }}
                        variant="outlined"
                        sx={{ ...outlinedBtn, borderRadius: 2 }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ════════ DIALOG: Delete Profile ════════ */}
            <Dialog
                open={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setDeletePassword("");
                    setDeleteError(null);
                }}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { ...glassCard, borderRadius: 3 } }}
            >
                <DialogTitle
                    sx={{
                        fontWeight: 800,
                        pb: 1,
                        color: "#b91c1c",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                    }}
                >
                    Confirm Delete Profile
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Alert
                        severity="error"
                        sx={{
                            mb: 3,
                            bgcolor: "rgba(239,68,68,0.07)",
                            border: "1px solid rgba(239,68,68,0.22)",
                            borderRadius: 2,
                        }}
                    >
                        <Typography variant="body2" fontWeight={700}>
                            <WarningAmber
                                fontSize="small"
                                sx={{ verticalAlign: "middle", mr: 0.5 }}
                            />
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

                    <Typography variant="body2" sx={{ mb: 2, color: T.textLight, fontWeight: 600 }}>
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
                        sx={{ mb: 1 }}
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
                        sx={{ ...outlinedBtn, borderRadius: 2 }}
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
                            "&:hover": { backgroundColor: "#dc2626" },
                        }}
                    >
                        {deleteLoading && (
                            <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
                        )}
                        {deleteLoading ? "Deleting…" : "Permanently Delete"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ════════ DIALOG: Subscription Payment ════════ */}
            <Dialog
                open={paymentModalOpen}
                onClose={() => {
                    setPaymentModalOpen(false);
                    setSelectedPlan(null);
                    setPaymentError(null);
                }}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { ...glassCard, borderRadius: 3 } }}
            >
                <DialogTitle
                    sx={{
                        fontWeight: 800,
                        color: T.text,
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                    }}
                >
                    Confirm Subscription Order
                </DialogTitle>
                <DialogContent>
                    {selectedPlan && (
                        <Box sx={{ pt: 1 }}>
                            <Typography
                                variant="h6"
                                sx={{
                                    color: T.text,
                                    fontWeight: 800,
                                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                                }}
                                gutterBottom
                            >
                                {selectedPlan.name} Plan
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 1, color: T.textLight, fontWeight: 600 }}>
                                Amount: ₹ {selectedPlan.amount_inr}
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 2, color: T.textLight, fontWeight: 600 }}>
                                Daily Limit: {selectedPlan.daily_chat_limit} chat sessions
                            </Typography>
                            {paymentError && (
                                <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                                    {paymentError}
                                </Alert>
                            )}
                            <Typography variant="body2" sx={{ color: T.muted }}>
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
                        sx={{ ...outlinedBtn, borderRadius: 2 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmPayment}
                        variant="contained"
                        disabled={paymentLoading}
                        sx={{ ...tealGradientBtn, px: 3.5, py: 1.25 }}
                    >
                        {paymentLoading && (
                            <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
                        )}
                        {paymentLoading ? "Processing…" : "Pay Now"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
