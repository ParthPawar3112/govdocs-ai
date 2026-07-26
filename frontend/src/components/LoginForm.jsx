// Reusable credential form with loading, error, and password-visibility controls.
import { useState } from "react";

export default function LoginForm({ onSubmit, isSubmitting, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    onSubmit({ username, password });
  };

  return (
    <form className="space-y-5" onSubmit={submit}>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Username</span>
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
        <div className="relative">
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-16 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          <button className="absolute inset-y-0 right-3 text-sm font-medium text-blue-700" type="button" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Hide" : "Show"}</button>
        </div>
      </label>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <button className="flex w-full items-center justify-center rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
