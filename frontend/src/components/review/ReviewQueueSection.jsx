// Phase 8 - Admin Review Dashboard. Lists every "Pending" document (the
// full Officer-uploaded queue, including ones still mid-OCR/AI - the
// lifecycle status badge makes readiness obvious at a glance) and opens
// ReviewModal for the approve/reject/send-back decision.
import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, Eye } from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import Button from "../ui/Button";
import StatusBadge from "../documents/StatusBadge";
import DocumentViewerModal from "../documents/DocumentViewerModal";
import ReviewModal from "./ReviewModal";
import { listDocumentsRequest } from "../../api/documents";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../utils/format";

const NOT_READY_STATUSES = ["Uploaded", "OCR Processing", "AI Processing"];

export default function ReviewQueueSection() {
  const { showToast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerDoc, setViewerDoc] = useState(null);
  const [reviewDoc, setReviewDoc] = useState(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await listDocumentsRequest({ status: "Pending", sort: "oldest", limit: 50 });
      setDocuments(data.items);
    } catch {
      showToast("Could not load the review queue.", "error");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Review Queue</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-slate-100">
          Documents awaiting review
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Approve, reject, or send back documents uploaded by Officers.
        </p>
      </div>

      <Card padding="p-0" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft dark:border-slate-800">
                {["Document", "Department", "Uploaded by", "Upload date", "Status", "Actions"].map((col) => (
                  <th key={col} className="whitespace-nowrap px-5 py-3 font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-slate-800">
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4" colSpan={6}>
                      <Skeleton className="h-5 w-full rounded-md" />
                    </td>
                  </tr>
                ))}

              {!isLoading && documents.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={ClipboardCheck}
                      title="Nothing to review"
                      description="Every uploaded document has been reviewed. New uploads will appear here."
                    />
                  </td>
                </tr>
              )}

              {!isLoading &&
                documents.map((doc) => {
                  const canReview = !NOT_READY_STATUSES.includes(doc.lifecycle_status);
                  return (
                    <tr key={doc.id} className="animate-fadeIn transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="max-w-xs truncate px-5 py-3.5 font-medium text-ink dark:text-slate-100">
                        {doc.title}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">{doc.department}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">{doc.uploaded_by}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">
                        {formatDateTime(new Date(doc.upload_date))}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <StatusBadge status={doc.lifecycle_status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" icon={Eye} onClick={() => setViewerDoc(doc)}>
                            View
                          </Button>
                          <Button size="sm" icon={ClipboardCheck} onClick={() => setReviewDoc(doc)} disabled={!canReview}>
                            Review
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      <DocumentViewerModal isOpen={Boolean(viewerDoc)} onClose={() => setViewerDoc(null)} document={viewerDoc} />

      <ReviewModal
        isOpen={Boolean(reviewDoc)}
        onClose={() => setReviewDoc(null)}
        document={reviewDoc}
        onReviewed={fetchQueue}
      />
    </div>
  );
}
