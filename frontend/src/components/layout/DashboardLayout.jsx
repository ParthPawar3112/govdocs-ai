// Owns all the "chrome" state (sidebar collapse, mobile drawer, dark mode,
// which section is active) so individual section components stay simple.
import { useEffect, useState } from "react";
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
