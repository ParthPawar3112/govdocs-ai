// Fetches the file through the authenticated API (not a raw <iframe src>,
// since that can't carry a Bearer token) and previews it via an object URL.
// Also tracks the document's OCR state: fetches the latest record on open,
// and polls while ocr_status is "processing" (e.g. viewing a document
// moments after upload, while background OCR is still running).
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import ExtractedTextPanel from "./ExtractedTextPanel";
import { extractTextRequest, fetchDocumentBlobRequest, getDocumentRequest } from "../../api/documents";
import { useToast } from "../../hooks/useToast";

const POLL_INTERVAL_MS = 2500;

export default function DocumentViewerModal({ isOpen, onClose, document: doc }) {
  const { showToast } = useToast();
  const [blobUrl, setBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [liveDoc, setLiveDoc] = useState(doc);
  const [isRetrying, setIsRetrying] = useState(false);
  const pollTimerRef = useRef(null);

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

  // OCR state - fetch fresh on open, then poll only while processing.
  useEffect(() => {
    if (!isOpen || !doc) return undefined;

    setLiveDoc(doc);
    let isCancelled = false;

    const fetchLatest = async () => {
      try {
        const { data } = await getDocumentRequest(doc.id);
        if (isCancelled) return;
        setLiveDoc(data);
        if (data.ocr_status === "processing") {
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
    setIsRetrying(true);
    try {
      const { data } = await extractTextRequest(liveDoc.id);
      setLiveDoc(data);
      showToast("OCR completed successfully", "success");
    } catch (requestError) {
      const message = requestError.response?.data?.detail || "Unable to extract text.";
      showToast(message, "error");
      // Reflect the failure immediately rather than waiting on a poll -
      // the backend has already recorded it in its in-memory tracker.
      setLiveDoc((current) => ({ ...current, ocr_status: "failed" }));
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDownload = () => {
    if (!blobUrl || !doc) return;
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = doc.original_filename;
    link.click();
    showToast(`Downloading "${doc.original_filename}"`, "success");
  };

  if (!doc) return null;

  const isImage = ["jpg", "jpeg", "png"].includes(doc.filetype);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={doc.title} size="xl">
      <div className="space-y-4">
        <div className="flex min-h-[50vh] items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800">
          {isLoading && <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />}
          {error && (
            <div className="flex flex-col items-center gap-2 text-danger">
              <AlertCircle className="h-6 w-6" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          {!isLoading && !error && blobUrl && isImage && (
            <img src={blobUrl} alt={doc.title} className="max-h-[70vh] rounded-lg object-contain" />
          )}
          {!isLoading && !error && blobUrl && !isImage && (
            <iframe src={blobUrl} title={doc.title} className="h-[70vh] w-full rounded-xl" />
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-ink-soft">
            {doc.original_filename} &middot; {(doc.filesize / 1024).toFixed(0)} KB
          </p>
          <Button icon={Download} onClick={handleDownload} disabled={!blobUrl}>
            Download
          </Button>
        </div>

        {liveDoc && (
          <ExtractedTextPanel
            ocrStatus={liveDoc.ocr_status}
            ocrText={liveDoc.ocr_text}
            originalFilename={doc.original_filename}
            onRetry={handleRetryOcr}
            isRetrying={isRetrying}
          />
        )}
      </div>
    </Modal>
  );
}
