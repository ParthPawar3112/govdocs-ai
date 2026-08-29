// Primary navigation. Desktop: persistent, collapses to icon-only.
// Mobile: off-canvas, opened via the navbar's menu button.
import clsx from "clsx";
import { ChevronsLeft, ChevronsRight, LogOut, X } from "lucide-react";
import { sectionsForRole } from "../../config/navigation";
import Logo from "../ui/Logo";

export default function Sidebar({
  activeSection,
  onSectionChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onLogout,
  role,
}) {
  const handleSelect = (key) => {
    onSectionChange(key);
    onCloseMobile();
  };

  // Role-scoped nav - see config/navigation.js. Backend RBAC enforces the
  // same boundaries regardless of what's rendered here.
  const visibleSections = sectionsForRole(role);

  return (
    <>
      {/* mobile scrim */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-primary-dark text-white transition-all duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0",
          isCollapsed ? "lg:w-[76px]" : "lg:w-64",
          "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <div className={clsx("flex items-center gap-2.5 overflow-hidden", isCollapsed && "lg:hidden")}>
            <Logo size="sm" chip />
            <span className="truncate text-sm font-bold tracking-tight">GovDocs AI</span>
          </div>
          {isCollapsed && (
            <div className="hidden lg:block">
              <Logo size="sm" chip />
            </div>
          )}
          <button
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleSections.map(({ key, label, icon: Icon }) => {
            const isActive = activeSection === key;
            return (
              // Real anchor with a hash href so the browser offers
              // "Open link in new tab" / middle-click / Ctrl+click. A plain
              // left-click is intercepted and handled as an in-app section
              // switch (DashboardPage reads the hash on load - see there).
              <a
                key={key}
                href={`#${key}`}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
                  event.preventDefault();
                  handleSelect(key);
                }}
                title={isCollapsed ? label : undefined}
                aria-current={isActive ? "page" : undefined}
                className={clsx(
                  "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium no-underline transition-all duration-150",
                  isCollapsed && "lg:justify-center",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-blue-100/80 hover:bg-white/10 hover:text-white"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white" />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                <span className={clsx("truncate", isCollapsed && "lg:hidden")}>{label}</span>
              </a>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-3">
          <button
            onClick={onLogout}
            title={isCollapsed ? "Logout" : undefined}
            className={clsx(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-blue-100/80 transition hover:bg-white/10 hover:text-white",
              isCollapsed && "lg:justify-center"
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            <span className={clsx(isCollapsed && "lg:hidden")}>Logout</span>
          </button>

          <button
            onClick={onToggleCollapse}
            className="hidden w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-blue-100/60 transition hover:bg-white/10 hover:text-white lg:flex"
          >
            {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            {!isCollapsed && "Collapse"}
          </button>
        </div>
      </aside>
    </>
  );
}
