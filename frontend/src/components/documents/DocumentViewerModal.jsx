// Fetches the file through the authenticated API (not a raw <iframe src>,
// since that can't carry a Bearer token) and previews it via an object URL.
// The Download button reuses the same blob rather than re-fetching.
import { useEffect, useState } from "react";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { fetchDocumentBlobRequest } from "../../api/documents";
import { useToast } from "../../hooks/useToast";

export default function DocumentViewerModal({ isOpen, onClose, document: doc }) {
  const { showToast } = useToast();
  const [blobUrl, setBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
      </div>
    </Modal>
  );
}
