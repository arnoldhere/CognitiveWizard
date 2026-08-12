import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
    AlertCircle,
    ArrowRight,
    Brain,
    CheckCircle2,
    Eye,
    EyeOff,
    Lock,
    Mail,
    ShieldCheck,
    Sparkles,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";

const highlights = [
    {
        icon: Brain,
        title: "Personalized learning",
        text: "AI-powered tools shaped around your study goals.",
    },
    {
        icon: ShieldCheck,
        title: "Private workspace",
        text: "Keep your sessions, progress, and profile in one place.",
    },
];

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
    const [showPassword, setShowPassword] = useState(false);

    const from = location.state?.from?.pathname || "/quiz";

    const updateField = (field) => (event) => {
        setForm((current) => ({
            ...current,
            [field]: event.target.value,
        }));

        if (error) setError(null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setLoading(true);
        setError(null);

        try {
            const payload = await login(form);
            const role = payload.role || payload.user?.role;

            if (role === "admin") {
                navigate("/admin/dashboard", { replace: true });
            } else if (role === "user") {
                navigate(from, { replace: true });
            } else {
                setError("Unknown user role. Please contact support.");
            }
        } catch (err) {
            if (err.response?.status === 403) {
                navigate("/blocked", { replace: true });
            } else {
                setError(
                    err.response?.data?.error ||
                    err.response?.detail?.message ||
                    "Login failed. Try again later."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#F5F8FC] text-[#384959] dark:bg-[#172330] dark:text-white">
            {/* Ambient background */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#BDDDFC]/35 blur-3xl dark:bg-[#6A89A7]/15" />

                <div className="absolute -bottom-52 -right-40 h-[620px] w-[620px] rounded-full bg-[#88BDF2]/20 blur-3xl dark:bg-[#88BDF2]/10" />

                <div className="absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-white/50 blur-3xl dark:bg-white/[0.03]" />

                <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(106,137,167,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(106,137,167,0.08)_1px,transparent_1px)] [background-size:32px_32px] dark:opacity-[0.15]" />
            </div>

            <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:px-8 lg:py-12">
                {/* Left content */}
                <motion.section
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                        duration: 0.55,
                        ease: "easeOut",
                    }}
                    className="hidden lg:block"
                >
                    <div className="max-w-2xl">
                        {/* Brand badge */}
                        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#BDDDFC]/70 bg-white/75 px-3 py-2 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#BDDDFC] text-[#384959] shadow-sm dark:bg-[#88BDF2]/20 dark:text-[#BDDDFC]">
                                <Sparkles size={14} />
                            </span>

                            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#5B7185] dark:text-[#BDDDFC]">
                                Welcome back
                            </span>
                        </div>

                        <h1 className="max-w-xl text-5xl font-black leading-[1.02] tracking-[-0.045em] text-[#384959] xl:text-6xl dark:text-white">
                            Pick up where your
                            <span className="block text-[#6A89A7] dark:text-[#88BDF2]">
                                best learning happens.
                            </span>
                        </h1>

                        <p className="mt-6 max-w-xl text-[17px] leading-8 text-slate-600 dark:text-slate-300">
                            Sign in to continue your personalized learning journey,
                            revisit quiz history, use AI-powered study tools, and
                            manage your CognitiveWizard profile.
                        </p>

                        {/* Feature cards */}
                        <div className="mt-9 grid max-w-xl gap-3 sm:grid-cols-2">
                            {highlights.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <div
                                        key={item.title}
                                        className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-[0_12px_30px_rgba(56,73,89,0.06)] backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#BDDDFC]/60 text-[#6A89A7] dark:bg-[#88BDF2]/10 dark:text-[#88BDF2]">
                                                <Icon size={18} />
                                            </div>

                                            <div>
                                                <p className="text-sm font-extrabold text-[#384959] dark:text-white">
                                                    {item.title}
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                                    {item.text}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Trust line */}
                        <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <CheckCircle2
                                size={15}
                                className="text-[#6A89A7] dark:text-[#88BDF2]"
                            />
                            Secure sign-in with your existing account
                        </div>
                    </div>
                </motion.section>

                {/* Login card */}
                <motion.section
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.55,
                        delay: 0.08,
                        ease: "easeOut",
                    }}
                    className="w-full"
                >
                    <Card className="mx-auto w-full max-w-xl overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-[0_24px_80px_rgba(56,73,89,0.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#223240]/90 dark:shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
                        <CardContent className="p-6 sm:p-8 lg:p-10">
                            {/* Mobile brand */}
                            <div className="mb-7 flex items-center gap-3 lg:hidden">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#BDDDFC] to-[#88BDF2] text-[#384959] shadow-[0_8px_22px_rgba(136,189,242,0.25)]">
                                    <Brain size={21} strokeWidth={2.4} />
                                </div>

                                <div>
                                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#6A89A7] dark:text-[#88BDF2]">
                                        CognitiveWizard
                                    </p>

                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Welcome back
                                    </p>
                                </div>
                            </div>

                            {/* Header */}
                            <div className="mb-8">
                                <div className="mb-5 hidden h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#BDDDFC] to-[#88BDF2] text-[#384959] shadow-[0_10px_28px_rgba(136,189,242,0.25)] lg:flex">
                                    <Brain size={24} strokeWidth={2.4} />
                                </div>

                                <h2 className="text-3xl font-black tracking-[-0.03em] text-[#384959] dark:text-white">
                                    Sign in
                                </h2>

                                <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                    Access your learning workspace and continue where
                                    you left off.
                                </p>
                            </div>

                            <form
                                onSubmit={handleSubmit}
                                className="space-y-5"
                                noValidate
                            >
                                {/* Email */}
                                <div className="relative">
                                    <div className="pointer-events-none absolute bottom-0 left-0 z-10 flex h-[46px] w-11 items-center justify-center text-slate-400">
                                        <Mail size={17} />
                                    </div>

                                    <Input
                                        className="rounded-xl border-slate-200 bg-white/80 pl-11 transition-all focus:border-[#6A89A7] focus:ring-4 focus:ring-[#BDDDFC]/25 dark:border-slate-700 dark:bg-white/[0.03] dark:focus:border-[#88BDF2] dark:focus:ring-[#88BDF2]/10"
                                        label="Email address"
                                        type="email"
                                        autoComplete="email"
                                        value={form.email}
                                        onChange={updateField("email")}
                                        required
                                    />
                                </div>

                                {/* Password */}
                                <div className="relative">
                                    <div className="pointer-events-none absolute bottom-0 left-0 z-10 flex h-[46px] w-11 items-center justify-center text-slate-400">
                                        <Lock size={17} />
                                    </div>

                                    <Input
                                        className="rounded-xl border-slate-200 bg-white/80 pl-11 pr-11 transition-all focus:border-[#6A89A7] focus:ring-4 focus:ring-[#BDDDFC]/25 dark:border-slate-700 dark:bg-white/[0.03] dark:focus:border-[#88BDF2] dark:focus:ring-[#88BDF2]/10"
                                        label="Password"
                                        type={
                                            showPassword
                                                ? "text"
                                                : "password"
                                        }
                                        autoComplete="current-password"
                                        value={form.password}
                                        onChange={updateField("password")}
                                        required
                                    />

                                    {/* Show / hide password */}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(
                                                (visible) => !visible
                                            )
                                        }
                                        aria-label={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                        aria-pressed={showPassword}
                                        className="absolute bottom-0 right-0 z-10 flex h-[46px] w-11 items-center justify-center rounded-r-xl text-slate-400 transition-colors hover:text-[#384959] focus:outline-none focus:ring-2 focus:ring-[#88BDF2]/40 dark:hover:text-white"
                                    >
                                        {showPassword ? (
                                            <EyeOff size={17} />
                                        ) : (
                                            <Eye size={17} />
                                        )}
                                    </button>
                                </div>

                                {/* Forgot password */}
                                <div className="flex items-center justify-end pt-0.5">
                                    <Link
                                        to="/forgot-password"
                                        className="text-sm font-bold text-[#6A89A7] transition-colors hover:text-[#384959] focus:outline-none focus-visible:underline dark:text-[#88BDF2] dark:hover:text-white"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>

                                {/* Error */}
                                {error && (
                                    <motion.div
                                        initial={{
                                            opacity: 0,
                                            y: -6,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                        }}
                                        className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3.5 text-sm leading-5 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
                                        role="alert"
                                        aria-live="polite"
                                    >
                                        <AlertCircle
                                            size={18}
                                            className="mt-0.5 shrink-0"
                                        />
                                        <span>{error}</span>
                                    </motion.div>
                                )}

                                {/* Submit */}
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    className="group mt-1 w-full rounded-xl shadow-[0_10px_24px_rgba(106,137,167,0.22)] transition-transform hover:-translate-y-0.5"
                                    isLoading={loading}
                                    loadingText="Signing in..."
                                    rightIcon={
                                        !loading ? (
                                            <ArrowRight size={17} />
                                        ) : null
                                    }
                                >
                                    Sign in
                                </Button>

                                {/* Divider */}
                                <div className="relative flex items-center gap-3 py-1">
                                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />

                                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                        New here?
                                    </span>

                                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />
                                </div>

                                {/* Sign up */}
                                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                                    Create your CognitiveWizard account{" "}
                                    <Link
                                        to="/signup"
                                        className="font-extrabold text-[#384959] transition-colors hover:text-[#6A89A7] focus:outline-none focus-visible:underline dark:text-white dark:hover:text-[#88BDF2]"
                                    >
                                        Sign up
                                    </Link>
                                </p>
                            </form>
                        </CardContent>
                    </Card>
                </motion.section>
            </div>
        </main>
    );
}