import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";

const DESCRIPTIONS = {
  documents: "Upload, browse, and manage digitized government records.",
  search: "Full-text search across every processed document's OCR text and AI metadata.",
  workflow: "Approve, reject, or send back documents in the Review Queue. This area is limited to Admin accounts.",
  audit: "Every login, upload, and review action is logged and searchable in the Audit Log. This area is limited to Admin accounts.",
  analytics: "Upload trends, approval rates, and department/category breakdowns are available in Analytics. This area is limited to Admin accounts.",
  settings: "AI confidence threshold and system configuration are available in Settings. This area is limited to Admin accounts.",
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
          title={`${section.label} requires Admin access`}
          description={DESCRIPTIONS[section.key] || "This module is on the roadmap."}
          phase={section.phase}
        />
      </Card>
    </div>
  );
}
