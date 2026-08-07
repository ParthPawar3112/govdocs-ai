// Phase 8 - visual pipeline stepper: Uploaded -> OCR -> AI -> Review outcome.
// Purely presentational, derived entirely from fields the document already
// carries (ocr_status/ai_status/status/reviewed_at) - no extra API call.
import { CheckCircle2, Circle, Clock, FileSearch, Loader2, Sparkles, UserCheck, Upload, XCircle } from "lucide-react";
import { formatDateTime } from "../../utils/format";

const STATE_STYLES = {
  done: { icon: CheckCircle2, dot: "bg-success text-white", line: "bg-success" },
  current: { icon: Loader2, dot: "bg-primary text-white", line: "bg-line dark:bg-slate-700" },
  failed: { icon: XCircle, dot: "bg-danger text-white", line: "bg-line dark:bg-slate-700" },
  upcoming: { icon: Circle, dot: "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500", line: "bg-line dark:bg-slate-700" },
};

function buildSteps(doc) {
  const ocrDone = doc.ocr_status === "completed";
  const ocrState = ocrDone ? "done" : doc.ocr_status === "processing" ? "current" : doc.ocr_status === "failed" ? "failed" : "upcoming";

  const aiState = !ocrDone
    ? "upcoming"
    : doc.ai_status === "completed"
      ? "done"
      : doc.ai_status === "processing"
        ? "current"
        : doc.ai_status === "failed"
          ? "failed"
          : "upcoming";

  const reviewed = ["Approved", "Rejected", "Needs Correction", "Archived"].includes(doc.status);
  const reviewState = reviewed ? "done" : doc.ai_status === "completed" || doc.ai_status === "failed" ? "current" : "upcoming";
  const reviewLabel = reviewed ? doc.status : "Pending Review";

  return [
    { key: "uploaded", label: "Uploaded", icon: Upload, state: "done", timestamp: doc.upload_date },
    {
      key: "ocr",
      label: ocrState === "failed" ? "OCR Failed" : ocrState === "current" ? "OCR Processing" : "OCR Completed",
      icon: FileSearch,
      state: ocrState,
    },
    {
      key: "ai",
      label: aiState === "failed" ? "AI Failed" : aiState === "current" ? "AI Processing" : "AI Completed",
      icon: Sparkles,
      state: aiState,
    },
    {
      key: "review",
      label: reviewLabel,
      icon: UserCheck,
      state: reviewState,
      timestamp: doc.reviewed_at,
      remarks: doc.admin_remarks,
      reviewedBy: doc.reviewed_by,
    },
  ];
}

export default function DocumentTimeline({ document: doc }) {
  const steps = buildSteps(doc);

  return (
    <div className="rounded-xl border border-line p-4 dark:border-slate-800">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-100">
        <Clock className="h-4 w-4 text-primary" />
        Document timeline
      </h3>
      <ol className="space-y-0">
        {steps.map((step, index) => {
          const style = STATE_STYLES[step.state];
          const Icon = style.icon;
          const isLast = index === steps.length - 1;
          return (
            <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
              {!isLast && (
                <span className={`absolute left-[15px] top-8 h-full w-0.5 ${style.line}`} aria-hidden="true" />
              )}
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${style.dot}`}>
                <Icon className={`h-4 w-4 ${step.state === "current" ? "animate-spin" : ""}`} />
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-sm font-medium text-ink dark:text-slate-100">{step.label}</p>
                {step.timestamp && (
                  <p className="text-xs text-ink-soft">{formatDateTime(new Date(step.timestamp))}</p>
                )}
                {step.reviewedBy && (
                  <p className="text-xs text-ink-soft">by {step.reviewedBy}</p>
                )}
                {step.remarks && (
                  <p className="mt-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-ink-soft dark:bg-slate-800">
                    "{step.remarks}"
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
