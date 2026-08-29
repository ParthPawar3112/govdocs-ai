// Single source of truth for the app's sections - both Sidebar and
// QuickActions read from this so labels/icons/phase notes never drift apart.
//
// `roles` lists which roles see a section. Admin/Officer keep the full
// government-office workspace; Citizen gets a small self-service set
// (Dashboard / My Documents / Upload Document / Profile). Backend
// authorization enforces the same split independently - hiding a nav item is
// never the only guard.
import {
  BarChart3,
  FileText,
  FileUp,
  FolderOpen,
  GitBranch,
  History,
  LayoutDashboard,
  LifeBuoy,
  Search,
  Settings,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

const ALL_STAFF = ["Admin", "Officer"];
const EVERYONE = ["Admin", "Officer", "Citizen"];

export const NAV_SECTIONS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, live: true, roles: EVERYONE },
  { key: "documents", label: "Documents", icon: FileText, live: true, roles: ALL_STAFF },
  { key: "search", label: "Smart Search", icon: Search, live: true, roles: ALL_STAFF },
  // Officer + Admin: Officers verify and decide on submissions, Admins too.
  { key: "workflow", label: "Review Queue", icon: GitBranch, live: true, roles: ALL_STAFF },
  // "The Bad Reading" - document trust & verification review.
  { key: "verification", label: "Trust & Verification", icon: ShieldCheck, live: true, roles: ALL_STAFF },
  { key: "audit", label: "Audit Logs", icon: History, live: true, roles: ["Admin"] },
  { key: "analytics", label: "Analytics", icon: BarChart3, live: true, roles: ["Admin"] },
  { key: "settings", label: "Settings", icon: Settings, live: true, roles: ["Admin"] },
  // "The Blackout" challenge - disaster recovery / data-resilience console.
  { key: "recovery", label: "Recovery Center", icon: LifeBuoy, live: true, roles: ["Admin"] },
  // Citizen-only self-service.
  { key: "my-documents", label: "My Documents", icon: FolderOpen, live: true, roles: ["Citizen"] },
  { key: "upload", label: "Upload Document", icon: FileUp, live: true, roles: ["Citizen"] },
  { key: "profile", label: "Profile", icon: UserCircle, live: true, roles: EVERYONE },
];

export function getSection(key) {
  return NAV_SECTIONS.find((section) => section.key === key) ?? NAV_SECTIONS[0];
}

export function sectionsForRole(role) {
  return NAV_SECTIONS.filter((section) => section.roles.includes(role));
}
