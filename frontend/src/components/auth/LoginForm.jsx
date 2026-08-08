// Credential form: adds show/hide password, a real "remember me" (persists the
// username locally), an honest UI-only forgot-password note, and a loading
// state wired to the existing onSubmit/isSubmitting/error contract from
// LoginPage - none of that data contract changed, only the presentation.
import { useEffect, useState } from "react";
import { AlertCircle, Eye, EyeOff, Lock, User } from "lucide-react";
import Button from "../ui/Button";

const REMEMBER_KEY = "govdocs_remembered_username";

export default function LoginForm({ onSubmit, isSubmitting, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotNote, setShowForgotNote] = useState(false);

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_KEY);
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }
  }, []);

  const submit = (event) => {
    event.preventDefault();
    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, username);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
    onSubmit({ username, password });
  };

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
          Username
        </span>
        <div className="relative">
          <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-soft" />
          <input
            className="h-[52px] w-full rounded-xl border border-line bg-slate-50/70 pl-12 pr-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            placeholder="admin or officer"
            required
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
          Password
        </span>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-soft" />
          <input
            className="h-[52px] w-full rounded-xl border border-line bg-slate-50/70 pl-12 pr-12 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft transition hover:text-primary"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </label>

      <div className="flex items-center justify-between text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-ink-soft select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="h-4 w-4 rounded border-line text-primary focus:ring-primary/40"
          />
          Remember me
        </label>
        <button
          type="button"
          className="font-medium text-primary hover:text-primary-dark"
          onClick={() => setShowForgotNote((visible) => !visible)}
        >
          Forgot password?
        </button>
      </div>

      {showForgotNote && (
        <p className="animate-fadeIn rounded-lg bg-slate-50 px-3 py-2 text-xs text-ink-soft dark:bg-slate-800 dark:text-slate-400">
          Contact your system administrator to reset your password.
        </p>
      )}

      {error && (
        <div
          className="flex animate-fadeIn items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-danger dark:bg-red-500/10"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        className="w-full !h-[54px] !rounded-xl !bg-gradient-to-r !from-primary !to-primary-dark !text-base !shadow-lg !shadow-primary/25 transition-transform hover:!-translate-y-0.5 hover:!shadow-xl"
        size="lg"
        loading={isSubmitting}
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
