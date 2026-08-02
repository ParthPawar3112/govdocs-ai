// Protected dashboard entry point. Owns the two pieces of state the whole
// authenticated shell needs (which section is active, when the session
// started) and renders the right content inside DashboardLayout.
import { useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import DashboardHome from "../components/dashboard/DashboardHome";
import ProfileSection from "../components/dashboard/ProfileSection";
import PlaceholderSection from "../components/dashboard/PlaceholderSection";
import DocumentsSection from "../components/documents/DocumentsSection";
import ToastContainer from "../components/ui/Toast";
import { ToastProvider } from "../context/ToastContext";
import { getSection } from "../config/navigation";
import { useAuth } from "../hooks/useAuth";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");

  // Real session-start timestamp, captured once. This component only ever
  // mounts once `user` exists (see App.jsx), so "now" genuinely is sign-in
  // time - it's shared with the navbar's notification and the dashboard's
  // activity timeline so both show the same real event instead of drifting.
  const [sessionStartedAt] = useState(() => new Date());

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <DashboardHome
            user={user}
            sessionStartedAt={sessionStartedAt}
            onNavigate={setActiveSection}
          />
        );
      case "documents":
        return <DocumentsSection />;
      case "profile":
        return <ProfileSection user={user} onLogout={logout} />;
      default:
        return <PlaceholderSection section={getSection(activeSection)} />;
    }
  };

  return (
    <ToastProvider>
      <DashboardLayout
        user={user}
        onLogout={logout}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        sessionStartedAt={sessionStartedAt}
      >
        {renderSection()}
      </DashboardLayout>
      <ToastContainer />
    </ToastProvider>
  );
}
