// Public login page. The auth call itself is unchanged from Phase 2 - only
// the presentation and layout are new.
import { useState } from "react";
import { FileSearch, ShieldCheck, Sparkles, Zap } from "lucide-react";
import LoginForm from "../components/auth/LoginForm";
import DocScanIllustration from "../components/illustrations/DocScanIllustration";
import Logo from "../components/ui/Logo";
import { useAuth } from "../hooks/useAuth";

const FEATURES = [
  { icon: ShieldCheck, label: "Secure" },
  { icon: Sparkles, label: "AI Powered" },
  { icon: FileSearch, label: "Fast Search" },
  { icon: Zap, label: "Paperless" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* LEFT - brand panel, hidden on small screens to keep the form the hero on mobile */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-primary-dark p-12 text-white lg:flex">
        {/* subtle grid texture, kept quiet so it reads as texture, not decoration */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative flex items-center gap-2.5">
          <Logo size="sm" chip />
          <span className="text-lg font-bold tracking-tight">GovDocs AI</span>
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center gap-10 py-10">
          <DocScanIllustration />
          <div className="max-w-sm text-center">
            <h1 className="text-2xl font-bold leading-tight tracking-tight">
              Smart Digital Documentation for Modern Government Offices
            </h1>
          </div>
        </div>

        <div className="relative grid grid-cols-4 gap-3">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-xl bg-white/10 px-2 py-3 text-center backdrop-blur-sm"
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              <span className="text-[11px] font-medium text-white/90">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT - login card */}
      <div className="flex items-center justify-center bg-app px-4 py-12 dark:bg-slate-950">
        <div className="w-full max-w-md animate-fadeIn">
          <div className="rounded-2xl border border-line bg-white/90 p-8 shadow-glass backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 sm:p-10">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4">
                <Logo size="lg" className="mx-auto" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                GovDocs AI
              </p>
              <h2 className="mt-1.5 text-2xl font-bold text-ink dark:text-slate-100">
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-ink-soft">Sign in to continue to your dashboard</p>
            </div>

            <LoginForm onSubmit={handleLogin} isSubmitting={isSubmitting} error={error} />
          </div>

          <p className="mt-6 text-center text-xs text-ink-soft">Secured by GovDocs AI</p>
        </div>
      </div>
    </main>
  );
}
