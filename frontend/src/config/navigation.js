// Single source of truth for the app's sections - both Sidebar and
// QuickActions read from this so labels/icons/phase notes never drift apart.
import {
  BarChart3,
  FileText,
  GitBranch,
  History,
  LayoutDashboard,
  Search,
  Settings,
  UserCircle,
} from "lucide-react";

export const NAV_SECTIONS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, live: true },
  { key: "documents", label: "Documents", icon: FileText, live: true },
  { key: "search", label: "Smart Search", icon: Search, live: true },
  // Phase 8 - Admin-only: Officer uploads, Admin reviews (see require_admin on the backend).
  { key: "workflow", label: "Review Queue", icon: GitBranch, live: true, adminOnly: true },
  { key: "audit", label: "Audit Logs", icon: History, live: true, adminOnly: true },
  { key: "analytics", label: "Analytics", icon: BarChart3, live: true, adminOnly: true },
  { key: "settings", label: "Settings", icon: Settings, live: true, adminOnly: true },
  { key: "profile", label: "Profile", icon: UserCircle, live: true },
];

export function getSection(key) {
  return NAV_SECTIONS.find((section) => section.key === key) ?? NAV_SECTIONS[0];
}
