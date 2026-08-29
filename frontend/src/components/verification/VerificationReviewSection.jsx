// Trust & Verification review console ("The Bad Reading" challenge).
// Lists documents the automated layer classified NEEDS_REVIEW / FLAGGED or
// that were explicitly sent for review, and opens the full document viewer
// (which carries the Verification & Trust panel) to resolve them.
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import VerificationBadge from "./VerificationBadge";
import DocumentViewerModal from "../documents/DocumentViewerModal";
import { getDocumentRequest } from "../../api/documents";
import {
  getTrustReviewQueue,
  resetBadReadingDemo,
  seedBadReadingDemo,
} from "../../api/verification";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import { formatDateTime } from "../../utils/format";

export default function VerificationReviewSection() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdmin = user.role === "Admin";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [viewerDoc, setViewerDoc] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await getTrustReviewQueue();
      setRows(data);
    } catch {
      showToast("Unable to load the trust review queue.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openViewer = async (documentId) => {
    try {
      const { data } = await getDocumentRequest(documentId);
      setViewerDoc(data);
    } catch {
      showToast("Unable to open the document.", "error");
    }
  };

  const runDemo = async (key, fn, msg) => {
    setBusy(key);
    try {
      await fn();
      showToast(msg, "success");
      await load();
    } catch (err) {
      showToast(err.response?.data?.detail || "Action failed.", "error");
    } finally {
      setBusy("");
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">The Bad Reading</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-ink dark:text-slate-100">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Trust &amp; Verification
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Documents that need a human trust decision — auto-classified <em>Needs review</em>,{" "}
            <em>Flagged</em> or <em>Outdated</em>, or sent here for review. GovDocs AI does not
            treat uploads as authoritative by default.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={Sparkles}
                disabled={busy !== ""}
                loading={busy === "seed"}
                onClick={() => runDemo("seed", seedBadReadingDemo, "Demo scenario seeded.")}
              >
                Seed demo scenario
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={Trash2}
                disabled={busy !== ""}
                loading={busy === "reset"}
                onClick={() => runDemo("reset", resetBadReadingDemo, "Demo scenario removed.")}
              >
                Reset demo
              </Button>
            </>
          )}
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <Card padding="p-0" className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nothing awaiting a trust decision"
            description="Documents flagged or marked 'needs review' by the verification layer will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft dark:border-slate-800">
                  <th className="px-5 py-3">Document</th>
                  <th className="px-5 py-3">Assessment</th>
                  <th className="px-5 py-3">Trust</th>
                  <th className="px-5 py-3">Uploaded</th>
                  <th className="px-5 py-3">Review</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.document_id}
                    onClick={() => openViewer(r.document_id)}
                    className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink dark:text-slate-100">{r.title}</p>
                      <p className="text-xs text-ink-soft">{r.department} · {r.uploaded_by}</p>
                    </td>
                    <td className="px-5 py-3"><VerificationBadge status={r.status} /></td>
                    <td className="px-5 py-3 text-ink-soft">
                      {r.trust_score != null ? `${Math.round(r.trust_score)}/100` : "—"}
                      {r.trust_band ? ` · ${r.trust_band}` : ""}
                    </td>
                    <td className="px-5 py-3 text-ink-soft">
                      {r.upload_date ? formatDateTime(new Date(r.upload_date)) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={r.review_status === "pending_review" ? "warning" : "neutral"}>
                        {(r.review_status || "not_submitted").replace(/_/g, " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <DocumentViewerModal
        isOpen={Boolean(viewerDoc)}
        onClose={() => {
          setViewerDoc(null);
          load();
        }}
        document={viewerDoc}
      />
    </div>
  );
}
