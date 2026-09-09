import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
    Mail,
    Lock,
    Phone,
    Calendar,
    Brain,
    User,
    GraduationCap,
    Eye,
    EyeOff,
    CheckCircle2,
    ShieldCheck,
    Sparkles,
    ArrowRight,
    BookOpen,
    Users,
    Zap,
} from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { motion } from "framer-motion";

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
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await signup(form);
            navigate("/login", { replace: true });
        } catch (err) {
            setError(
                err.response?.data?.detail ||
                err.response?.data?.error ||
                "Unable to create account. Please check your information and try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field) => (event) => {
        setError(null);

        const value =
            event.target.type === "checkbox"
                ? event.target.checked
                : event.target.value;

        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const password = form.password;

    const passwordChecks = {
        length: password.length >= 8,
        number: /\d/.test(password),
        letter: /[A-Za-z]/.test(password),
    };

    const passwordScore = Object.values(passwordChecks).filter(Boolean).length;

    const passwordStrength =
        passwordScore === 0
            ? null
            : passwordScore === 1
                ? "Weak"
                : passwordScore === 2
                    ? "Good"
                    : "Strong";

    const completion = [
        form.full_name,
        form.phone,
        form.dob,
        form.email,
        form.password,
    ].filter(Boolean).length;

    return (
        <main className="relative min-h-screen overflow-hidden bg-slate-50">
            {/* Background */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute -bottom-40 -right-32 h-[32rem] w-[32rem] rounded-full bg-primary/5 blur-3xl" />

                <div className="absolute inset-0 opacity-[0.025]">
                    <svg
                        width="100%"
                        height="100%"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <pattern
                                id="grid"
                                width="32"
                                height="32"
                                patternUnits="userSpaceOnUse"
                            >
                                <path
                                    d="M 32 0 L 0 0 0 32"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1"
                                />
                            </pattern>
                        </defs>

                        <rect
                            width="100%"
                            height="100%"
                            fill="url(#grid)"
                        />
                    </svg>
                </div>
            </div>

            <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
                <div className="grid w-full items-center gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
                    {/* LEFT */}
                    <motion.div
                        initial={{ opacity: 0, x: -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="hidden lg:block"
                    >
                        {/* Brand */}
                        <div className="mb-10 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                                <Brain size={23} strokeWidth={2.2} />
                            </div>

                            <div>
                                <div className="text-lg font-extrabold tracking-tight text-dark">
                                    CognitiveWizard
                                </div>
                                <div className="text-xs font-medium text-slate-500">
                                    Intelligent learning platform
                                </div>
                            </div>
                        </div>

                        <div className="max-w-xl">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary shadow-sm">
                                <Sparkles size={13} />
                                Start your learning journey
                            </div>

                            <h1 className="text-4xl font-black leading-[1.06] tracking-tight text-slate-950 xl:text-6xl">
                                Learn smarter.
                                <span className="block text-primary">
                                    Grow faster.
                                </span>
                            </h1>

                            <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 xl:text-lg">
                                Create your personalized learning profile and
                                unlock a smarter way to study, practice, and
                                track your progress.
                            </p>
                        </div>

                        <div className="mt-10 space-y-5">
                            <Benefit
                                icon={<Brain size={19} />}
                                title="Personalized learning"
                                description="Build a profile that adapts to your learning goals."
                            />

                            <Benefit
                                icon={<BookOpen size={19} />}
                                title="Organized study experience"
                                description="Keep courses, quizzes, roadmaps, and progress connected."
                            />

                            <Benefit
                                icon={<ShieldCheck size={19} />}
                                title="Secure account"
                                description="Your account information stays protected."
                            />
                        </div>

                        <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
                            <MiniStat
                                icon={<Users size={17} />}
                                value="1 profile"
                                label="Personalized"
                            />

                            <MiniStat
                                icon={<Zap size={17} />}
                                value="Smart"
                                label="Learning"
                            />

                            <MiniStat
                                icon={<BookOpen size={17} />}
                                value="All-in-one"
                                label="Study hub"
                            />
                        </div>
                    </motion.div>

                    {/* RIGHT */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.08 }}
                        className="w-full"
                    >
                        <Card className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 shadow-xl shadow-slate-900/[0.08] backdrop-blur sm:rounded-[28px]">
                            <CardContent className="p-0">
                                {/* Mobile brand */}
                                <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6 lg:hidden">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-md">
                                            <Brain size={21} />
                                        </div>

                                        <div>
                                            <div className="font-extrabold text-dark">
                                                CognitiveWizard
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                Intelligent learning platform
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 sm:p-8 lg:p-10">
                                    {/* Header */}
                                    <div className="mb-7">
                                        <div className="mb-4 flex items-center justify-between">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                                <Sparkles
                                                    size={24}
                                                    strokeWidth={2}
                                                />
                                            </div>

                                            <div className="text-right">
                                                <div className="text-xs font-semibold text-slate-400">
                                                    Profile setup
                                                </div>
                                                <div className="mt-0.5 text-sm font-bold text-slate-700">
                                                    {Math.min(
                                                        completion + 1,
                                                        5
                                                    )}{" "}
                                                    / 5
                                                </div>
                                            </div>
                                        </div>

                                        <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                            Create your account
                                        </h2>

                                        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
                                            Set up your profile and start
                                            building a smarter learning
                                            experience.
                                        </p>

                                        {/* Progress */}
                                        <div className="mt-5">
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                                    Setup progress
                                                </span>
                                                <span className="text-[11px] font-bold text-primary">
                                                    {Math.round(
                                                        (completion / 5) * 100
                                                    )}
                                                    %
                                                </span>
                                            </div>

                                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{
                                                        width: `${(completion / 5) *
                                                            100
                                                            }%`,
                                                    }}
                                                    transition={{
                                                        duration: 0.3,
                                                    }}
                                                    className="h-full rounded-full bg-primary"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <form
                                        onSubmit={handleSubmit}
                                        className="space-y-6"
                                    >
                                        {/* Personal */}
                                        <FormSection
                                            number="01"
                                            title="Personal information"
                                            description="Basic details for your learning profile."
                                        >
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <IconInput
                                                    icon={<User size={17} />}
                                                    label="Full Name"
                                                    value={form.full_name}
                                                    onChange={updateField(
                                                        "full_name"
                                                    )}
                                                    placeholder="Your full name"
                                                    required
                                                />

                                                <IconInput
                                                    icon={<Phone size={17} />}
                                                    label="Phone Number"
                                                    value={form.phone}
                                                    onChange={updateField(
                                                        "phone"
                                                    )}
                                                    placeholder="Your phone number"
                                                    required
                                                />
                                            </div>

                                            <IconInput
                                                icon={<Calendar size={17} />}
                                                label="Date of Birth"
                                                type="date"
                                                value={form.dob}
                                                onChange={updateField("dob")}
                                                required
                                            />
                                        </FormSection>

                                        <div className="h-px bg-slate-100" />

                                        {/* Account */}
                                        <FormSection
                                            number="02"
                                            title="Account details"
                                            description="Choose credentials you'll use to sign in."
                                        >
                                            <IconInput
                                                icon={<Mail size={17} />}
                                                label="Email Address"
                                                type="email"
                                                value={form.email}
                                                onChange={updateField("email")}
                                                placeholder="you@example.com"
                                                required
                                            />

                                            <div>
                                                <div className="relative">
                                                    <div
                                                        className="pointer-events-none absolute left-0 top-[38px] z-10 flex h-5 w-10 items-center justify-center text-slate-400"
                                                        aria-hidden="true"
                                                    >
                                                        <Lock size={17} />
                                                    </div>

                                                    <Input
                                                        className="pl-10 pr-12"
                                                        label="Password"
                                                        type={
                                                            showPassword
                                                                ? "text"
                                                                : "password"
                                                        }
                                                        value={form.password}
                                                        onChange={updateField(
                                                            "password"
                                                        )}
                                                        placeholder="Create a password"
                                                        required
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setShowPassword(
                                                                (prev) => !prev
                                                            )
                                                        }
                                                        className="absolute right-2.5 top-[34px] flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                        aria-label={
                                                            showPassword
                                                                ? "Hide password"
                                                                : "Show password"
                                                        }
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff size={18} />
                                                        ) : (
                                                            <Eye size={18} />
                                                        )}
                                                    </button>
                                                </div>

                                                {!password && (
                                                    <p className="mt-2 text-xs text-slate-400">
                                                        Use 8+ characters with
                                                        at least one letter and
                                                        number.
                                                    </p>
                                                )}

                                                {password.length > 0 && (
                                                    <motion.div
                                                        initial={{
                                                            opacity: 0,
                                                            height: 0,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            height: "auto",
                                                        }}
                                                        className="mt-3"
                                                    >
                                                        <div className="mb-2 flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-slate-500">
                                                                Password
                                                                strength
                                                            </span>

                                                            <span
                                                                className={`text-xs font-bold ${passwordStrength ===
                                                                    "Strong"
                                                                    ? "text-emerald-600"
                                                                    : passwordStrength ===
                                                                        "Good"
                                                                        ? "text-amber-600"
                                                                        : "text-red-500"
                                                                    }`}
                                                            >
                                                                {
                                                                    passwordStrength
                                                                }
                                                            </span>
                                                        </div>

                                                        <div className="flex gap-1.5">
                                                            {[1, 2, 3].map(
                                                                (level) => (
                                                                    <div
                                                                        key={
                                                                            level
                                                                        }
                                                                        className={`h-1.5 flex-1 rounded-full transition-colors ${passwordScore >=
                                                                            level
                                                                            ? "bg-primary"
                                                                            : "bg-slate-200"
                                                                            }`}
                                                                    />
                                                                )
                                                            )}
                                                        </div>

                                                        <div className="mt-3 grid grid-cols-3 gap-2">
                                                            <PasswordRule
                                                                active={
                                                                    passwordChecks.length
                                                                }
                                                                text="8+ chars"
                                                            />

                                                            <PasswordRule
                                                                active={
                                                                    passwordChecks.letter
                                                                }
                                                                text="Letter"
                                                            />

                                                            <PasswordRule
                                                                active={
                                                                    passwordChecks.number
                                                                }
                                                                text="Number"
                                                            />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        </FormSection>

                                        <div className="h-px bg-slate-100" />

                                        {/* Role */}
                                        <FormSection
                                            number="03"
                                            title="Choose your role"
                                            description="Select how you'll use CognitiveWizard."
                                        >
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <RoleCard
                                                    selected={!form.is_tutor}
                                                    icon={
                                                        <BookOpen size={21} />
                                                    }
                                                    title="Student"
                                                    description="Learn, practice, and track your progress."
                                                    onClick={() =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            is_tutor: false,
                                                        }))
                                                    }
                                                />

                                                <RoleCard
                                                    selected={form.is_tutor}
                                                    icon={
                                                        <GraduationCap
                                                            size={22}
                                                        />
                                                    }
                                                    title="Tutor / Educator"
                                                    description="Create courses, roadmaps, and learning guides."
                                                    onClick={() =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            is_tutor: true,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </FormSection>

                                        {/* Error */}
                                        {error && (
                                            <motion.div
                                                initial={{
                                                    opacity: 0,
                                                    y: -5,
                                                }}
                                                animate={{
                                                    opacity: 1,
                                                    y: 0,
                                                }}
                                                role="alert"
                                                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                                            >
                                                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold">
                                                    !
                                                </div>

                                                <div>
                                                    <p className="font-bold">
                                                        Account creation failed
                                                    </p>
                                                    <p className="mt-0.5 leading-5">
                                                        {error}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* CTA */}
                                        <div className="pt-1">
                                            <Button
                                                type="submit"
                                                className="group w-full !rounded-xl py-3.5 text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25 active:translate-y-0"
                                                isLoading={loading}
                                            >
                                                {loading
                                                    ? "Creating your account…"
                                                    : "Create account"}

                                                {!loading && (
                                                    <ArrowRight
                                                        size={17}
                                                        className="ml-2 inline-block transition-transform group-hover:translate-x-1"
                                                    />
                                                )}
                                            </Button>
                                        </div>

                                        {/* Security */}
                                        <div className="flex items-center justify-center gap-2 text-center text-xs text-slate-400">
                                            <ShieldCheck
                                                size={15}
                                                className="text-emerald-500"
                                            />
                                            <span>
                                                Your information is securely
                                                handled.
                                            </span>
                                        </div>

                                        {/* Login */}
                                        <div className="relative pt-2">
                                            <div className="absolute inset-x-0 top-0 flex items-center">
                                                <div className="w-full border-t border-slate-200" />
                                            </div>

                                            <div className="relative flex justify-center">
                                                <span className="bg-white px-3 text-xs font-medium text-slate-400">
                                                    Already have an account?
                                                </span>
                                            </div>

                                            <div className="mt-4 text-center">
                                                <Link
                                                    to="/login"
                                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-primary transition hover:bg-primary/5 hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                >
                                                    Sign in to your account
                                                    <ArrowRight size={15} />
                                                </Link>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </CardContent>
                        </Card>

                        <p className="mt-5 text-center text-xs text-slate-400 lg:hidden">
                            © {new Date().getFullYear()} CognitiveWizard
                        </p>
                    </motion.div>
                </div>
            </div>
        </main>
    );
}

