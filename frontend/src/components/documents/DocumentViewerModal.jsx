// Fetches the file through the authenticated API (not a raw <iframe src>,
// since that can't carry a Bearer token) and previews it via an object URL.
// Also tracks the document's OCR and AI state: fetches the latest record on
// open, and polls while EITHER ocr_status or ai_status is "processing" -
// covers viewing a document moments after upload, while OCR and then AI
// (which starts right after OCR finishes) are both still running.
import { useEffect, useRef, useState } from "react";
import { FileJson, FileText as FileTextIcon } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import OriginalDocumentPanel from "./OriginalDocumentPanel";
import ExtractedTextPanel from "./ExtractedTextPanel";
import AIAnalysisPanel from "./AIAnalysisPanel";
import DocumentTimeline from "./DocumentTimeline";
import {
  extractMetadataRequest,
  extractTextRequest,
  fetchDocumentBlobRequest,
  fetchSummaryPdfRequest,
  getDocumentRequest,
} from "../../api/documents";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../utils/format";

const POLL_INTERVAL_MS = 2500;

export default function DocumentViewerModal({ isOpen, onClose, document: doc }) {
  const { showToast } = useToast();
  const [blobUrl, setBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [liveDoc, setLiveDoc] = useState(doc);
  const [isRetryingOcr, setIsRetryingOcr] = useState(false);
  const [isRetryingAi, setIsRetryingAi] = useState(false);
  const pollTimerRef = useRef(null);
  const prevStatusRef = useRef({ ocr: null, ai: null });

  // File preview - unchanged from Phase 4, just the blob-fetch part.
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

  // OCR + AI state - fetch fresh on open, then poll while either is in
  // flight. AI only ever starts once OCR completes, so this one loop
  // naturally covers both stages in sequence.
  useEffect(() => {
    if (!isOpen || !doc) return undefined;

    setLiveDoc(doc);
    prevStatusRef.current = { ocr: doc.ocr_status, ai: doc.ai_status };
    let isCancelled = false;

    const fetchLatest = async () => {
      try {
        const { data } = await getDocumentRequest(doc.id);
        if (isCancelled) return;
        setLiveDoc(data);

        const prev = prevStatusRef.current;
        if (prev.ocr === "processing" && data.ocr_status === "completed") {
          showToast("OCR completed successfully", "success");
        } else if (prev.ocr === "processing" && data.ocr_status === "failed") {
          showToast("OCR failed to extract text", "error");
        }
        if (prev.ai === "processing" && data.ai_status === "completed") {
          showToast("AI analysis completed", "success");
        } else if (prev.ai === "processing" && data.ai_status === "failed") {
          showToast("AI analysis failed", "error");
        }
        prevStatusRef.current = { ocr: data.ocr_status, ai: data.ai_status };

        if (data.ocr_status === "processing" || data.ai_status === "processing") {
          pollTimerRef.current = setTimeout(fetchLatest, POLL_INTERVAL_MS);
        }
      } catch {
        // Viewer already has the last-known doc state; a transient poll
        // failure isn't worth surfacing as an error banner.
      }
    };

    fetchLatest();

    return () => {
      isCancelled = true;
      clearTimeout(pollTimerRef.current);
    };
  }, [isOpen, doc]);

  const handleRetryOcr = async () => {
    if (!liveDoc) return;
    setIsRetryingOcr(true);
    try {
      const { data } = await extractTextRequest(liveDoc.id);
      setLiveDoc(data);
      showToast("OCR completed successfully", "success");
      // The retry endpoint schedules AI as a background task on success -
      // resume polling so the AI Analysis panel picks up its progress.
      if (data.ai_status === "processing") {
        pollTimerRef.current = setTimeout(async () => {
          const { data: refreshed } = await getDocumentRequest(liveDoc.id);
          setLiveDoc(refreshed);
        }, POLL_INTERVAL_MS);
      }
    } catch (requestError) {
      const message = requestError.response?.data?.detail || "Unable to extract text.";
      showToast(message, "error");
      // Reflect the failure immediately rather than waiting on a poll -
      // the backend has already recorded it in its in-memory tracker.
      setLiveDoc((current) => ({ ...current, ocr_status: "failed" }));
    } finally {
      setIsRetryingOcr(false);
    }
  };

  const handleRetryAi = async () => {
    if (!liveDoc) return;
    setIsRetryingAi(true);
    try {
      const { data } = await extractMetadataRequest(liveDoc.id);
      setLiveDoc(data);
      showToast("AI analysis started", "success");
      // Background task - resume polling until it resolves.
      pollTimerRef.current = setTimeout(async function poll() {
        const { data: refreshed } = await getDocumentRequest(liveDoc.id);
        setLiveDoc(refreshed);
        if (refreshed.ai_status === "processing") {
          pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }, POLL_INTERVAL_MS);
    } catch (requestError) {
      const message = requestError.response?.data?.detail || "Unable to run AI analysis.";
      showToast(message, "error");
    } finally {
      setIsRetryingAi(false);
    }
  };

  const handleDownload = async () => {
    if (!doc) return;
    try {
      // Fast path: reuse the already-fetched preview blob. Fallback: the
      // inline preview may have failed to load (e.g. a transient network
      // error) while the file itself is still perfectly downloadable, so
      // fetch it fresh through the same authenticated endpoint.
      let url = blobUrl;
      let isTemporaryUrl = false;
      if (!url) {
        const { data } = await fetchDocumentBlobRequest(doc.id);
        url = URL.createObjectURL(data);
        isTemporaryUrl = true;
      }
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.original_filename;
      link.click();
      if (isTemporaryUrl) URL.revokeObjectURL(url);
      showToast(`Downloading "${doc.original_filename}"`, "success");
    } catch {
      showToast("Download failed. Please try again.", "error");
    }
  };

  // Phase 8 - client-side blob from data already on liveDoc, matching the
  // existing ExtractedTextPanel .txt download pattern - no backend round trip.
  const handleDownloadAiMetadata = () => {
    if (!liveDoc) return;
    const metadata = {
      title: liveDoc.ai_title,
      summary: liveDoc.ai_summary,
      department: liveDoc.ai_department,
      category: liveDoc.ai_category,
      keywords: liveDoc.ai_keywords,
      confidence: liveDoc.ai_confidence,
    };
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${liveDoc.title}-ai-metadata.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("AI metadata JSON downloaded", "success");
  };

  const handleDownloadSummaryPdf = async () => {
    if (!doc) return;
    try {
      const { data } = await fetchSummaryPdfRequest(doc.id);
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${doc.title}-summary.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Summary report downloaded", "success");
    } catch {
      showToast("Could not generate summary report.", "error");
    }
  };

  if (!doc) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={doc.title} size="xl">
      <div className="space-y-4">
        {/* 1. Original Document */}
        <OriginalDocumentPanel document={doc} blobUrl={blobUrl} isLoading={isLoading} error={error} onDownload={handleDownload} />

        {/* 2. Processing Timeline */}
        {liveDoc && <DocumentTimeline document={liveDoc} />}

        {/* 3. Extracted Text */}
        {liveDoc && (
          <ExtractedTextPanel
            ocrStatus={liveDoc.ocr_status}
            ocrText={liveDoc.ocr_text}
            ocrError={liveDoc.ocr_error}
            originalFilename={doc.original_filename}
            onRetry={handleRetryOcr}
            isRetrying={isRetryingOcr}
          />
        )}

        {/* 4. AI Analysis - only makes sense once there's OCR text to
            analyze, matches the brief's trigger condition exactly. */}
        {liveDoc && liveDoc.ocr_status === "completed" && (
          <AIAnalysisPanel
            aiStatus={liveDoc.ai_status}
            document={liveDoc}
            onRetry={handleRetryAi}
            isRetrying={isRetryingAi}
          />
        )}

        {/* 5. Document Metadata / Actions */}
        <div className="rounded-xl border border-line p-4 dark:border-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-ink dark:text-slate-100">Document details</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <p className="flex items-center justify-between gap-3 text-ink-soft">
              <span>File</span>
              <span className="truncate text-ink dark:text-slate-100">{doc.original_filename}</span>
            </p>
            <p className="flex items-center justify-between gap-3 text-ink-soft">
              <span>Size</span>
              <span className="text-ink dark:text-slate-100">{(doc.filesize / 1024).toFixed(0)} KB</span>
            </p>
            <p className="flex items-center justify-between gap-3 text-ink-soft">
              <span>Department</span>
              <span className="text-ink dark:text-slate-100">{doc.department}</span>
            </p>
            <p className="flex items-center justify-between gap-3 text-ink-soft">
              <span>Uploaded</span>
              <span className="text-ink dark:text-slate-100">{formatDateTime(new Date(doc.upload_date))}</span>
            </p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4 dark:border-slate-800">
            <Button variant="secondary" size="sm" icon={FileJson} onClick={handleDownloadAiMetadata} disabled={!liveDoc?.ai_processed}>
              AI metadata JSON
            </Button>
            <Button variant="secondary" size="sm" icon={FileTextIcon} onClick={handleDownloadSummaryPdf}>
              Summary PDF
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
