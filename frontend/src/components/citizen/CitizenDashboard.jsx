// Citizen landing page. Deliberately simple: a plain-language value statement,
// identity, a five-count summary of the citizen's own documents, and their
// most recent submissions. No repository-wide stats, no admin widgets.
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Hash,
  RotateCcw,
  ScanLine,
  Upload,
  UserCheck,
  XCircle,
} from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import StatCard from "../dashboard/StatCard";
import { StatCardSkeleton } from "../ui/Skeleton";
import EmptyState from "../ui/EmptyState";
import StatusBadge from "../documents/StatusBadge";
import CitizenDocumentModal from "./CitizenDocumentModal";
import { getCitizenDashboardRequest } from "../../api/citizen";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../utils/format";

const EMPTY_STATS = {
  total: 0,
  processing: 0,
  awaiting_review: 0,
  needs_correction: 0,
  approved: 0,
  rejected: 0,
};

const PROCESS_STEPS = [
  { icon: Upload, label: "Upload" },
  { icon: ScanLine, label: "OCR & AI Processing" },
  { icon: UserCheck, label: "Officer Review" },
  { icon: CheckCircle2, label: "Decision" },
];

export default function CitizenDashboard({ user, onNavigate }) {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let mounted = true;
    getCitizenDashboardRequest()
      .then(({ data: payload }) => {
        if (mounted) setData(payload);
      })
      .catch(() => {
        if (mounted) showToast("Unable to load dashboard.", "error");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [showToast]);

  const stats = data?.stats ?? EMPTY_STATS;
  const fullName = data?.full_name || user.full_name || user.username;
  const citizenId = data?.citizen_id || user.citizen_id;
  const recent = data?.recent ?? [];

  const cards = [
    { key: "total", label: "Total documents", value: stats.total, icon: FileText, tone: "primary" },
    { key: "processing", label: "Processing", value: stats.processing, icon: Clock, tone: "warning" },
    { key: "needs_correction", label: "Needs correction", value: stats.needs_correction, icon: RotateCcw, tone: "danger" },
    { key: "approved", label: "Approved", value: stats.approved, icon: CheckCircle2, tone: "success" },
    { key: "rejected", label: "Rejected", value: stats.rejected, icon: XCircle, tone: "danger" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Citizen Portal</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-slate-100">
            Welcome, {fullName}
          </h1>
          {citizenId && (
            <Badge tone="primary" className="mt-2">
              <Hash className="h-3 w-3" />
              Citizen ID: {citizenId}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => onNavigate("my-documents")}>
            My Documents
          </Button>
          <Button icon={Upload} onClick={() => onNavigate("upload")}>
            Upload Document
          </Button>
        </div>
      </div>

      {/* Value proposition - answers "why submit here?" in one line + the flow. */}
      <Card className="mb-6 border-l-4 border-l-primary">
        <p className="text-sm font-semibold text-ink dark:text-slate-100">
          Submit your documents online and track their progress without repeated follow-ups.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs font-medium text-ink-soft">
          {PROCESS_STEPS.map(({ icon: Icon, label }, index) => (
            <span key={label} className="flex items-center gap-2">
              {index > 0 && <ArrowRight className="h-3.5 w-3.5 text-slate-400" />}
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
              </span>
            </span>
          ))}
        </div>
      </Card>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {isLoading
          ? cards.map((c) => <StatCardSkeleton key={c.key} />)
          : cards.map(({ key, ...card }) => <StatCard key={key} {...card} />)}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" padding="p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-ink dark:text-slate-100">Recent documents</h2>
            <button
              type="button"
              onClick={() => onNavigate("my-documents")}
              className="text-xs font-semibold text-primary hover:text-primary-dark"
            >
              View all
            </button>
          </div>
          {isLoading ? (
            <div className="p-5 text-sm text-ink-soft">Loading documents…</div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents submitted yet"
              description="Upload a document to start tracking its processing and officer review here."
            />
          ) : (
            <ul className="divide-y divide-line dark:divide-slate-800">
              {recent.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(doc)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink dark:text-slate-100">
                        {doc.title}
                      </span>
                      <span className="block text-xs text-ink-soft">
                        Submitted {formatDateTime(new Date(doc.upload_date))}
                      </span>
                    </span>
                    <StatusBadge status={doc.lifecycle_status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-ink dark:text-slate-100">Track status</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Each document you submit moves through OCR, AI analysis, and officer review. You can
            open any document in <span className="font-medium text-ink dark:text-slate-200">My Documents</span> to
            see its current stage and any officer remarks.
          </p>
          <p className="mt-3 text-xs text-ink-soft">
            This reduces unnecessary follow-up visits. It does not remove every office visit or
            guarantee approval.
          </p>
          {stats.awaiting_review > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              {stats.awaiting_review} document{stats.awaiting_review > 1 ? "s" : ""} awaiting officer review.
            </p>
          )}
        </Card>
      </section>

      <CitizenDocumentModal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        document={selected}
      />
    </div>
  );
}
