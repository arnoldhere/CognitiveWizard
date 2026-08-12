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

    return (
        <main className="relative min-h-screen overflow-hidden bg-slate-50">
            {/* Background decoration */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-accent/30 blur-3xl" />

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

                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>
            </div>

            <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
                <div className="grid w-full items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
                    {/* =====================================================
                        LEFT — BRAND / VALUE PROPOSITION
                    ====================================================== */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
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

                            <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-slate-950 xl:text-6xl">
                                Learn smarter.
                                <span className="block text-primary">
                                    Grow faster.
                                </span>
                            </h1>

                            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
                                Create your personalized learning profile and
                                unlock a smarter way to study, practice, and
                                track your progress.
                            </p>
                        </div>

                        {/* Benefits */}
                        <div className="mt-10 space-y-4">
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

                        {/* Mini stats */}
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

                    {/* =====================================================
                        RIGHT — SIGNUP CARD
                    ====================================================== */}
                    <motion.div
                        initial={{ opacity: 0, y: 25 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="w-full"
                    >
                        <Card className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
                            <CardContent className="p-0">
                                {/* Mobile brand */}
                                <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5 lg:hidden">
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

                                <div className="p-6 sm:p-8 lg:p-10">
                                    {/* Header */}
                                    <div className="mb-8">
                                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                            <Sparkles
                                                size={27}
                                                strokeWidth={2}
                                            />
                                        </div>

                                        <h2 className="text-3xl font-black tracking-tight text-slate-950">
                                            Create your account
                                        </h2>

                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                            Set up your profile and start
                                            building a smarter learning
                                            experience.
                                        </p>
                                    </div>

                                    <form
                                        onSubmit={handleSubmit}
                                        className="space-y-6"
                                    >
                                        {/* Personal information */}
                                        <FormSection
                                            number="01"
                                            title="Personal information"
                                            description="Tell us a little about yourself."
                                        >
                                            <div className="grid gap-5 sm:grid-cols-2">
                                                <IconInput
                                                    icon={<User size={18} />}
                                                    label="Full Name"
                                                    value={form.full_name}
                                                    onChange={updateField(
                                                        "full_name"
                                                    )}
                                                    placeholder="Your full name"
                                                />

                                                <IconInput
                                                    icon={<Phone size={18} />}
                                                    label="Phone Number"
                                                    value={form.phone}
                                                    onChange={updateField(
                                                        "phone"
                                                    )}
                                                    placeholder="Your phone number"
                                                />
                                            </div>

                                            <IconInput
                                                icon={<Calendar size={18} />}
                                                label="Date of Birth"
                                                type="date"
                                                value={form.dob}
                                                onChange={updateField("dob")}
                                            />
                                        </FormSection>

                                        {/* Account information */}
                                        <FormSection
                                            number="02"
                                            title="Account details"
                                            description="Choose the credentials you'll use to sign in."
                                        >
                                            <IconInput
                                                icon={<Mail size={18} />}
                                                label="Email Address"
                                                type="email"
                                                value={form.email}
                                                onChange={updateField("email")}
                                                placeholder="you@example.com"
                                                required
                                            />

                                            <div>
                                                <div className="relative">
                                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                                        <Lock size={18} />
                                                    </div>

                                                    <Input
                                                        className="pr-12 pl-10"
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
                                                        className="absolute right-3 top-[38px] rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
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

                                                {/* Password strength */}
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

                                        {/* Role selection */}
                                        <FormSection
                                            number="03"
                                            title="Choose your role"
                                            description="You can use CognitiveWizard as a learner or educator."
                                        >
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <RoleCard
                                                    selected={!form.is_tutor}
                                                    icon={
                                                        <BookOpen size={22} />
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
                                                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs">
                                                    !
                                                </div>

                                                <div>
                                                    <p className="font-bold">
                                                        Account creation
                                                        failed
                                                    </p>

                                                    <p className="mt-0.5 leading-5">
                                                        {error}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Submit */}
                                        <Button
                                            type="submit"
                                            className="group w-full !rounded-xl py-3.5 text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
                                            isLoading={loading}
                                        >
                                            {loading
                                                ? "Creating Account..."
                                                : "Create My Account"}

                                            {!loading && (
                                                <ArrowRight
                                                    size={17}
                                                    className="ml-2 inline-block transition-transform group-hover:translate-x-1"
                                                />
                                            )}
                                        </Button>

                                        {/* Security note */}
                                        <div className="flex items-center justify-center gap-2 text-center text-xs text-slate-400">
                                            <ShieldCheck
                                                size={15}
                                                className="text-emerald-500"
                                            />

                                            <span>
                                                Your account information is
                                                securely handled.
                                            </span>
                                        </div>

                                        {/* Divider */}
                                        <div className="relative py-1">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-slate-200" />
                                            </div>

                                            <div className="relative flex justify-center">
                                                <span className="bg-white px-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                                                    Already a member?
                                                </span>
                                            </div>
                                        </div>

                                        {/* Login */}
                                        <div className="text-center">
                                            <Link
                                                to="/login"
                                                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:text-primary/80"
                                            >
                                                Sign in to your account
                                                <ArrowRight size={15} />
                                            </Link>
                                        </div>
                                    </form>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Mobile footer */}
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

                <p className="mt-1 text-sm leading-5 text-slate-500">
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

            <div className="space-y-5">{children}</div>
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
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
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
            className={`flex items-center gap-1.5 text-[11px] transition-colors ${active ? "text-emerald-600" : "text-slate-400"
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
            className={`group relative rounded-2xl border p-4 text-left transition-all duration-200 ${selected
                    ? "border-primary bg-primary/[0.06] shadow-md shadow-primary/10"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                }`}
        >
            {/* Selection indicator */}
            <div
                className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${selected
                        ? "border-primary bg-primary text-white"
                        : "border-slate-300 bg-white"
                    }`}
            >
                {selected && <CheckCircle2 size={13} />}
            </div>

            <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${selected
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary"
                    }`}
            >
                {icon}
            </div>

            <h4 className="pr-6 text-sm font-extrabold text-slate-900">
                {title}
            </h4>

            <p className="mt-1.5 text-xs leading-5 text-slate-500">
                {description}
            </p>
        </button>
    );
}