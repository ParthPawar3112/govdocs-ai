// Original Document section of the Document Viewer. Purely presentational -
// DocumentViewerModal owns the blob fetch/loading/error state (it already
// fetches the file through the authenticated API, see that file's header
// comment) and passes it down here, same separation as ExtractedTextPanel/
// AIAnalysisPanel. Images get zoom controls; PDFs use the browser's own
// native PDF viewer (already true via the existing <iframe> - no extra
// PDF library needed) so no custom zoom UI is shown for them.
import { useState } from "react";
import { AlertCircle, Download, Loader2, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import Button from "../ui/Button";

const ZOOM_STEP = 25;
const ZOOM_MIN = 50;
const ZOOM_MAX = 300;

export default function OriginalDocumentPanel({ document: doc, blobUrl, isLoading, error, onDownload }) {
  const [zoomMode, setZoomMode] = useState("fit"); // "fit" | "manual"
  const [zoomPercent, setZoomPercent] = useState(100);

  const isImage = ["jpg", "jpeg", "png"].includes(doc.filetype);

  const zoomIn = () => {
    setZoomMode("manual");
    setZoomPercent((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
  };
  const zoomOut = () => {
    setZoomMode("manual");
    setZoomPercent((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
  };
  const resetZoom = () => {
    setZoomMode("manual");
    setZoomPercent(100);
  };
  const fitToView = () => {
    setZoomMode("fit");
    setZoomPercent(100);
  };

  return (
    <div className="rounded-xl border border-line dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-ink dark:text-slate-100">Original document</h3>

        <div className="flex flex-wrap items-center gap-2">
          {isImage && !isLoading && !error && (
            <div className="flex items-center gap-0.5 rounded-lg border border-line p-0.5 dark:border-slate-700">
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoomMode === "manual" && zoomPercent <= ZOOM_MIN}
                className="rounded-md p-1.5 text-ink-soft transition hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
                aria-label="Zoom out"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="w-11 text-center text-xs font-medium tabular-nums text-ink-soft">
                {zoomMode === "fit" ? "Fit" : `${zoomPercent}%`}
              </span>
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoomMode === "manual" && zoomPercent >= ZOOM_MAX}
                className="rounded-md p-1.5 text-ink-soft transition hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
                aria-label="Zoom in"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <span className="mx-0.5 h-4 w-px bg-line dark:bg-slate-700" aria-hidden="true" />
              <button
                type="button"
                onClick={resetZoom}
                className="rounded-md p-1.5 text-ink-soft transition hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800"
                aria-label="Reset zoom to 100%"
                title="Reset zoom (100%)"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={fitToView}
                className="rounded-md p-1.5 text-ink-soft transition hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800"
                aria-label="Fit to view"
                title="Fit to view"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          )}
          <Button variant="secondary" size="sm" icon={Download} onClick={onDownload}>
            Download original
          </Button>
        </div>
      </div>

      <div className="flex min-h-[50vh] max-h-[70vh] items-center justify-center overflow-auto rounded-b-xl bg-slate-50 p-2 dark:bg-slate-800">
        {isLoading && <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 px-4 text-center">
            <AlertCircle className="h-6 w-6 text-danger" />
            <p className="text-sm text-danger">{error}</p>
            <p className="max-w-xs text-xs text-ink-soft">
              The preview couldn&apos;t be loaded, but you can still download the original file.
            </p>
            <Button variant="secondary" size="sm" icon={Download} onClick={onDownload}>
              Download original
            </Button>
          </div>
        )}

        {!isLoading && !error && blobUrl && isImage && zoomMode === "fit" && (
          <img src={blobUrl} alt={doc.title} className="max-h-[68vh] max-w-full rounded-lg object-contain" />
        )}
        {!isLoading && !error && blobUrl && isImage && zoomMode === "manual" && (
          <img src={blobUrl} alt={doc.title} style={{ width: `${zoomPercent}%` }} className="max-w-none rounded-lg" />
        )}
        {!isLoading && !error && blobUrl && !isImage && (
          <iframe src={blobUrl} title={doc.title} className="h-[68vh] w-full rounded-lg" />
        )}
      </div>
    </div>
  );
}
