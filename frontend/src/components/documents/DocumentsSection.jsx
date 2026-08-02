// The real Documents module. Replaces the Phase 3 PlaceholderSection for
// this nav item now that Document Management exists.
import { useCallback, useEffect, useState } from "react";
import { Upload } from "lucide-react";
import Button from "../ui/Button";
import ConfirmDialog from "../ui/ConfirmDialog";
import DocumentsToolbar from "./DocumentsToolbar";
import DocumentsTable from "./DocumentsTable";
import UploadModal from "./UploadModal";
import DocumentViewerModal from "./DocumentViewerModal";
import EditDocumentModal from "./EditDocumentModal";
import {
  deleteDocumentRequest,
  fetchDocumentBlobRequest,
  listDocumentsRequest,
} from "../../api/documents";
import { useDebounce } from "../../hooks/useDebounce";
import { useToast } from "../../hooks/useToast";

const emptyFilters = { q: "", department: "", status: "", date: "" };

export default function DocumentsSection() {
  const { showToast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState(emptyFilters);
  const debouncedQuery = useDebounce(filters.q, 350);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);
  const [editDoc, setEditDoc] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await listDocumentsRequest({
        q: debouncedQuery || undefined,
        department: filters.department || undefined,
        status: filters.status || undefined,
        date: filters.date || undefined,
      });
      setDocuments(data.items);
      setTotal(data.total);
    } catch {
      showToast("Could not load documents.", "error");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filters.department, filters.status, filters.date]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const hasActiveFilters = Boolean(
    filters.q || filters.department || filters.status || filters.date
  );

  const handleDownload = async (doc) => {
    try {
      const { data } = await fetchDocumentBlobRequest(doc.id);
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.original_filename;
      link.click();
      URL.revokeObjectURL(url);
      showToast(`Downloading "${doc.original_filename}"`, "success");
    } catch {
      showToast("Download failed. Please try again.", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteDoc) return;
    setIsDeleting(true);
    try {
      await deleteDocumentRequest(deleteDoc.id);
      showToast(`"${deleteDoc.title}" deleted`, "success");
      setDeleteDoc(null);
      fetchDocuments();
    } catch {
      showToast("Delete failed. Please try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Documents</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-slate-100">
            Document repository
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            {total} document{total === 1 ? "" : "s"} on file
          </p>
        </div>
        <Button icon={Upload} onClick={() => setIsUploadOpen(true)}>
          Upload document
        </Button>
      </div>

      <div className="mb-4">
        <DocumentsToolbar
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters(emptyFilters)}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      <DocumentsTable
        documents={documents}
        isLoading={isLoading}
        hasActiveFilters={hasActiveFilters}
        onView={setViewerDoc}
        onDownload={handleDownload}
        onEdit={setEditDoc}
        onDelete={setDeleteDoc}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={fetchDocuments}
      />

      <DocumentViewerModal
        isOpen={Boolean(viewerDoc)}
        onClose={() => setViewerDoc(null)}
        document={viewerDoc}
      />

      <EditDocumentModal
        isOpen={Boolean(editDoc)}
        onClose={() => setEditDoc(null)}
        document={editDoc}
        onUpdated={fetchDocuments}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteDoc)}
        onClose={() => setDeleteDoc(null)}
        onConfirm={confirmDelete}
        title="Delete document"
        description={`This permanently deletes "${deleteDoc?.title}" and its file. This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
