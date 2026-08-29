// Protected dashboard entry point. Owns the two pieces of state the whole
// authenticated shell needs (which section is active, when the session
// started) and renders the right content inside DashboardLayout.
import { useEffect, useRef, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import DashboardHome from "../components/dashboard/DashboardHome";
import ProfileSection from "../components/dashboard/ProfileSection";
import PlaceholderSection from "../components/dashboard/PlaceholderSection";
import DocumentsSection from "../components/documents/DocumentsSection";
import SmartSearchSection from "../components/search/SmartSearchSection";
import ReviewQueueSection from "../components/review/ReviewQueueSection";
import CitizenDashboard from "../components/citizen/CitizenDashboard";
import CitizenDocumentsSection from "../components/citizen/CitizenDocumentsSection";
import CitizenUploadSection from "../components/citizen/CitizenUploadSection";
import RecoveryCenterSection from "../components/recovery/RecoveryCenterSection";
import VerificationReviewSection from "../components/verification/VerificationReviewSection";
import AnalyticsSection from "../components/analytics/AnalyticsSection";
import AuditLogSection from "../components/audit/AuditLogSection";
import SettingsSection from "../components/settings/SettingsSection";
import ToastContainer from "../components/ui/Toast";
import { ToastProvider } from "../context/ToastContext";
import { getSection, sectionsForRole } from "../config/navigation";
import { getRecoveryStatus } from "../api/recovery";
import { useAuth } from "../hooks/useAuth";

// Section state is mirrored to the URL hash (#documents, #recovery, ...) so a
// section can be opened directly in its own browser tab/window. Sidebar items
// are real <a href="#key"> anchors, so right-click -> "Open in new tab" works.
function readHashSection(allowedKeys) {
  const key = window.location.hash.replace(/^#/, "").trim();
  return key && allowedKeys.includes(key) ? key : null;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const allowedKeys = sectionsForRole(user.role).map((s) => s.key);
  const [activeSection, setActiveSection] = useState(
    () => readHashSection(allowedKeys) || "dashboard"
  );

  // Keep the hash in sync with the active section, and react to manual hash
  // edits / back-forward / a freshly-opened tab pointing at #<section>.
  useEffect(() => {
    if (window.location.hash.replace(/^#/, "") !== activeSection) {
      window.history.replaceState(null, "", `#${activeSection}`);
    }
  }, [activeSection]);

  useEffect(() => {
    const onHashChange = () => {
      const next = readHashSection(allowedKeys);
      if (next) setActiveSection(next);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real session-start timestamp, captured once. This component only ever
  // mounts once `user` exists (see App.jsx), so "now" genuinely is sign-in
  // time - it's shared with the navbar's notification and the dashboard's
  // activity timeline so both show the same real event instead of drifting.
  const [sessionStartedAt] = useState(() => new Date());

  const isCitizen = user.role === "Citizen";
  const isStaff = user.role === "Admin" || user.role === "Officer";

  // "The Blackout" challenge - Admin polls the recovery status so the
  // incident banner appears the moment the primary data store goes down.
  const [incident, setIncident] = useState(null);
  const incidentSeenRef = useRef(false);
  useEffect(() => {
    if (user.role !== "Admin") return undefined;
    let active = true;
    const poll = async () => {
      try {
        const { data } = await getRecoveryStatus();
        if (!active) return;
        const down = Boolean(data.recovery_mode) || data.primary_store_raw !== "healthy";
        setIncident(
          down
            ? { store: data.primary_store_status, requires: data.requires_reconciliation }
            : null
        );
        incidentSeenRef.current = down;
      } catch {
        /* transient - keep last known state */
      }
    };
    poll();
    const id = setInterval(poll, 6000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [user.role]);

  const renderCitizenSection = () => {
    switch (activeSection) {
      case "my-documents":
        return <CitizenDocumentsSection />;
      case "upload":
        return <CitizenUploadSection onNavigate={setActiveSection} />;
      case "profile":
        return <ProfileSection user={user} onLogout={logout} />;
      case "dashboard":
      default:
        return <CitizenDashboard user={user} onNavigate={setActiveSection} />;
    }
  };

  const renderStaffSection = () => {
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
      case "search":
        return <SmartSearchSection />;
      case "workflow":
        return isStaff ? <ReviewQueueSection /> : <PlaceholderSection section={getSection(activeSection)} />;
      case "verification":
        return isStaff ? <VerificationReviewSection /> : <PlaceholderSection section={getSection(activeSection)} />;
      case "analytics":
        return user.role === "Admin" ? <AnalyticsSection /> : <PlaceholderSection section={getSection(activeSection)} />;
      case "audit":
        return user.role === "Admin" ? <AuditLogSection /> : <PlaceholderSection section={getSection(activeSection)} />;
      case "settings":
        return user.role === "Admin" ? <SettingsSection /> : <PlaceholderSection section={getSection(activeSection)} />;
      case "recovery":
        return user.role === "Admin" ? <RecoveryCenterSection /> : <PlaceholderSection section={getSection(activeSection)} />;
      case "profile":
        return <ProfileSection user={user} onLogout={logout} />;
      default:
        return <PlaceholderSection section={getSection(activeSection)} />;
    }
  };

  const renderSection = () => (isCitizen ? renderCitizenSection() : renderStaffSection());

  return (
    <ToastProvider>
      <DashboardLayout
        user={user}
        onLogout={logout}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        sessionStartedAt={sessionStartedAt}
        incident={incident}
        onOpenRecovery={() => setActiveSection("recovery")}
      >
        {renderSection()}
      </DashboardLayout>
      <ToastContainer />
    </ToastProvider>
  );
}
