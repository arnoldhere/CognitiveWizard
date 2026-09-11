import { useState, useEffect } from "react";
import { getOAuthUrl } from "../../services/auth";
import {
  Loader2,
  AlertCircle,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  X,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../ui/Button";

export function GoogleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function GitHubIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export default function OAuthButtons({
  role = "user",
  onRoleChange,
  onError,
  conflictProvider = null,
  disabled = false,
  className = "",
  showQuickToggle = false,
}) {
  const [selectedRole, setSelectedRole] = useState(role || "user");
  const [pendingProvider, setPendingProvider] = useState(null); // 'google' | 'github' | null
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [localError, setLocalError] = useState(null);

  // Synchronize internal state if parent role prop changes
  useEffect(() => {
    if (role) {
      setSelectedRole(role);
    }
  }, [role]);

  const handleRoleSelect = (newRole) => {
    setSelectedRole(newRole);
    if (onRoleChange) {
      onRoleChange(newRole);
    }
  };

  const handleButtonClick = (provider) => {
    // If user is returning due to a conflict, their role is already registered in DB.
    if (conflictProvider === provider) {
      executeOAuthRedirect(provider, selectedRole);
      return;
    }

    // Otherwise, prompt the user with the role choice modal
    setLocalError(null);
    setPendingProvider(provider);
  };

  const executeOAuthRedirect = async (provider, chosenRole) => {
    try {
      setLoadingProvider(provider);
      setLocalError(null);
      if (onError) onError(null);

      // Save chosen role in sessionStorage as a resilient fallback
      sessionStorage.setItem("cw_oauth_role", chosenRole);

      const redirectUri = `${window.location.origin}/auth/callback/${provider}`;
      const response = await getOAuthUrl(provider, {
        role: chosenRole,
        redirect_uri: redirectUri,
      });

      const { url } = response.data;
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("Unable to retrieve authorization URL.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        `Failed to initiate ${provider} login.`;
      setLocalError(msg);
      if (onError) onError(msg, provider);
      setPendingProvider(null);
    } finally {
      setLoadingProvider(null);
    }
  };

  const isGoogleConflict = conflictProvider === "google";
  const isGithubConflict = conflictProvider === "github";
  const pendingProviderName =
    pendingProvider === "google"
      ? "Google"
      : pendingProvider === "github"
      ? "GitHub"
      : "";

  return (
    <div className={`space-y-3 ${className}`}>
      {localError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{localError}</span>
        </div>
      )}

      {/* Optional inline quick role toggle */}
      {showQuickToggle && (
        <div className="flex items-center justify-between px-0.5 text-xs text-slate-500 dark:text-slate-400">
          <span>Joining as:</span>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => handleRoleSelect("user")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                selectedRole === "user"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <BookOpen size={13} />
              Student
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect("tutor")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                selectedRole === "tutor"
                  ? "bg-white text-[#6A89A7] shadow-sm dark:bg-slate-700 dark:text-[#88BDF2]"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <GraduationCap size={14} />
              Tutor
            </button>
          </div>
        </div>
      )}

      {/* Main OAuth action buttons */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {/* Google Button */}
        <button
          type="button"
          disabled={disabled || loadingProvider !== null}
          onClick={() => handleButtonClick("google")}
          className={`relative flex w-full items-center justify-center gap-2.5 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#88BDF2]/40 disabled:cursor-not-allowed disabled:opacity-60 ${
            isGoogleConflict
              ? "border-[#4285F4] bg-[#4285F4]/10 text-[#384959] ring-2 ring-[#4285F4]/30 dark:bg-[#4285F4]/20 dark:text-white"
              : "border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          {loadingProvider === "google" ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#4285F4]" />
          ) : (
            <GoogleIcon className="h-4 w-4 shrink-0" />
          )}
          <span>
            {loadingProvider === "google" ? "Connecting..." : "Continue with Google"}
          </span>
          {isGoogleConflict && (
            <span className="absolute -top-2 right-2 rounded-full bg-[#4285F4] px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white shadow-sm">
              Registered
            </span>
          )}
        </button>

        {/* GitHub Button */}
        <button
          type="button"
          disabled={disabled || loadingProvider !== null}
          onClick={() => handleButtonClick("github")}
          className={`relative flex w-full items-center justify-center gap-2.5 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400/40 disabled:cursor-not-allowed disabled:opacity-60 ${
            isGithubConflict
              ? "border-slate-800 bg-slate-900/10 text-[#384959] ring-2 ring-slate-800/30 dark:border-slate-400 dark:bg-slate-700/40 dark:text-white"
              : "border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          {loadingProvider === "github" ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-700 dark:text-white" />
          ) : (
            <GitHubIcon className="h-4 w-4 shrink-0" />
          )}
          <span>
            {loadingProvider === "github" ? "Connecting..." : "Continue with GitHub"}
          </span>
          {isGithubConflict && (
            <span className="absolute -top-2 right-2 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white shadow-sm dark:bg-slate-600">
              Registered
            </span>
          )}
        </button>
      </div>

      {/* Role Selection Modal on OAuth Click */}
      <AnimatePresence>
        {pendingProvider && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => !loadingProvider && setPendingProvider(null)}
            />

            {/* Modal Dialog */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full max-w-md pointer-events-auto overflow-hidden rounded-3xl border border-white/80 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                      {pendingProvider === "google" ? (
                        <GoogleIcon className="h-5 w-5" />
                      ) : (
                        <GitHubIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        Continue with {pendingProviderName}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Choose your role on CognitiveWizard
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={loadingProvider !== null}
                    onClick={() => setPendingProvider(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label="Close dialog"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Subtitle prompt */}
                <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Select how you plan to use the platform. If you are registering a new account, this will configure your workspace:
                </p>

                {/* Role Choice Cards */}
                <div className="mt-4 space-y-3">
                  {/* Student Option */}
                  <button
                    type="button"
                    onClick={() => handleRoleSelect("user")}
                    className={`group relative flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all ${
                      selectedRole === "user"
                        ? "border-[#6A89A7] bg-[#6A89A7]/10 ring-2 ring-[#6A89A7]/25 dark:border-[#88BDF2] dark:bg-[#88BDF2]/10 dark:ring-[#88BDF2]/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        selectedRole === "user"
                          ? "bg-[#6A89A7] text-white dark:bg-[#88BDF2] dark:text-slate-900"
                          : "bg-slate-100 text-slate-500 group-hover:bg-[#6A89A7]/10 group-hover:text-[#6A89A7] dark:bg-slate-700 dark:text-slate-400"
                      }`}
                    >
                      <BookOpen size={20} />
                    </div>

                    <div className="flex-1 pr-6">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                          Student
                        </h4>
                        {selectedRole === "user" && (
                          <span className="rounded-full bg-[#6A89A7]/15 px-2 py-0.5 text-[10px] font-bold text-[#384959] dark:bg-[#88BDF2]/20 dark:text-[#BDDDFC]">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Learn, practice quizzes, and track your learning progress.
                      </p>
                    </div>

                    <div
                      className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                        selectedRole === "user"
                          ? "border-[#6A89A7] bg-[#6A89A7] text-white dark:border-[#88BDF2] dark:bg-[#88BDF2] dark:text-slate-900"
                          : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700"
                      }`}
                    >
                      {selectedRole === "user" && <CheckCircle2 size={13} />}
                    </div>
                  </button>

                  {/* Tutor / Educator Option */}
                  <button
                    type="button"
                    onClick={() => handleRoleSelect("tutor")}
                    className={`group relative flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all ${
                      selectedRole === "tutor"
                        ? "border-[#6A89A7] bg-[#6A89A7]/10 ring-2 ring-[#6A89A7]/25 dark:border-[#88BDF2] dark:bg-[#88BDF2]/10 dark:ring-[#88BDF2]/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        selectedRole === "tutor"
                          ? "bg-[#6A89A7] text-white dark:bg-[#88BDF2] dark:text-slate-900"
                          : "bg-slate-100 text-slate-500 group-hover:bg-[#6A89A7]/10 group-hover:text-[#6A89A7] dark:bg-slate-700 dark:text-slate-400"
                      }`}
                    >
                      <GraduationCap size={22} />
                    </div>

                    <div className="flex-1 pr-6">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                          Tutor / Educator
                        </h4>
                        {selectedRole === "tutor" && (
                          <span className="rounded-full bg-[#6A89A7]/15 px-2 py-0.5 text-[10px] font-bold text-[#384959] dark:bg-[#88BDF2]/20 dark:text-[#BDDDFC]">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Create AI-powered courses, roadmaps, and publish learning materials.
                      </p>
                    </div>

                    <div
                      className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                        selectedRole === "tutor"
                          ? "border-[#6A89A7] bg-[#6A89A7] text-white dark:border-[#88BDF2] dark:bg-[#88BDF2] dark:text-slate-900"
                          : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700"
                      }`}
                    >
                      {selectedRole === "tutor" && <CheckCircle2 size={13} />}
                    </div>
                  </button>
                </div>

                {/* Helpful note for existing users */}
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <Sparkles size={14} className="text-[#6A89A7] dark:text-[#88BDF2] shrink-0" />
                  <span>Existing accounts automatically retain their saved role upon login.</span>
                </div>

                {/* Actions */}
                <div className="mt-5 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={loadingProvider !== null}
                    onClick={() => setPendingProvider(null)}
                    className="rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>

                  <Button
                    type="button"
                    size="md"
                    isLoading={loadingProvider === pendingProvider}
                    loadingText={`Connecting to ${pendingProviderName}...`}
                    onClick={() => executeOAuthRedirect(pendingProvider, selectedRole)}
                    leftIcon={
                      pendingProvider === "google" ? (
                        <GoogleIcon className="h-4 w-4" />
                      ) : (
                        <GitHubIcon className="h-4 w-4" />
                      )
                    }
                    className="rounded-xl px-5"
                  >
                    Continue to {pendingProviderName}
                  </Button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
