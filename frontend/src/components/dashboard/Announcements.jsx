import { Megaphone } from "lucide-react";
import Card from "../ui/Card";

export default function Announcements() {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-50 dark:bg-primary/15">
          <Megaphone className="h-4 w-4 text-primary" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-ink dark:text-slate-100">Announcements</h3>
          <p className="mt-1 text-sm font-medium text-ink dark:text-slate-100">
            Prototype development complete
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            GovDocs AI now includes AI-powered document processing, OCR, Smart Search, document
            review workflows, audit logs, analytics, security hardening, and live processing status.
          </p>
        </div>
      </div>
    </Card>
  );
}
