// Public Citizen sign-up form. Same visual language as LoginForm; the
// onSubmit/isSubmitting/error contract mirrors it too. Client-side checks
// (required, >= 8 chars, match) are for instant feedback only - the backend
// re-validates and owns the duplicate-username / mismatch responses.
import { useState } from "react";
import { AlertCircle, Eye, EyeOff, IdCard, Lock, User } from "lucide-react";
import Button from "../ui/Button";

const FIELD_CLASS =
  "h-[52px] w-full rounded-xl border border-line bg-slate-50/70 pl-12 pr-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800";

export default function SignupForm({ onSubmit, isSubmitting, error, onSwitchToLogin }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const submit = (event) => {
    event.preventDefault();
    setLocalError("");

    if (!fullName.trim() || !username.trim()) {
      setLocalError("Full name and username are required.");
      return;
    }
    if (username.trim().length < 3) {
      setLocalError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Password and confirmation do not match.");
      return;
    }

    onSubmit({
      full_name: fullName.trim(),
      username: username.trim(),
      password,
      confirm_password: confirmPassword,
    });
  };

  const shownError = localError || error;

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">Full name</span>
        <div className="relative">
          <IdCard className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-soft" />
          <input
            className={FIELD_CLASS}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
            placeholder="e.g. Rahul Patil"
            required
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">Username</span>
        <div className="relative">
          <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-soft" />
          <input
            className={FIELD_CLASS}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            placeholder="Choose a unique username"
            required
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">Password</span>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-soft" />
          <input
            className={`${FIELD_CLASS} !pr-12`}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="At least 8 characters"
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

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
          Confirm password
        </span>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-soft" />
          <input
            className={FIELD_CLASS}
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            required
          />
        </div>
      </label>

      {shownError && (
        <div
          className="flex animate-fadeIn items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-danger dark:bg-red-500/10"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{shownError}</span>
        </div>
      )}

      <Button
        type="submit"
        className="w-full !h-[54px] !rounded-xl !bg-gradient-to-r !from-primary !to-primary-dark !text-base !shadow-lg !shadow-primary/25 transition-transform hover:!-translate-y-0.5 hover:!shadow-xl"
        size="lg"
        loading={isSubmitting}
      >
        {isSubmitting ? "Creating account..." : "Create Citizen Account"}
      </Button>

      <p className="text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-semibold text-primary hover:text-primary-dark"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
