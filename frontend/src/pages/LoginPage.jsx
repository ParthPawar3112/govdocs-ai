// Public login page that submits credentials through the shared auth context.
import { useState } from "react";
import LoginForm from "../components/LoginForm";
import { useAuth } from "../hooks/useAuth";

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

  return <main className="min-h-screen bg-slate-100 px-4 py-10 sm:grid sm:place-items-center"><section className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-blue-950/10"><div className="mb-8 text-center"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-xl bg-blue-700 text-xl font-bold text-white">G</div><h1 className="text-2xl font-bold text-slate-900">GovDocs AI</h1><p className="mt-2 text-sm text-slate-500">Smart Digital Documentation System</p></div><LoginForm onSubmit={handleLogin} isSubmitting={isSubmitting} error={error} /></section></main>;
}
