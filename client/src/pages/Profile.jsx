import { useCallback, useState, useEffect } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
import {
    User, Mail, Shield, History, Trash2, AlertTriangle, 
    Phone, CheckCircle, X, Clock, XCircle, Calendar, GraduationCap
} from "lucide-react";
import Modal from "../components/ui/Modal";

function InfoRow({ icon, label, value }) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
                {icon}
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</span>
                <span className="text-sm font-semibold text-slate-800 truncate">{value}</span>
            </div>
        </div>
    );
}

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

    const formatDuration = (seconds) => {
        if (seconds === null || seconds === undefined) return "N/A";
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
                        setPaymentError("Payment confirmation failed. Please contact support.");
                    }
                },
                prefill: { name: user?.full_name || "", email: user?.email || "" },
                theme: { color: "#6A89A7" },
            };
            if (!window.Razorpay) {
                throw new Error("Razorpay checkout script not loaded.");
            }
            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            setPaymentError(err.response?.data?.detail || "Failed to create payment order.");
        } finally {
            setPaymentLoading(false);
        }
    };

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

    const tabs = [
        { id: 0, label: "Account Details", icon: User },
        { id: 1, label: `Quiz History (${results.total || 0})`, icon: History },
        { id: 2, label: "Subscriptions", icon: Shield },
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Page Hero */}
            <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center text-3xl font-black text-white shadow-xl border-4 border-white">
                    {user?.full_name
                        ? user.full_name.charAt(0).toUpperCase()
                        : user?.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="text-xs font-bold text-primary tracking-widest uppercase mb-1">My Account</p>
                    <h1 className="text-3xl font-extrabold text-slate-900">
                        {user?.full_name || user?.email?.split("@")[0] || "Profile"}
                    </h1>
                </div>
            </div>

            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 mb-8 overflow-x-auto">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = tabValue === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setTabValue(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all relative whitespace-nowrap ${isActive ? 'text-primary' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <Icon size={18} />
                            {tab.label}
                            {isActive && (
                                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* TAB 0: Account Details */}
            {tabValue === 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
                    <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-8 shadow-sm">
                        <div className="flex items-center gap-6 mb-8 flex-wrap">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center text-4xl font-black text-white shadow-xl border-4 border-white">
                                {user?.full_name
                                    ? user.full_name.charAt(0).toUpperCase()
                                    : user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-primary tracking-widest uppercase mb-1">Profile</p>
                                <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Account Details</h2>
                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                                    user?.role === "tutor" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                    user?.role === "admin" ? "bg-cyan-50 text-cyan-600 border-cyan-200" :
                                    "bg-blue-50 text-blue-600 border-blue-200"
                                }`}>
                                    {user?.role === "tutor" ? <GraduationCap size={14} /> : <Shield size={14} />}
                                    {user?.role === "tutor" ? "TUTOR / INSTRUCTOR" : user?.role === "admin" ? "ADMINISTRATOR" : "STUDENT / LEARNER"}
                                </span>
                            </div>
                        </div>

                        {user?.role === "tutor" && (
                            <div className="mb-8 p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
                                <GraduationCap className="text-amber-500 shrink-0 mt-0.5" size={24} />
                                <div>
                                    <h4 className="text-amber-900 font-bold mb-1">Educator & Tutor Publishing Mode Active</h4>
                                    <p className="text-amber-700 text-sm">Your account is configured as a Tutor/Faculty. Materials and AI Wizard roadmaps generated by you are framed with instructional pedagogy, enabling students to access high-quality tutor content via Courses.</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InfoRow icon={<Mail />} label="Email Address" value={user?.email} />
                            <InfoRow icon={<User />} label="Full Name" value={user?.full_name || "Not provided"} />
                            <InfoRow icon={<Shield />} label="User Role" value={user?.role} />
                            <InfoRow icon={<Phone />} label="Phone Number" value={user?.phone || "Not provided"} />
                            <InfoRow icon={<Calendar />} label="Date of Birth" value={user?.dob || "Not provided"} />
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 mb-6">Edit Profile Details</h3>
                        
                        {profileSuccess && (
                            <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-sm font-medium">
                                {profileSuccess}
                            </div>
                        )}
                        {profileError && (
                            <div className="mb-6 p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl text-sm font-medium">
                                {profileError}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                                <input type="email" value={user?.email || ""} disabled className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                                <input type="text" value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                                <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Date of Birth</label>
                                <input type="date" value={profileForm.dob || ""} onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button onClick={handleSaveProfile} disabled={profileLoading} className="px-6 py-3 bg-primary hover:bg-opacity-90 text-white font-bold rounded-xl shadow-lg shadow-primary/30 transition-all disabled:opacity-50">
                                {profileLoading ? "Saving..." : "Save Changes"}
                            </button>
                            <button onClick={() => {
                                setProfileSuccess(null);
                                setProfileError(null);
                                if (user) setProfileForm({ full_name: user.full_name || "", phone: user.phone || "", dob: user.dob || "" });
                            }} disabled={profileLoading} className="px-6 py-3 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition-all disabled:opacity-50">
                                Cancel
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xl font-bold text-rose-600 mb-4 px-2">Danger Zone</h3>
                        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div>
                                <h4 className="text-lg font-bold text-rose-800 mb-1">Delete Account Permanently</h4>
                                <p className="text-sm text-rose-600">This will delete your credentials, quiz milestones, and document index databases permanently.</p>
                            </div>
                            <button onClick={() => setDeleteModalOpen(true)} className="shrink-0 flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 transition-all">
                                <Trash2 size={18} /> Delete Profile
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* TAB 1: Quiz History */}
            {tabValue === 1 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl text-sm font-medium">
                            {error}
                        </div>
                    )}
                    <QuizResultsHistory
                        results={results}
                        loading={loading}
                        onFetchResults={handleFetchResults}
                        onViewDetails={handleViewQuizDetails}
                    />
                </motion.div>
            )}

            {/* TAB 2: Subscriptions */}
            {tabValue === 2 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="mb-8 px-2">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Subscription Plans</h2>
                        <p className="text-slate-500">Upgrade your plan to increase your daily chat limit.</p>
                    </div>

                    {subscriptionError && (
                        <div className="mb-6 p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl text-sm font-medium">
                            {subscriptionError}
                        </div>
                    )}
                    {cancelSuccess && (
                        <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-sm font-medium flex justify-between items-center">
                            <span>{cancelSuccess}</span>
                            <button onClick={() => setCancelSuccess(null)} className="text-emerald-700 hover:text-emerald-900"><X size={18} /></button>
                        </div>
                    )}
                    {cancelError && (
                        <div className="mb-6 p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl text-sm font-medium flex justify-between items-center">
                            <span>{cancelError}</span>
                            <button onClick={() => setCancelError(null)} className="text-rose-700 hover:text-rose-900"><X size={18} /></button>
                        </div>
                    )}

                    {subscriptionLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-8">
                            {user?.subscribed && subscriptionStatus && (
                                <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 shadow-sm">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle className="text-primary" size={24} />
                                                <h3 className="text-xl font-bold text-slate-900">Active Plan: {user.subscription_plan?.charAt(0).toUpperCase() + user.subscription_plan?.slice(1)}</h3>
                                            </div>
                                            <div className="text-slate-600 text-sm space-y-1">
                                                <p>Purchased: <strong className="text-slate-900">{subscriptionStatus.subscription_started_at ? new Date(subscriptionStatus.subscription_started_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}</strong></p>
                                                <p>Expires: <strong className="text-slate-900">{subscriptionStatus.subscription_expires_at ? new Date(subscriptionStatus.subscription_expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}</strong></p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center min-w-[160px]">
                                            <div className="flex items-center justify-center gap-2 mb-1">
                                                <Clock className={subscriptionStatus.days_left <= 5 ? (subscriptionStatus.days_left <= 1 ? "text-rose-500" : "text-amber-500") : "text-primary"} size={20} />
                                                <span className={`text-3xl font-black ${subscriptionStatus.days_left <= 5 ? (subscriptionStatus.days_left <= 1 ? "text-rose-500" : "text-amber-500") : "text-primary"}`}>
                                                    {subscriptionStatus.days_left ?? 0}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Days Left</p>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all ${subscriptionStatus.days_left <= 5 ? (subscriptionStatus.days_left <= 1 ? "bg-rose-500" : "bg-amber-500") : "bg-primary"}`}
                                                    style={{ width: `${Math.min(100, ((subscriptionStatus.days_left ?? 0) / 30) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {subscriptionStatus.days_left !== null && subscriptionStatus.days_left <= 5 && (
                                        <div className={`mt-6 p-4 rounded-2xl flex items-center gap-3 ${subscriptionStatus.days_left <= 1 ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                            <AlertTriangle size={20} />
                                            <span className="font-medium text-sm">
                                                {subscriptionStatus.days_left <= 1 ? "Your subscription expires today! Renew now to avoid losing access." : `Your subscription expires in ${subscriptionStatus.days_left} days. Renew before it lapses.`}
                                            </span>
                                        </div>
                                    )}

                                    <div className="mt-6 flex justify-end">
                                        <button onClick={() => setCancelConfirmOpen(true)} className="flex items-center gap-2 px-4 py-2 text-rose-600 font-bold border border-rose-200 hover:bg-rose-50 rounded-xl transition-all text-sm">
                                            <XCircle size={16} /> Cancel Subscription
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {subscriptionPlans.map((plan) => {
                                    const isCurrent = user?.subscription_plan === plan.id;
                                    const isSubscribed = !!user?.subscribed;

                                    return (
                                        <div key={plan.id} className={`relative flex flex-col p-8 rounded-3xl transition-all ${isCurrent ? 'bg-primary/5 border-2 border-primary shadow-lg shadow-primary/10' : 'bg-white border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-lg hover:border-primary/50'} ${isSubscribed && !isCurrent ? 'opacity-65' : ''}`}>
                                            {isCurrent && (
                                                <span className="absolute top-4 right-4 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Current</span>
                                            )}
                                            <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                                            <p className="text-sm text-slate-500 mb-6 min-h-[40px]">{plan.description}</p>
                                            
                                            <div className="mb-2">
                                                <span className="text-4xl font-black text-primary">₹{plan.amount_inr}</span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">per month</p>

                                            <hr className="border-slate-100 mb-6" />

                                            <div className="mb-8 flex-1">
                                                <p className="text-sm font-semibold text-slate-600">
                                                    Daily Limit: <strong className="text-slate-900">{plan.daily_chat_limit}</strong> chat sessions
                                                </p>
                                            </div>

                                            {isCurrent ? (
                                                <div className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-xl font-bold">
                                                    <CheckCircle size={18} /> Active Plan
                                                </div>
                                            ) : (
                                                <button
                                                    disabled={isSubscribed}
                                                    onClick={() => handlePurchaseSubscription(plan)}
                                                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
                                                >
                                                    Subscribe Now
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Modal: Delete Profile */}
            <Modal isOpen={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setDeletePassword(""); setDeleteError(null); }} title="Confirm Delete Profile" maxWidth="sm">
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="text-rose-800 font-bold mb-2">This action is permanent and irreversible!</h4>
                            <p className="text-rose-700 text-sm font-medium mb-1">Deleting your profile will:</p>
                            <ul className="list-disc list-inside text-rose-700 text-sm font-medium ml-2 space-y-1">
                                <li>Remove your login account permanently</li>
                                <li>Delete facial bio template metadata</li>
                                <li>Wipe quiz result archives</li>
                                <li>Delete all uploaded files & embeddings</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Enter your password to verify your identity:</label>
                    <input 
                        type="password"
                        placeholder="Enter password to confirm"
                        value={deletePassword}
                        onChange={(e) => { setDeletePassword(e.target.value); if(deleteError) setDeleteError(null); }}
                        disabled={deleteLoading}
                        className={`w-full px-4 py-3 rounded-xl border ${deleteError ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 focus:border-primary focus:ring-primary/20'} outline-none focus:ring-2 transition-all`}
                    />
                    {deleteError && <p className="text-rose-600 text-xs font-semibold mt-2">{deleteError}</p>}
                </div>
                <div className="flex items-center justify-end gap-3">
                    <button onClick={() => { setDeleteModalOpen(false); setDeletePassword(""); setDeleteError(null); }} disabled={deleteLoading} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                    <button onClick={handleDeleteProfile} disabled={deleteLoading || !deletePassword.trim()} className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all">
                        {deleteLoading ? "Deleting..." : "Permanently Delete"}
                    </button>
                </div>
            </Modal>

            {/* Modal: Cancel Subscription */}
            <Modal isOpen={cancelConfirmOpen} onClose={() => !cancelLoading && setCancelConfirmOpen(false)} title="Cancel Subscription?" maxWidth="sm">
                <div className="mb-6 p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-2xl text-sm font-medium leading-relaxed">
                    Cancelling will immediately remove your premium access and revert you to the free tier (5 chats/day). This action cannot be undone.
                </div>
                {cancelError && (
                    <div className="mb-6 p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl text-sm font-medium">
                        {cancelError}
                    </div>
                )}
                <div className="flex items-center justify-end gap-3">
                    <button onClick={() => setCancelConfirmOpen(false)} disabled={cancelLoading} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Keep Plan</button>
                    <button onClick={handleCancelSubscription} disabled={cancelLoading} className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all">
                        {cancelLoading ? "Cancelling..." : "Yes, Cancel"}
                    </button>
                </div>
            </Modal>

            {/* Modal: Subscription Payment */}
            <Modal isOpen={paymentModalOpen} onClose={() => { setPaymentModalOpen(false); setSelectedPlan(null); setPaymentError(null); }} title="Confirm Subscription Order" maxWidth="sm">
                {selectedPlan && (
                    <div className="mb-6">
                        <h4 className="text-xl font-bold text-slate-900 mb-4">{selectedPlan.name} Plan</h4>
                        <div className="space-y-2 mb-6">
                            <p className="text-slate-600 font-semibold flex justify-between"><span className="text-slate-500">Amount:</span> <span>₹ {selectedPlan.amount_inr}</span></p>
                            <p className="text-slate-600 font-semibold flex justify-between"><span className="text-slate-500">Daily Limit:</span> <span>{selectedPlan.daily_chat_limit} chat sessions</span></p>
                        </div>
                        {paymentError && (
                            <div className="mb-6 p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl text-sm font-medium">
                                {paymentError}
                            </div>
                        )}
                        <p className="text-sm text-slate-500 italic">You will be redirected to Razorpay checkout to finish payment processing.</p>
                    </div>
                )}
                <div className="flex items-center justify-end gap-3">
                    <button onClick={() => { setPaymentModalOpen(false); setSelectedPlan(null); setPaymentError(null); }} disabled={paymentLoading} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                    <button onClick={handleConfirmPayment} disabled={paymentLoading} className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-opacity-90 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary/30">
                        {paymentLoading ? "Processing..." : "Pay Now"}
                    </button>
                </div>
            </Modal>

            {/* Modal: Quiz Detail */}
            <Modal isOpen={detailOpen} onClose={() => { setDetailOpen(false); setSelectedQuizDetail(null); }} title="Quiz Attempt Details" maxWidth="3xl">
                {detailLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : selectedQuizDetail ? (
                    <div className="flex flex-col gap-6">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">{selectedQuizDetail.quiz_topic}</h3>
                            <p className="text-sm font-semibold text-slate-500">
                                Score: {selectedQuizDetail.score_percentage}% ({selectedQuizDetail.correct_answers}/{selectedQuizDetail.total_questions}) • 
                                Time Taken: {formatDuration(selectedQuizDetail.time_taken)} / {formatDuration(selectedQuizDetail.time_limit_seconds)}
                            </p>
                        </div>
                        <hr className="border-slate-200" />
                        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2">
                            {selectedQuizDetail.feedback?.map((item, index) => (
                                <div key={`${item.question_id}-${index}`} className={`p-5 rounded-2xl border ${item.is_correct ? 'bg-cyan-50 border-cyan-200' : 'bg-indigo-50 border-indigo-200'}`}>
                                    <h4 className="text-slate-900 font-bold mb-4 leading-relaxed">Q{index + 1}. {item.question}</h4>
                                    <div className="flex flex-col gap-2 text-sm font-semibold">
                                        <p className={`${item.is_correct ? 'text-cyan-700' : 'text-indigo-700'}`}>
                                            Your answer: {item.selected_option || "Not answered"}
                                        </p>
                                        <p className="text-emerald-700">
                                            Correct answer: {item.correct_answer}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl text-sm font-medium">
                        No details found for this quiz.
                    </div>
                )}
                <div className="flex items-center justify-end gap-3 mt-6">
                    <button onClick={() => { setDetailOpen(false); setSelectedQuizDetail(null); }} className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Close</button>
                </div>
            </Modal>
        </div>
    );
}
