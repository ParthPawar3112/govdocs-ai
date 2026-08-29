// Owns all the "chrome" state (sidebar collapse, mobile drawer, dark mode,
// which section is active) so individual section components stay simple.
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import { useDarkMode } from "../../hooks/useDarkMode";
import { getSection } from "../../config/navigation";

const COLLAPSE_KEY = "govdocs_sidebar_collapsed";

export default function DashboardLayout({
  user,
  onLogout,
  activeSection,
  onSectionChange,
  sessionStartedAt,
  incident,
  onOpenRecovery,
  children,
}) {
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === "true"
  );
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isDark, toggleTheme } = useDarkMode();

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const section = getSection(activeSection);

  return (
    <div className="min-h-screen bg-app dark:bg-slate-950 lg:flex">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((v) => !v)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onLogout={onLogout}
        role={user.role}
      />

      <div className="flex min-h-screen flex-1 flex-col">
        <TopNavbar
          user={user}
          onOpenMobileSidebar={() => setIsMobileOpen(true)}
          onNavigateToSearch={() => onSectionChange("search")}
          onNavigateToProfile={() => onSectionChange("profile")}
          isDark={isDark}
          onToggleDark={toggleTheme}
          sessionStartedAt={sessionStartedAt}
          onLogout={onLogout}
        />

        {incident && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-danger px-4 py-2.5 text-center text-sm font-semibold text-white">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              PRIMARY DATA STORE INCIDENT DETECTED — Recovery mode is active.
            </span>
            {onOpenRecovery && activeSection !== "recovery" && (
              <button
                onClick={onOpenRecovery}
                className="rounded-md bg-white/20 px-2.5 py-0.5 text-xs font-semibold transition hover:bg-white/30"
              >
                Open Recovery Center
              </button>
            )}
          </div>
        )}

        <main key={section.key} className="flex-1 animate-fadeIn px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>

        <footer className="border-t border-line px-6 py-4 text-center text-xs text-ink-soft dark:border-slate-800">
          GovDocs AI &middot; Smart Digital Documentation System &middot; Built for the Smart
          Kopargaon Hackathon
        </footer>
      </div>
    </div>
  );
}
