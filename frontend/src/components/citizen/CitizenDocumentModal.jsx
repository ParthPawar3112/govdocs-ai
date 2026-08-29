// Citizen's read-only view of one of their own submissions. Reuses the same
// OriginalDocumentPanel + DocumentTimeline the staff viewer uses, but shows
// only status / result / summary / officer remarks - no OCR text panel, no
// confidence, no review controls (that boundary is also enforced server-side:
// the /api/citizen/documents payload simply doesn't carry those fields).
import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import StatusBadge from "../documents/StatusBadge";
import OriginalDocumentPanel from "../documents/OriginalDocumentPanel";
import DocumentTimeline from "../documents/DocumentTimeline";
import { fetchDocumentBlobRequest } from "../../api/documents";
import { getCitizenDocumentRequest } from "../../api/citizen";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../utils/format";

const POLL_INTERVAL_MS = 3000;
const IN_FLIGHT = new Set(["Uploaded", "OCR Processing", "AI Processing"]);

export default function CitizenDocumentModal({ isOpen, onClose, document: doc }) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [blobUrl, setBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [liveDoc, setLiveDoc] = useState(doc);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !doc) return undefined;
    let objectUrl;
    setIsLoading(true);
    setError("");
    fetchDocumentBlobRequest(doc.id)
      .then(({ data }) => {
        objectUrl = URL.createObjectURL(data);
        setBlobUrl(objectUrl);
      })
      .catch(() => setError("Could not load this document."))
      .finally(() => setIsLoading(false));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setBlobUrl(null);
    };
  }, [isOpen, doc]);

  useEffect(() => {
    if (!isOpen || !doc) return undefined;
    setLiveDoc(doc);
    let cancelled = false;

    const tick = async () => {
      try {
        const { data } = await getCitizenDocumentRequest(doc.id);
        if (cancelled) return;
        setLiveDoc(data);
        if (IN_FLIGHT.has(data.lifecycle_status)) {
          pollRef.current = setTimeout(tick, POLL_INTERVAL_MS);
        }
      } catch {
        /* keep last-known state; a transient poll failure isn't worth a banner */
      }
    };
    tick();

    return () => {
      cancelled = true;
      clearTimeout(pollRef.current);
    };
  }, [isOpen, doc]);

  const handleDownload = async () => {
    if (!doc) return;
    try {
      let url = blobUrl;
      let temp = false;
      if (!url) {
        const { data } = await fetchDocumentBlobRequest(doc.id);
        url = URL.createObjectURL(data);
        temp = true;
      }
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.original_filename;
      link.click();
      if (temp) URL.revokeObjectURL(url);
      showToast(`Downloading "${doc.original_filename}"`, "success");
    } catch {
      showToast("Download failed. Please try again.", "error");
    }
  };

  if (!doc) return null;
  const view = liveDoc || doc;
  // DocumentTimeline reads `admin_remarks`; our payload calls it `officer_remarks`.
  const timelineDoc = { ...view, admin_remarks: view.officer_remarks };
  const needsAttention = ["Needs Correction", "Rejected"].includes(view.status);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={view.title} size="xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={view.lifecycle_status} />
          <span className="text-xs text-ink-soft">
            Submitted {formatDateTime(new Date(view.upload_date))}
          </span>
        </div>

        <OriginalDocumentPanel
          document={view}
          blobUrl={blobUrl}
          isLoading={isLoading}
          error={error}
          onDownload={handleDownload}
        />

        <DocumentTimeline document={timelineDoc} />

        {needsAttention && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-500/30 dark:bg-orange-500/10">
            <p className="font-semibold text-orange-700 dark:text-orange-400">
              {view.status === "Needs Correction" ? "This document needs correction" : "This document was rejected"}
            </p>
            {view.officer_remarks && (
              <p className="mt-1 text-orange-800 dark:text-orange-300">
                Officer remark: &ldquo;{view.officer_remarks}&rdquo;
              </p>
            )}
            {view.status === "Needs Correction" && (
              <p className="mt-2 text-xs text-orange-700 dark:text-orange-400">
                Review the remark, then submit a corrected document from the Upload Document page.
              </p>
            )}
          </div>
        )}

        {view.ai_summary && (
          <div className="rounded-xl border border-line p-4 dark:border-slate-800">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-100">
              <Sparkles className="h-4 w-4 text-primary" />
              AI summary
            </h3>
            {view.ai_title && (
              <p className="text-sm font-medium text-ink dark:text-slate-100">{view.ai_title}</p>
            )}
            <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{view.ai_summary}</p>
            {view.ai_category && (
              <p className="mt-2 text-xs text-ink-soft">
                Category: <span className="font-medium text-ink dark:text-slate-200">{view.ai_category}</span>
              </p>
            )}
            {Array.isArray(view.ai_keywords) && view.ai_keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {view.ai_keywords.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-ink-soft dark:bg-slate-800"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl border border-line p-4 text-sm dark:border-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-ink dark:text-slate-100">Submission details</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            <p className="flex items-center justify-between gap-3 text-ink-soft">
              <span>Uploaded by</span>
              <span className="text-ink dark:text-slate-100">{user?.full_name || user?.username}</span>
            </p>
            <p className="flex items-center justify-between gap-3 text-ink-soft">
              <span>Citizen ID</span>
              <span className="text-ink dark:text-slate-100">{user?.citizen_id || "—"}</span>
            </p>
            <p className="flex items-center justify-between gap-3 text-ink-soft">
              <span>File</span>
              <span className="truncate text-ink dark:text-slate-100">{view.original_filename}</span>
            </p>
            <p className="flex items-center justify-between gap-3 text-ink-soft">
              <span>Department</span>
              <span className="text-ink dark:text-slate-100">{view.department}</span>
            </p>
            <p className="flex items-center justify-between gap-3 text-ink-soft">
              <span>OCR</span>
              <span className="capitalize text-ink dark:text-slate-100">{view.ocr_status}</span>
            </p>
            <p className="flex items-center justify-between gap-3 text-ink-soft">
              <span>AI analysis</span>
              <span className="capitalize text-ink dark:text-slate-100">{view.ai_status}</span>
            </p>
            {view.reviewed_at && (
              <p className="flex items-center justify-between gap-3 text-ink-soft">
                <span>Reviewed</span>
                <span className="text-ink dark:text-slate-100">
                  {formatDateTime(new Date(view.reviewed_at))}
                </span>
              </p>
            )}
          </div>
          <div className="mt-4 border-t border-line pt-4 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              Download my document
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
