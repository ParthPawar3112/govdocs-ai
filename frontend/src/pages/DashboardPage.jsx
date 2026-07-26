// Protected dashboard view displaying the authenticated user and zero-value placeholders.
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import { useAuth } from "../hooks/useAuth";

const stats = [["Documents", "bg-blue-600"], ["Pending", "bg-amber-500"], ["Approved", "bg-emerald-500"], ["Rejected", "bg-red-500"]];

export default function DashboardPage() {
  const { logout, user } = useAuth();
  return <div className="min-h-screen bg-slate-100 md:flex"><Sidebar onLogout={logout} /><main className="flex-1 p-6 sm:p-10"><header className="mb-8"><p className="text-sm font-medium text-blue-700">Dashboard</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Welcome, {user.username}</h1><p className="mt-2 text-slate-500">Role: <span className="font-medium text-slate-700">{user.role}</span></p></header><section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, accent]) => <StatCard key={label} label={label} value="0" accent={accent} />)}</section></main></div>;
}