/* =========================================================
   HELPER COMPONENTS
========================================================= */

function Benefit({ icon, title, description }) {
    return (
        <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-primary shadow-sm">
                {icon}
            </div>

            <div>
                <h3 className="font-bold text-slate-900">{title}</h3>
                <p className="mt-1 max-w-sm text-sm leading-5 text-slate-500">
                    {description}
                </p>
            </div>
        </div>
    );
}

function MiniStat({ icon, value, label }) {
    return (
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-sm">
            <div className="mb-2 text-primary">{icon}</div>

            <div className="text-sm font-extrabold text-slate-900">
                {value}
            </div>

            <div className="mt-0.5 text-xs text-slate-500">{label}</div>
        </div>
    );
}

function FormSection({ number, title, description, children }) {
    return (
        <section>
            <div className="mb-4 flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-500">
                    {number}
                </div>

                <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                        {title}
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-500">
                        {description}
                    </p>
                </div>
            </div>

            <div className="space-y-4">{children}</div>
        </section>
    );
}

function IconInput({
    icon,
    label,
    type = "text",
    value,
    onChange,
    placeholder,
    required = false,
}) {
    return (
        <div className="relative">
            {/* Input icon: aligned with the actual input box, not the label */}
            <div
                className="pointer-events-none absolute left-0 top-[38px] z-10 flex h-5 w-10 items-center justify-center text-slate-400"
                aria-hidden="true"
            >
                {icon}
            </div>

            <Input
                className="pl-10"
                label={label}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
            />
        </div>
    );
}

function PasswordRule({ active, text }) {
    return (
        <div
            className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${active ? "text-emerald-600" : "text-slate-400"
                }`}
        >
            <CheckCircle2 size={12} />
            <span>{text}</span>
        </div>
    );
}

function RoleCard({
    selected,
    icon,
    title,
    description,
    onClick,
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            className={`group relative rounded-2xl border p-4 text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/40 ${selected
                ? "border-primary bg-primary/[0.07] shadow-sm ring-2 ring-primary/10"
                : "border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50 hover:shadow-sm"
                }`}
        >
            {/* Selection */}
            <div
                className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${selected
                    ? "border-primary bg-primary text-white"
                    : "border-slate-300 bg-white"
                    }`}
            >
                {selected && <CheckCircle2 size={13} />}
            </div>

            {/* Icon */}
            <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${selected
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary"
                    }`}
            >
                {icon}
            </div>

            <h4 className="pr-7 text-sm font-extrabold text-slate-900">
                {title}
            </h4>

            <p className="mt-1.5 text-xs leading-5 text-slate-500">
                {description}
            </p>
        </button>
    );
}