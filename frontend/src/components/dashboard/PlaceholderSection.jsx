import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";

const DESCRIPTIONS = {
  documents: "Upload, browse, and manage digitized government records once this module ships.",
  search: "Natural-language search across every processed document will live here.",
  workflow: "Officer review and Admin approval actions will move through this screen.",
  audit: "Every state change on every document will be logged and searchable here.",
  analytics: "Turnaround time, approval rates, and department load will be visualized here.",
  settings: "Account and system preferences will live here if this module is added to the roadmap.",
};

export default function PlaceholderSection({ section }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">{section.label}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-slate-100">
          {section.label}
        </h1>
      </div>
      <Card padding="p-0">
        <EmptyState
          icon={section.icon}
          title={`${section.label} isn't built yet`}
          description={DESCRIPTIONS[section.key] || "This module is on the roadmap."}
          phase={section.phase}
        />
      </Card>
    </div>
  );
}
