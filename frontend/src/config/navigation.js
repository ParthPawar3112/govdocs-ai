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
  { key: "documents", label: "Documents", icon: FileText, phase: "Phase 4 - Document Upload" },
  { key: "search", label: "Smart Search", icon: Search, phase: "Phase 6 - Smart Search" },
  { key: "workflow", label: "Workflow", icon: GitBranch, phase: "Phase 7 - Approval Workflow" },
  { key: "audit", label: "Audit Logs", icon: History, phase: "Phase 8 - Audit Logs" },
  { key: "analytics", label: "Analytics", icon: BarChart3, phase: "Phase 9 - Analytics Dashboard" },
  { key: "settings", label: "Settings", icon: Settings, phase: "Not yet on the roadmap" },
  { key: "profile", label: "Profile", icon: UserCircle, live: true },
];

export function getSection(key) {
  return NAV_SECTIONS.find((section) => section.key === key) ?? NAV_SECTIONS[0];
}
