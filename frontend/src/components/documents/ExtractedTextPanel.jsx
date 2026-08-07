// Renders inside the Document Viewer modal. Purely presentational - all
// polling/retry logic lives in the viewer, this just reacts to whatever
// ocr_status/ocr_text it's handed.
import { AlertCircle, CheckCircle2, Copy, Download, FileSearch, Loader2 } from "lucide-react";
import Button from "../ui/Button";
import { useToast } from "../../hooks/useToast";

function txtFilename(originalFilename) {
  const base = originalFilename.includes(".")
    ? originalFilename.slice(0, originalFilename.lastIndexOf("."))
    : originalFilename;
  return `${base}.txt`;
}

export default function ExtractedTextPanel({ ocrStatus, ocrText, ocrError, originalFilename, onRetry, isRetrying }) {
  const { showToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ocrText);
      showToast("Extracted text copied to clipboard", "success");
    } catch {
      showToast("Could not copy text", "error");
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([ocrText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = txtFilename(originalFilename);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-line dark:border-slate-800">
      <div className="flex items-center justify-between border-b border-line px-4 py-3 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-ink dark:text-slate-100">Extracted text</h3>

        {ocrStatus === "processing" && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Extracting text...
          </span>
        )}
        {ocrStatus === "completed" && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Text extraction complete
          </span>
        )}
        {ocrStatus === "failed" && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-danger">
            <AlertCircle className="h-3.5 w-3.5" />
            Text extraction failed
          </span>
        )}
      </div>

      <div className="p-4">
        {ocrStatus === "processing" && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm font-medium text-ink dark:text-slate-100">Extracting text...</p>
            <p className="text-xs text-ink-soft">Reading document content</p>
          </div>
        )}

        {ocrStatus === "failed" && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <AlertCircle className="h-6 w-6 text-danger" />
            <p className="text-sm font-medium text-danger">Text extraction failed</p>
            {ocrError && <p className="max-w-sm text-xs text-ink-soft">{ocrError}</p>}
            <Button variant="secondary" size="sm" onClick={onRetry} loading={isRetrying}>
              Retry OCR
            </Button>
          </div>
        )}

        {ocrStatus === "pending" && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <FileSearch className="h-6 w-6 text-ink-soft" />
            <p className="text-sm text-ink-soft">Text hasn&apos;t been extracted yet.</p>
            <Button variant="secondary" size="sm" onClick={onRetry} loading={isRetrying}>
              Extract text
            </Button>
          </div>
        )}

        {ocrStatus === "completed" && (
          <div className="space-y-3">
            <div className="scrollbar-thin max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3.5 text-sm text-ink dark:bg-slate-800 dark:text-slate-200">
              {ocrText}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-soft">{ocrText.length.toLocaleString()} characters</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={Copy} onClick={handleCopy}>
                  Copy text
                </Button>
                <Button variant="secondary" size="sm" icon={Download} onClick={handleDownloadTxt}>
                  Download .txt
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
