// Every action here genuinely navigates somewhere real (a section, even if
// that section is currently an honest "coming in Phase X" placeholder) -
// nothing is a dead click or a fabricated success message.
import { BarChart3, FileUp, History, Search, Users } from "lucide-react";
import Card from "../ui/Card";

const ACTIONS = [
  { key: "documents", label: "Upload document", icon: FileUp },
  { key: "search", label: "Search documents", icon: Search },
  { key: "analytics", label: "Generate report", icon: BarChart3 },
  { key: "audit", label: "Audit logs", icon: History },
  { key: "settings", label: "Manage users", icon: Users, adminOnly: true },
];

export default function QuickActions({ role, onNavigate }) {
  const visibleActions = ACTIONS.filter((action) => !action.adminOnly || role === "Admin");

  return (
    <Card>
      <h3 className="text-sm font-semibold text-ink dark:text-slate-100">Quick actions</h3>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visibleActions.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className="group flex flex-col items-center gap-2 rounded-xl border border-line p-4 text-center transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary-50 hover:shadow-card-hover dark:border-slate-800 dark:hover:bg-primary/10"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-ink-soft transition-colors group-hover:bg-primary group-hover:text-white dark:bg-slate-800">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="text-xs font-medium text-ink dark:text-slate-200">{label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
