// Public login page. The auth call itself is unchanged from Phase 2 - only
// the presentation and layout are new.
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import LoginForm from "../components/auth/LoginForm";
import SignupForm from "../components/auth/SignupForm";
import DocumentIntelligencePanel from "../components/illustrations/DocumentIntelligencePanel";
import Logo from "../components/ui/Logo";
import { useAuth } from "../hooks/useAuth";
import { useDarkMode } from "../hooks/useDarkMode";

const CAPABILITIES = [
  "AI-powered OCR",
  "Intelligent metadata extraction",
  "Natural-language document search",
  "Secure document repository",
];

export default function LoginPage() {
  const { login, register } = useAuth();
  // The login page renders before authentication, so DashboardLayout's dark-mode
  // hook (which applies the "dark" class the whole app's dark: styles depend on)
  // hasn't mounted yet - calling it here applies the user's saved/system theme
  // preference immediately, the same theme system the rest of the app already uses.
  useDarkMode();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError("");
  };

  const handleLogin = async (credentials) => {
    setError("");
    setIsSubmitting(true);
    try {
      await login(credentials);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (payload) => {
    setError("");
    setIsSubmitting(true);
    try {
      await register(payload);
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Unable to create your account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <main className="grid h-screen lg:grid-cols-[1.75fr_1fr]">
      {/* LEFT - hero, hidden on small screens so the form stays the priority on mobile.
          h-screen + overflow-y-auto (rather than min-h-screen) keeps this panel from ever
          growing the page taller than the viewport - on short laptop screens it scrolls
          internally instead, so the right-side login panel never gets pushed off-screen. */}
      <div className="relative hidden flex-col overflow-x-hidden overflow-y-auto bg-gradient-to-br from-primary-dark via-primary to-primary-dark p-8 text-white lg:flex xl:p-12">
        {/* restrained background depth: grid texture + two soft glows - never competes with the typography */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-primary-100/10 blur-3xl" />

        {/* brand */}
        <div className="relative flex items-center gap-3">
          <Logo size="lg" chip />
          <span className="text-xl font-bold leading-tight tracking-tight">GovDocs AI</span>
        </div>

        {/* hero - typography is the primary visual element */}
        <div className="relative flex flex-1 items-center">
          <div className="grid w-full grid-cols-1 items-center gap-8 2xl:grid-cols-[1.15fr_1fr] 2xl:gap-10">
            <div>
              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight 2xl:text-[3.5rem] 2xl:leading-[1.05]">
                Turn Government Documents
                <br />
                Into <span className="text-primary-100">Digital Intelligence</span>.
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/70">
                Digitize, understand, search, and manage government records with AI-powered
                document intelligence.
              </p>
            </div>

            <DocumentIntelligencePanel />
          </div>
        </div>

        {/* capabilities - a typographic list with separators, not cards */}
        <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-white/10 pt-4 text-[13px] font-medium text-white/80">
          {CAPABILITIES.map((item, index) => (
            <span key={item} className="flex items-center gap-x-3">
              {index > 0 && <span className="text-white/30">&bull;</span>}
              {item}
            </span>
          ))}
        </div>

        {/* trust footer */}
        <div className="relative mt-3 text-center">
          <p className="text-xs text-white/55">
            Built for smarter, faster, and more secure government offices.
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
            Secure &bull; AI Powered &bull; Paperless
          </p>
        </div>
      </div>

      {/* RIGHT - authentication panel */}
      <div className="relative flex h-screen flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-app px-5 py-6 dark:bg-slate-950">
        {/* one quiet ambient glow, centered behind the panel - light, not decorative "blobs" */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-100/35 blur-3xl dark:bg-primary/[0.07]" />

        <div className="relative flex h-full w-full max-w-[440px] items-center py-4 lg:min-h-[84%] lg:py-0">
          <div className="relative flex w-full flex-col justify-center overflow-hidden rounded-[32px] bg-white ring-1 ring-black/[0.04] shadow-[0_24px_70px_-24px_rgba(15,23,42,0.28)] dark:bg-slate-900 dark:ring-white/[0.06] lg:min-h-full">
            {/* soft internal wash - gives the surface quiet depth instead of a flat rectangle */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary-50 to-transparent dark:from-primary/10" />

            <div className="relative px-7 py-9 sm:px-10 sm:py-10">
              <div className="text-center">
                <div className="mx-auto mb-5">
                  <Logo size="2xl" className="mx-auto" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  GovDocs AI
                </p>
                <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-ink dark:text-slate-100">
                  {isSignup ? "Create Citizen Account" : "Welcome back"}
                </h2>
                <p className="mt-2 text-sm text-ink-soft">
                  {isSignup
                    ? "Register to submit documents digitally and track their review status."
                    : "Sign in to continue to your GovDocs AI workspace."}
                </p>
              </div>

              <div className="mt-8">
                {isSignup ? (
                  <SignupForm
                    onSubmit={handleRegister}
                    isSubmitting={isSubmitting}
                    error={error}
                    onSwitchToLogin={() => switchMode("login")}
                  />
                ) : (
                  <LoginForm
                    onSubmit={handleLogin}
                    isSubmitting={isSubmitting}
                    error={error}
                    onSwitchToSignup={() => switchMode("signup")}
                  />
                )}
              </div>

              <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-line pt-5 text-xs text-ink-soft dark:border-slate-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Secure access to GovDocs AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
