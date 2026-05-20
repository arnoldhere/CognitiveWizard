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
import { Person, Email, AdminPanelSettings, History, Delete, WarningAmber } from "@mui/icons-material";

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
                // err.response?.data?.detail ||
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
                    "rzp_test_your_key_here", // Use env var
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
                    color: "#1976d2",
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
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderBottom: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Tabs
                    value={tabValue}
                    onChange={(event, newValue) => setTabValue(newValue)}
                    sx={{ px: 3 }}
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
                    elevation={2}
                    sx={{
                        p: 4,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Avatar
                            sx={{
                                width: 80,
                                height: 80,
                                bgcolor: 'primary.main',
                                mr: 3,
                                fontSize: '2rem',
                            }}
                        >
                            {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                            <Typography
                                variant="overline"
                                sx={{
                                    color: 'primary.main',
                                    fontWeight: 600,
                                    letterSpacing: 1,
                                }}
                            >
                                Profile
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                                Account details
                            </Typography>
                            <Chip
                                label={user.role}
                                icon={<AdminPanelSettings />}
                                color={user.role === 'admin' ? 'secondary' : 'primary'}
                                variant="outlined"
                            />
                        </Box>
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Email sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Email
                                </Typography>
                            </Box>
                            <Typography variant="body1" color="text.secondary">
                                {user.email}
                            </Typography>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Person sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Full Name
                                </Typography>
                            </Box>
                            <Typography variant="body1" color="text.secondary">
                                {user.full_name || "Not provided"}
                            </Typography>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <AdminPanelSettings sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Role
                                </Typography>
                            </Box>
                            <Typography variant="body1" color="text.secondary">
                                {user.role}
                            </Typography>
                        </Grid>
                    </Grid>
                    <Divider sx={{ my: 4 }} />

                    {/* Security Section */}
                    <Box>
                        <Typography
                            variant="h6"
                            sx={{ fontWeight: 600, mb: 2 }}
                        >
                            Security
                        </Typography>

                        <Paper
                            elevation={1}
                            sx={{
                                p: 3,
                                borderRadius: 3,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
                            }}
                        >
                            <Box>
                                <Typography variant="subtitle1" fontWeight={600}>
                                    Facial Login
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Secure your account using face recognition for faster login.
                                </Typography>

                                <Chip
                                    label={
                                        faceLoading
                                            ? "Checking setup..."
                                            : faceLoginStatus
                                                ? "Face Login Enabled"
                                                : "Not Setup"
                                    }
                                    color={
                                        faceLoading
                                            ? "info"
                                            : faceLoginStatus
                                                ? "success"
                                                : "warning"
                                    }
                                    size="small"
                                    sx={{ mt: 1 }}
                                />
                                {faceError && (
                                    <Alert severity="error" sx={{ mt: 2 }}>
                                        {faceError}
                                    </Alert>
                                )}
                                {faceDeleteSuccess && (
                                    <Alert severity="success" sx={{ mt: 2 }}>
                                        {faceDeleteSuccess}
                                    </Alert>
                                )}
                            </Box>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => navigate("/face-register")}
                                    sx={{ borderRadius: 2, textTransform: "none", px: 3 }}
                                >
                                    {faceLoginStatus ? "Re-setup Facial Login" : "Setup Facial Login"}
                                </Button>
                                {faceLoginStatus && !faceLoading ? (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={handleRemoveFaceSetup}
                                        disabled={faceDeleteLoading}
                                        sx={{ borderRadius: 2, textTransform: "none", px: 3 }}
                                    >
                                        {faceDeleteLoading ? "Removing..." : "Remove Facial Login"}
                                    </Button>
                                ) : null}
                            </Box>
                        </Paper>
                    </Box>

                    {/* Danger Zone - Delete Profile */}
                    <Box sx={{ mt: 4 }}>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 600,
                                mb: 2,
                                color: "#d32f2f",
                            }}
                        >
                            Danger Zone
                        </Typography>

                        <Paper
                            elevation={1}
                            sx={{
                                p: 3,
                                borderRadius: 3,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                background: "linear-gradient(135deg, rgba(211, 47, 47, 0.05) 0%, rgba(244, 67, 54, 0.05) 100%)",
                                border: "1px solid #ffcdd2",
                            }}
                        >
                            <Box>
                                <Typography variant="subtitle1" fontWeight={600} sx={{ color: "#d32f2f" }}>
                                    Delete Profile
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Permanently delete your account and all associated data including facial recognition data.
                                    This action cannot be undone.
                                </Typography>
                            </Box>

                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Delete />}
                                onClick={() => setDeleteModalOpen(true)}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: "none",
                                    px: 3,
                                    minWidth: "140px"
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

            <TabPanel value={tabValue} index={2}>
                <Typography variant="h6" gutterBottom>
                    Subscription Plans
                </Typography>
                {subscriptionError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {subscriptionError}
                    </Alert>
                )}
                {subscriptionLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {subscriptionPlans.map((plan) => (
                            <Grid item xs={12} md={4} key={plan.id}>
                                <Paper
                                    elevation={2}
                                    sx={{
                                        p: 3,
                                        textAlign: "center",
                                        borderRadius: 2,
                                        border: user?.subscription_plan === plan.id ? "2px solid #1976d2" : "1px solid #e0e0e0",
                                    }}
                                >
                                    <Typography variant="h5" gutterBottom>
                                        {plan.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        {plan.description}
                                    </Typography>
                                    <Typography variant="h4" color="primary" sx={{ fontWeight: "bold" }}>
                                        INR {plan.amount_inr}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        per month
                                    </Typography>
                                    <Typography variant="body1" sx={{ mb: 1 }}>
                                        Daily Limit: {plan.daily_chat_limit} chats
                                    </Typography>
                                    {user?.subscription_plan === plan.id ? (
                                        <Chip label="Current Plan" color="primary" />
                                    ) : (
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            onClick={() => handlePurchaseSubscription(plan)}
                                            sx={{ mt: 2 }}
                                        >
                                            Purchase
                                        </Button>
                                    )}
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </TabPanel>

            <Dialog
                open={detailOpen}
                onClose={() => {
                    setDetailOpen(false);
                    setSelectedQuizDetail(null);
                }}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Quiz Attempt Details</DialogTitle>
                <DialogContent>
                    {detailLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                            <CircularProgress />
                        </Box>
                    ) : selectedQuizDetail ? (
                        <Box sx={{ pt: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {selectedQuizDetail.quiz_topic}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Score: {selectedQuizDetail.score_percentage}% ({selectedQuizDetail.correct_answers}/
                                {selectedQuizDetail.total_questions}) | Time Taken: {formatDuration(selectedQuizDetail.time_taken)} / {formatDuration(selectedQuizDetail.time_limit_seconds)}
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            {selectedQuizDetail.feedback?.map((item, index) => (
                                <Paper
                                    key={`${item.question_id}-${index}`}
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        mb: 1.5,
                                        borderRadius: 2,
                                        border: "1px solid",
                                        borderColor: item.is_correct ? "success.light" : "warning.light",
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                        Q{index + 1}. {item.question}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Your answer: {item.selected_option || "Not answered"}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Correct answer: {item.correct_answer}
                                    </Typography>
                                </Paper>
                            ))}
                        </Box>
                    ) : (
                        <Alert severity="info">No detail found for this quiz.</Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setDetailOpen(false);
                            setSelectedQuizDetail(null);
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
            >
                <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
                    Delete Profile
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={600}>
                            <WarningAmber fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                            This action is irreversible!
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Deleting your profile will:
                        </Typography>
                        <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2 }}>
                            <li>Remove your account permanently</li>
                            <li>Delete all facial recognition data</li>
                            <li>Delete all quiz history</li>
                            <li>Delete all stored files and embeddings</li>
                        </Typography>
                    </Alert>

                    <Typography variant="body2" sx={{ mb: 2 }}>
                        To confirm, please enter your password:
                    </Typography>

                    <TextField
                        fullWidth
                        type="password"
                        label="Password"
                        placeholder="Enter your password"
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
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button
                        onClick={() => {
                            setDeleteModalOpen(false);
                            setDeletePassword("");
                            setDeleteError(null);
                        }}
                        disabled={deleteLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteProfile}
                        color="error"
                        variant="contained"
                        disabled={deleteLoading || !deletePassword.trim()}
                        sx={{ minWidth: "100px" }}
                    >
                        {deleteLoading ? (
                            <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                        ) : null}
                        {deleteLoading ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={paymentModalOpen}
                onClose={() => {
                    setPaymentModalOpen(false);
                    setSelectedPlan(null);
                    setPaymentError(null);
                }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Confirm Subscription Purchase
                </DialogTitle>
                <DialogContent>
                    {selectedPlan && (
                        <Box sx={{ pt: 1 }}>
                            <Typography variant="h6" gutterBottom>
                                {selectedPlan.name} Plan
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                Amount: INR {selectedPlan.amount_inr}
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                                Daily Limit: {selectedPlan.daily_chat_limit} chats
                            </Typography>
                            {paymentError && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {paymentError}
                                </Alert>
                            )}
                            <Typography variant="body2" color="text.secondary">
                                You will be redirected to Razorpay for secure payment processing.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setPaymentModalOpen(false);
                            setSelectedPlan(null);
                            setPaymentError(null);
                        }}
                        disabled={paymentLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmPayment}
                        variant="contained"
                        disabled={paymentLoading}
                        sx={{ minWidth: "120px" }}
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
