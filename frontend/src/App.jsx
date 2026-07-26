// Application route boundary that exposes the dashboard only to authenticated users.
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";

function ProtectedApplication() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center text-slate-500">Loading session...</div>;
  }

  return user ? <DashboardPage /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedApplication />
    </AuthProvider>
  );
}
