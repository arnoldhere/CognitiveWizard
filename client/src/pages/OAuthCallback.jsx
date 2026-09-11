import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { handleOAuthCallback, getOAuthUrl } from "../services/auth";
import Button from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { GoogleIcon, GitHubIcon } from "../components/auth/OAuthButtons";
import toast from "react-hot-toast";

export default function OAuthCallback() {
  const { provider } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const [status, setStatus] = useState("processing"); // "processing" | "success" | "conflict" | "error"
  const [errorMessage, setErrorMessage] = useState("");
  const [conflictProvider, setConflictProvider] = useState(null);
  const [switchLoading, setSwitchLoading] = useState(false);

  // Prevent double invocation in React StrictMode
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const exchangeCode = async () => {
      const code = searchParams.get("code");
      const stateParam = searchParams.get("state");
      const oauthError = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (oauthError) {
        setStatus("error");
        setErrorMessage(
          errorDescription ||
            `Authorization failed or was cancelled by user (${oauthError}).`
        );
        return;
      }

      if (!code) {
        setStatus("error");
        setErrorMessage("No authorization code found in callback query.");
        return;
      }

      let parsedState = null;
      if (stateParam) {
        try {
          parsedState = JSON.parse(atob(decodeURIComponent(stateParam)));
        } catch {
          try {
            parsedState = JSON.parse(atob(stateParam));
          } catch {
            // If state is not base64 JSON, ignore safely
          }
        }
      }

      const storedRole = sessionStorage.getItem("cw_oauth_role");
      if (storedRole) {
        sessionStorage.removeItem("cw_oauth_role");
      }

      const chosenRole = parsedState?.role || storedRole || "user";
      const redirectUri = `${window.location.origin}/auth/callback/${provider}`;

      try {
        const response = await handleOAuthCallback(provider, {
          code,
          redirect_uri: redirectUri,
          role: chosenRole,
        });

        const payload = response.data;
        if (!payload.access_token || !payload.user) {
          throw new Error("Invalid response format from authentication server.");
        }

        // Authenticate user session
        loginWithToken(payload);
        setStatus("success");

        if (payload.pending_generations > 0) {
          toast.success(
            `We found ${payload.pending_generations} course generation(s) that didn't complete. They're being resumed automatically.`,
            { duration: 6000, icon: "🔄" }
          );
        }

        const roleName = (payload.role || payload.user?.role) === "tutor" ? "Tutor" : "Student";
        toast.success(
          `Welcome, ${payload.user.full_name || payload.user.email}! (${roleName})`,
          { duration: 4000 }
        );

        // Redirect based on role or return_to
        const role = payload.role || payload.user?.role;
        const destination =
          role === "admin"
            ? "/admin/dashboard"
            : parsedState?.return_to && parsedState.return_to !== "/login" && parsedState.return_to !== "/signup"
            ? parsedState.return_to
            : "/quiz";

        setTimeout(() => {
          navigate(destination, { replace: true });
        }, 1200);
      } catch (err) {
        console.error("OAuth callback error:", err);
        const data = err.response?.data;

        if (err.response?.status === 403) {
          navigate("/blocked", { replace: true });
          return;
        }

        if (data?.provider) {
          // Provider conflict detected!
          setStatus("conflict");
          setConflictProvider(data.provider);
          setErrorMessage(
            data.error ||
              `This account was registered using ${data.provider}. Please log in with that provider.`
          );
          return;
        }

        setStatus("error");
        setErrorMessage(
          data?.error ||
            data?.detail ||
            err.message ||
            "Authentication failed. Please try again."
        );
      }
    };

    exchangeCode();
  }, [provider, searchParams, navigate, loginWithToken]);

  // Handler if user clicks the button to switch to the registered provider
  const handleSwitchProvider = async (targetProvider) => {
    try {
      setSwitchLoading(true);
      const redirectUri = `${window.location.origin}/auth/callback/${targetProvider}`;
      const response = await getOAuthUrl(targetProvider, {
        redirect_uri: redirectUri,
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error("Could not get provider authorization URL.");
      }
    } catch (err) {
      setSwitchLoading(false);
      toast.error(err.response?.data?.error || err.message || "Failed to redirect.");
    }
  };

  const providerName =
    provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : "Provider";
  const conflictProviderName =
    conflictProvider ? conflictProvider.charAt(0).toUpperCase() + conflictProvider.slice(1) : "";

  return (
    <main className="relative flex min-h-[85vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:p-8">
        <CardContent className="p-0 text-center">
          {status === "processing" && (
            <div className="py-8">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#BDDDFC]/40 text-[#6A89A7] dark:bg-[#88BDF2]/10 dark:text-[#88BDF2]">
                <Loader2 size={36} className="animate-spin" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                Verifying with {providerName}...
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Please wait while we establish your secure session.
              </p>
            </div>
          )}

          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 size={38} />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                Authentication Successful
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Redirecting you to your CognitiveWizard workspace...
              </p>
            </motion.div>
          )}

          {status === "conflict" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-6"
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <ShieldAlert size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                Account Already Exists
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {errorMessage}
              </p>

              <div className="mt-7 space-y-3">
                {conflictProvider && (
                  <Button
                    type="button"
                    fullWidth
                    size="lg"
                    onClick={() => handleSwitchProvider(conflictProvider)}
                    isLoading={switchLoading}
                    loadingText={`Connecting to ${conflictProviderName}...`}
                    leftIcon={
                      conflictProvider === "google" ? (
                        <GoogleIcon className="h-5 w-5" />
                      ) : (
                        <GitHubIcon className="h-5 w-5" />
                      )
                    }
                    className="shadow-md"
                  >
                    Continue with {conflictProviderName}
                  </Button>
                )}

                <Link
                  to="/login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Back to Sign In
                  <ArrowRight size={16} />
                </Link>
              </div>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-6"
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                Authentication Failed
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-red-600 dark:text-red-400">
                {errorMessage}
              </p>

              <div className="mt-7 flex flex-col gap-3">
                <Link
                  to="/login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6A89A7] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#5C7E9D]"
                >
                  Return to Sign In
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  Create New Account
                </Link>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
