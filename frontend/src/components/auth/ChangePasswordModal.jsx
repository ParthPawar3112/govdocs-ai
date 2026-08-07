// Change Password modal, opened from ProfileSection. Reuses the existing
// Modal/Button shell and the show/hide password field pattern from
// LoginForm. On success the user is logged out and redirected to the login
// page - App.jsx already does that redirect automatically once `user`
// becomes null, so this only needs to call the existing logout().
import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Lock } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { changePasswordRequest } from "../../api/auth";
import { useToast } from "../../hooks/useToast";

const initialForm = { current_password: "", new_password: "", confirm_password: "" };
const POST_SUCCESS_LOGOUT_DELAY_MS = 1800;

function PasswordField({ label, value, onChange, autoComplete }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">{label}</span>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        <input
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-11 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft transition hover:text-primary"
          onClick={() => setIsVisible((v) => !v)}
          aria-label={isVisible ? "Hide password" : "Show password"}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

export default function ChangePasswordModal({ isOpen, onClose, onLogout }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setForm(initialForm);
    setError("");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.current_password || !form.new_password || !form.confirm_password) {
      setError("All fields are required.");
      return;
    }
    if (form.new_password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePasswordRequest(form);
      reset();
      onClose();
      showToast("Password changed successfully. Please login again.", "success");
      // Delay the logout so the success toast is actually visible - the
      // toast lives in the authenticated shell and disappears the moment
      // logout() flips `user` to null and that shell unmounts.
      setTimeout(onLogout, POST_SUCCESS_LOGOUT_DELAY_MS);
    } catch (requestError) {
      const message = requestError.response?.data?.detail || "Could not change password. Please try again.";
      setError(message);
      showToast(message, "error");
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Change password" size="sm">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <PasswordField
          label="Current password"
          value={form.current_password}
          onChange={(value) => setForm((f) => ({ ...f, current_password: value }))}
          autoComplete="current-password"
        />
        <PasswordField
          label="New password"
          value={form.new_password}
          onChange={(value) => setForm((f) => ({ ...f, new_password: value }))}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm new password"
          value={form.confirm_password}
          onChange={(value) => setForm((f) => ({ ...f, confirm_password: value }))}
          autoComplete="new-password"
        />
        <p className="text-xs text-ink-soft">Must be at least 8 characters.</p>

        {error && (
          <div
            className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-danger dark:bg-red-500/10"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? "Changing..." : "Change password"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
