// Sticky top bar. Search "submits" by switching to the Smart Search section
// (real navigation, honest about the fact the search engine itself isn't built
// yet). Notifications and the profile menu are genuinely interactive dropdowns
// backed by real session data - no fabricated content.
import { useRef, useState } from "react";
import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import { useClickOutside } from "../../hooks/useClickOutside";
import { formatRelativeTime } from "../../utils/format";

export default function TopNavbar({
  user,
  onOpenMobileSidebar,
  onNavigateToSearch,
  isDark,
  onToggleDark,
  sessionStartedAt,
  onLogout,
  onNavigateToProfile,
}) {
  const [searchValue, setSearchValue] = useState("");
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  useClickOutside(notifRef, () => setIsNotifOpen(false), isNotifOpen);
  useClickOutside(profileRef, () => setIsProfileOpen(false), isProfileOpen);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    onNavigateToSearch();
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
      <button
        className="rounded-lg p-2 text-ink-soft hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        onClick={onOpenMobileSidebar}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <form onSubmit={handleSearchSubmit} className="hidden max-w-sm flex-1 sm:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search documents, records..."
            className="h-9 w-full rounded-lg border border-line bg-slate-50 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onToggleDark}
          className="rounded-lg p-2 text-ink-soft transition hover:bg-slate-100 hover:text-ink dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen((open) => !open)}
            className="relative rounded-lg p-2 text-ink-soft transition hover:bg-slate-100 hover:text-ink dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>
          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 animate-scaleIn origin-top-right rounded-xl border border-line bg-white p-2 shadow-glass dark:border-slate-800 dark:bg-slate-900">
              <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Notifications
              </p>
              <div className="rounded-lg px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                <p className="text-sm text-ink dark:text-slate-100">Signed in successfully</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {formatRelativeTime(sessionStartedAt)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen((open) => !open)}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Avatar username={user.username} size="sm" />
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-semibold text-ink dark:text-slate-100">
                {user.username}
              </span>
              <span className="block text-xs text-ink-soft">{user.role}</span>
            </span>
          </button>
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 animate-scaleIn origin-top-right rounded-xl border border-line bg-white p-2 shadow-glass dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3 px-2 py-2">
                <Avatar username={user.username} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink dark:text-slate-100">
                    {user.username}
                  </p>
                  <Badge tone="primary" className="mt-0.5">
                    {user.role}
                  </Badge>
                </div>
              </div>
              <div className="my-1.5 h-px bg-line dark:bg-slate-800" />
              <button
                onClick={() => {
                  onNavigateToProfile();
                  setIsProfileOpen(false);
                }}
                className="w-full rounded-lg px-2 py-2 text-left text-sm text-ink hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                View profile
              </button>
              <button
                onClick={onLogout}
                className="w-full rounded-lg px-2 py-2 text-left text-sm text-danger hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
