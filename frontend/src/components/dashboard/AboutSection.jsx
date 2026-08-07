// Phase 10 - static project information card, same Card/icon-chip pattern
// as Announcements/SystemStatus. Purely presentational - no state, no API
// calls, no new route or section (lives inside the existing Dashboard page).
import { CheckCircle2, Info } from "lucide-react";
import Card from "../ui/Card";

const CAPABILITIES = [
  "OCR document digitization",
  "AI metadata extraction",
  "Smart search",
  "Approval workflow",
  "Analytics",
  "Audit tracking",
];

export default function AboutSection() {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-50 dark:bg-primary/15">
          <Info className="h-4 w-4 text-primary" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink dark:text-slate-100">About GovDocs AI</h3>
          <p className="mt-1 text-sm text-ink-soft">
            GovDocs AI is an AI-powered digital documentation platform designed to transform
            traditional government paper workflows into secure, searchable, and intelligent
            digital systems.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5 border-t border-line pt-4 dark:border-slate-800">
        {CAPABILITIES.map((item) => (
          <li key={item} className="flex items-center gap-2 text-xs text-ink-soft">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
            {item}
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-line pt-4 text-xs text-ink-soft dark:border-slate-800">
        <span className="font-medium text-ink dark:text-slate-200">Purpose: </span>
        Improve document accessibility, reduce manual work, and enhance government service
        efficiency.
      </p>
    </Card>
  );
}
