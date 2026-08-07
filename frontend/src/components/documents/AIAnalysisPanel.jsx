// Shown only once OCR has completed (see DocumentViewerModal), since AI
// analysis has nothing to work from until then. Purely presentational -
// polling/retry logic lives in the viewer.
//
// Icon choice: the brief specifies emoji (📝🏢📂📄🏷🎯❌⚠) as a content
// spec, but this design system uses Lucide icons everywhere else (sidebar,
// navbar, stat cards). Emoji here would look inconsistent/generic next to
// that. Using the equivalent Lucide icon for each labeled field is the more
// faithful way to "integrate beautifully into the current UI", per the
// brief's own instruction not to introduce a different visual language.
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileText,
  FolderOpen,
  Loader2,
  Sparkles,
  Tag,
  Target,
  XCircle,
} from "lucide-react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

const STATUS_BADGE = {
  pending: { tone: "neutral", label: "Not analyzed yet" },
  processing: { tone: "primary", label: "Analyzing..." },
  completed: { tone: "success", label: "Analyzed" },
  failed: { tone: "danger", label: "Failed" },
};

function ConfidenceBar({ value }) {
  const tone = value >= 80 ? "bg-success" : value >= 60 ? "bg-primary" : "bg-danger";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className={`h-full rounded-full transition-all duration-500 ${tone}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function FieldRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-50 dark:bg-primary/15">
        <Icon className="h-4 w-4 text-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
        <div className="mt-0.5 text-sm text-ink dark:text-slate-100">{children}</div>
      </div>
    </div>
  );
}

export default function AIAnalysisPanel({ aiStatus, document: doc, onRetry, isRetrying }) {
  const badge = STATUS_BADGE[aiStatus] ?? STATUS_BADGE.pending;

  return (
    <div className="rounded-xl border border-line bg-white/70 shadow-glass backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex items-center justify-between border-b border-line/70 px-4 py-3 dark:border-slate-800/70">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-100">
          <Sparkles className="h-4 w-4 text-primary" />
          AI analysis
        </h3>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>

      <div className="p-4">
        {aiStatus === "processing" && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm font-medium text-ink dark:text-slate-100">AI analysis in progress...</p>
            <p className="text-xs text-ink-soft">Extracting metadata and understanding document</p>
          </div>
        )}

        {aiStatus === "pending" && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <Sparkles className="h-6 w-6 text-ink-soft" />
            <p className="text-sm text-ink-soft">This document hasn&apos;t been analyzed yet.</p>
            <Button variant="secondary" size="sm" onClick={onRetry} loading={isRetrying}>
              Run AI analysis
            </Button>
          </div>
        )}

        {aiStatus === "failed" && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <XCircle className="h-6 w-6 text-danger" />
            <p className="text-sm font-medium text-danger">AI analysis failed</p>
            {doc.ai_error && <p className="max-w-sm text-xs text-ink-soft">{doc.ai_error}</p>}
            <Button variant="secondary" size="sm" onClick={onRetry} loading={isRetrying}>
              Retry AI
            </Button>
          </div>
        )}

        {aiStatus === "completed" && (
          <div className="space-y-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" />
              Document processing complete
            </p>
            <FieldRow icon={FileText} label="Title">
              {doc.ai_title}
            </FieldRow>
            <FieldRow icon={Building2} label="Department">
              {doc.ai_department}
            </FieldRow>
            <FieldRow icon={FolderOpen} label="Category">
              {doc.ai_category}
            </FieldRow>
            <FieldRow icon={FileText} label="Summary">
              <p className="leading-relaxed text-ink-soft">{doc.ai_summary}</p>
            </FieldRow>

            {doc.ai_keywords?.length > 0 && (
              <FieldRow icon={Tag} label="Keywords">
                <div className="flex flex-wrap gap-1.5">
                  {doc.ai_keywords.map((keyword) => (
                    <Badge key={keyword} tone="neutral">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </FieldRow>
            )}

            <FieldRow icon={Target} label="Confidence">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <ConfidenceBar value={doc.ai_confidence ?? 0} />
                </div>
                <span className="text-xs font-semibold text-ink-soft">
                  {Math.round(doc.ai_confidence ?? 0)}%
                </span>
              </div>
              {doc.ai_confidence != null && doc.ai_confidence < 60 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Low confidence - consider reviewing manually
                </p>
              )}
            </FieldRow>
          </div>
        )}
      </div>
    </div>
  );
}
