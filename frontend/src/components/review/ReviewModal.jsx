// Phase 8 - the Admin decision screen: OCR text, editable AI metadata,
// timeline, and Approve/Reject/Send Back with remarks. Reuses the same
// standalone panels DocumentViewerModal uses (ExtractedTextPanel,
// DocumentTimeline) rather than re-implementing them.
import { useEffect, useState } from "react";
import { CheckCircle2, RotateCcw, Undo2, XCircle } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import ExtractedTextPanel from "../documents/ExtractedTextPanel";
import DocumentTimeline from "../documents/DocumentTimeline";
import { extractTextRequest, getDocumentRequest, updateDocumentRequest } from "../../api/documents";
import { reviewDocumentRequest } from "../../api/review";
import { useToast } from "../../hooks/useToast";

const emptyForm = { ai_title: "", ai_summary: "", ai_department: "", ai_category: "", ai_keywords: "", ai_confidence: "" };

function toForm(doc) {
  if (!doc) return emptyForm;
  return {
    ai_title: doc.ai_title || "",
    ai_summary: doc.ai_summary || "",
    ai_department: doc.ai_department || "",
    ai_category: doc.ai_category || "",
    ai_keywords: (doc.ai_keywords || []).join(", "),
    ai_confidence: doc.ai_confidence ?? "",
  };
}

export default function ReviewModal({ isOpen, onClose, document: doc, onReviewed }) {
  const { showToast } = useToast();
  const [liveDoc, setLiveDoc] = useState(doc);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [isRetryingOcr, setIsRetryingOcr] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [activeAction, setActiveAction] = useState(null);

  useEffect(() => {
    if (!isOpen || !doc) return;
    setRemarks("");
    setIsLoading(true);
    getDocumentRequest(doc.id)
      .then(({ data }) => {
        setLiveDoc(data);
        setForm(toForm(data));
      })
      .catch(() => setLiveDoc(doc))
      .finally(() => setIsLoading(false));
  }, [isOpen, doc]);

  if (!doc) return null;

  const handleSaveMetadata = async () => {
    setIsSavingMetadata(true);
    try {
      const { data } = await updateDocumentRequest(doc.id, {
        ai_title: form.ai_title || null,
        ai_summary: form.ai_summary || null,
        ai_department: form.ai_department || null,
        ai_category: form.ai_category || null,
        ai_keywords: form.ai_keywords ? form.ai_keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
        ai_confidence: form.ai_confidence === "" ? null : Number(form.ai_confidence),
      });
      setLiveDoc(data);
      showToast("AI metadata updated successfully", "success");
    } catch (error) {
      showToast(error.response?.data?.detail || "Could not save metadata changes.", "error");
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const handleRetryOcr = async () => {
    setIsRetryingOcr(true);
    try {
      const { data } = await extractTextRequest(doc.id);
      setLiveDoc(data);
      setForm(toForm(data));
      showToast("OCR completed successfully", "success");
    } catch (error) {
      showToast(error.response?.data?.detail || "Unable to extract text.", "error");
    } finally {
      setIsRetryingOcr(false);
    }
  };

  const handleReview = async (action) => {
    setActiveAction(action);
    try {
      await reviewDocumentRequest(doc.id, { action, remarks: remarks.trim() || null });
      const labels = { approve: "Document approved", reject: "Document rejected", send_back: "Sent back for corrections" };
      showToast(labels[action], "success");
      onReviewed?.();
      onClose();
    } catch (error) {
      showToast(error.response?.data?.detail || "Review action failed.", "error");
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Review: ${doc.title}`} size="xl">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-ink-soft">
            {doc.department} &middot; Uploaded by {doc.uploaded_by}
          </p>
          {liveDoc && <Badge tone="warning">{liveDoc.lifecycle_status}</Badge>}
        </div>

        {liveDoc && (
          <ExtractedTextPanel
            ocrStatus={liveDoc.ocr_status}
            ocrText={liveDoc.ocr_text}
            originalFilename={doc.original_filename}
            onRetry={handleRetryOcr}
            isRetrying={isRetryingOcr}
          />
        )}

        <div className="rounded-xl border border-line p-4 dark:border-slate-800">
          <h3 className="mb-4 text-sm font-semibold text-ink dark:text-slate-100">Edit AI metadata</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">Title</span>
              <input
                value={form.ai_title}
                onChange={(e) => setForm((f) => ({ ...f, ai_title: e.target.value }))}
                className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">Department</span>
              <input
                value={form.ai_department}
                onChange={(e) => setForm((f) => ({ ...f, ai_department: e.target.value }))}
                className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">Category</span>
              <input
                value={form.ai_category}
                onChange={(e) => setForm((f) => ({ ...f, ai_category: e.target.value }))}
                className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">Summary</span>
              <textarea
                value={form.ai_summary}
                onChange={(e) => setForm((f) => ({ ...f, ai_summary: e.target.value }))}
                rows={3}
                className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">Keywords (comma-separated)</span>
              <input
                value={form.ai_keywords}
                onChange={(e) => setForm((f) => ({ ...f, ai_keywords: e.target.value }))}
                className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">Confidence (0-100)</span>
              <input
                type="number"
                min="0"
                max="100"
                value={form.ai_confidence}
                onChange={(e) => setForm((f) => ({ ...f, ai_confidence: e.target.value }))}
                className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" size="sm" icon={RotateCcw} onClick={handleSaveMetadata} loading={isSavingMetadata} disabled={isLoading}>
              Save metadata changes
            </Button>
          </div>
        </div>

        {liveDoc && <DocumentTimeline document={liveDoc} />}

        <div className="rounded-xl border border-line p-4 dark:border-slate-800">
          <h3 className="mb-2 text-sm font-semibold text-ink dark:text-slate-100">Review decision</h3>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
              Remarks <span className="font-normal text-ink-soft">(shown to the uploading Officer)</span>
            </span>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Optional notes about this decision..."
              className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <Button variant="secondary" icon={Undo2} onClick={() => handleReview("send_back")} loading={activeAction === "send_back"} disabled={Boolean(activeAction)}>
              Send back
            </Button>
            <Button variant="danger" icon={XCircle} onClick={() => handleReview("reject")} loading={activeAction === "reject"} disabled={Boolean(activeAction)}>
              Reject
            </Button>
            <Button icon={CheckCircle2} onClick={() => handleReview("approve")} loading={activeAction === "approve"} disabled={Boolean(activeAction)}>
              Approve
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
