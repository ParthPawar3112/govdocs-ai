// The Documents page, redesigned for Phase 7's Smart Search & Advanced
// Retrieval. Upload/View/Edit/Delete flows are unchanged from Phase 4-6 -
// only search, filtering, sorting, and pagination are new here.
import { useCallback, useEffect, useState } from "react";
import { SlidersHorizontal, Upload } from "lucide-react";
import Button from "../ui/Button";
import ConfirmDialog from "../ui/ConfirmDialog";
import SearchBar from "./SearchBar";
import SortDropdown from "./SortDropdown";
import FiltersPanel from "./FiltersPanel";
import DocumentsStatsBar from "./DocumentsStatsBar";
import DocumentsTable from "./DocumentsTable";
import PaginationControls from "./PaginationControls";
import UploadModal from "./UploadModal";
import DocumentViewerModal from "./DocumentViewerModal";
import EditDocumentModal from "./EditDocumentModal";
import {
  deleteDocumentRequest,
  fetchDocumentBlobRequest,
  getFilterOptionsRequest,
  listDocumentsRequest,
} from "../../api/documents";
import { useDebounce } from "../../hooks/useDebounce";
import { useToast } from "../../hooks/useToast";

const emptyFilters = {
  category: "",
  department: "",
  status: "",
  file_type: "",
  date: "",
  ocr_processed: false,
  ai_processed: false,
};

export default function DocumentsSection() {
  const { showToast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({ total: 0, overallTotal: 0, aiProcessed: 0, ocrProcessed: 0 });
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const debouncedQuery = useDebounce(searchInput, 350);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [filters, setFilters] = useState(emptyFilters);
  const [sort, setSort] = useState("newest");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);
  const [editDoc, setEditDoc] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    getFilterOptionsRequest()
      .then(({ data }) => setCategories(data.categories))
      .catch(() => {
        /* filter dropdown just stays empty - not worth a toast for this */
      });
  }, []);

  // Live Document Processing Status: `silent` lets the background poll below
  // (and the auto-open-viewer-after-upload flow) refresh the table's status
  // badges without flashing the loading skeleton on every tick.
  const fetchDocuments = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const { data } = await listDocumentsRequest({
        q: debouncedQuery || undefined,
        category: filters.category || undefined,
        department: filters.department || undefined,
        status: filters.status || undefined,
        file_type: filters.file_type || undefined,
        date: filters.date || undefined,
        ocr_processed: filters.ocr_processed || undefined,
        ai_processed: filters.ai_processed || undefined,
        sort,
        page,
        limit: 10,
      });
      setDocuments(data.items);
      setStats({
        total: data.total,
        overallTotal: data.overall_total,
        aiProcessed: data.ai_processed_count,
        ocrProcessed: data.ocr_processed_count,
      });
      setTotalPages(data.total_pages);
    } catch {
      showToast("Could not load documents.", "error");
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filters, sort, page]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Live Document Processing Status: while any document on the current page
  // is still mid-pipeline (OCR or AI running), silently re-poll the same
  // list endpoint every few seconds so status badges update on their own -
  // reuses fetchDocuments/listDocumentsRequest rather than a second polling
  // system. Stops automatically once nothing is in flight.
  useEffect(() => {
    const hasProcessingDocument = documents.some(
      (doc) => doc.ocr_status === "processing" || doc.ai_status === "processing"
    );
    if (!hasProcessingDocument) return undefined;

    const interval = setInterval(() => fetchDocuments(true), 3000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  // Reset to page 1 whenever search/filters/sort change - staying on page 3
  // of a now-different result set would be confusing.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filters, sort]);

  const handleSearchInput = (value) => {
    setSearchInput(value);
    setIsSearching(true);
  };

  const hasActiveFilters = Boolean(
    debouncedQuery ||
      filters.category ||
      filters.department ||
      filters.status ||
      filters.file_type ||
      filters.date ||
      filters.ocr_processed ||
      filters.ai_processed
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

  // Live Document Processing Status: drop the user straight into the
  // Document Viewer right after upload, so they immediately see OCR/AI
  // progress instead of wondering what happened - reuses the viewer's
  // existing polling entirely, no new status logic here.
  const handleUploaded = (newDocument) => {
    fetchDocuments();
    setViewerDoc(newDocument);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Documents</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-slate-100">
            Document repository
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">Search across filenames, OCR text, and AI metadata</p>
        </div>
        <Button icon={Upload} onClick={() => setIsUploadOpen(true)}>
          Upload document
        </Button>
      </div>

      <div className="mb-4">
        <SearchBar value={searchInput} onChange={handleSearchInput} isSearching={isSearching} />
      </div>

      <div className="mb-4">
        <DocumentsStatsBar
          overallTotal={stats.overallTotal}
          filteredTotal={stats.total}
          aiProcessed={stats.aiProcessed}
          ocrProcessed={stats.ocrProcessed}
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="secondary"
          size="sm"
          icon={SlidersHorizontal}
          onClick={() => setIsFiltersOpen(true)}
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </Button>
        <SortDropdown value={sort} onChange={setSort} />
      </div>

      <DocumentsTable
        documents={documents}
        isLoading={isLoading}
        hasActiveFilters={hasActiveFilters}
        searchQuery={debouncedQuery}
        onView={setViewerDoc}
        onDownload={handleDownload}
        onEdit={setEditDoc}
        onDelete={setDeleteDoc}
      />

      <PaginationControls
        page={page}
        totalPages={totalPages}
        total={stats.total}
        onPageChange={setPage}
      />

      <FiltersPanel
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        activeFilters={filters}
        categories={categories}
        onApply={setFilters}
        onReset={() => setFilters(emptyFilters)}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={handleUploaded}
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
