// Phase 8 - Smart Search page. Reuses the same GET /api/documents endpoint
// and SearchBar/HighlightedText/DocumentViewerModal the Documents page
// already uses (see search_service.py for the two-stage SQL + fuzzy search
// this hits) - this page is purely a focused, read-oriented presentation of
// the same search, one clean result list instead of a management table.
import { useCallback, useEffect, useState } from "react";
import { Search as SearchIcon, Sparkles } from "lucide-react";
import EmptyState from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import Badge from "../ui/Badge";
import SearchBar from "../documents/SearchBar";
import DocumentViewerModal from "../documents/DocumentViewerModal";
import PaginationControls from "../documents/PaginationControls";
import SearchResultCard from "./SearchResultCard";
import { listDocumentsRequest } from "../../api/documents";
import { useDebounce } from "../../hooks/useDebounce";
import { useToast } from "../../hooks/useToast";

const PAGE_SIZE = 10;

export default function SmartSearchSection() {
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const debouncedQuery = useDebounce(searchInput, 350);

  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [usedFuzzyFallback, setUsedFuzzyFallback] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);

  const runSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setTotal(0);
      setTotalPages(1);
      setUsedFuzzyFallback(false);
      setIsLoading(false);
      setIsSearching(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await listDocumentsRequest({
        q: debouncedQuery,
        sort: "newest",
        page,
        limit: PAGE_SIZE,
      });
      setResults(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setUsedFuzzyFallback(data.used_fuzzy_fallback);
    } catch {
      showToast("Search failed. Please try again.", "error");
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, page]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const handleSearchInput = (value) => {
    setSearchInput(value);
    setIsSearching(true);
  };

  const hasQuery = Boolean(debouncedQuery.trim());

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Smart Search</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-slate-100">
          Search every document
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Searches titles, filenames, OCR text, AI summaries, AI keywords, departments, and categories at once.
        </p>
      </div>

      <SearchBar value={searchInput} onChange={handleSearchInput} isSearching={isSearching} />

      <div className="mt-6">
        {!hasQuery && (
          <EmptyState
            icon={SearchIcon}
            title="Start typing to search"
            description="Search across document titles, filenames, OCR-extracted text, AI summaries, AI keywords, departments, and categories - all in one place."
          />
        )}

        {hasQuery && isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {hasQuery && !isLoading && results.length === 0 && (
          <EmptyState
            icon={SearchIcon}
            title="No matching documents found"
            description={`Nothing matched "${debouncedQuery}". Try a different word or check for typos.`}
          />
        )}

        {hasQuery && !isLoading && results.length > 0 && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <p className="text-sm text-ink-soft">
                <span className="font-semibold text-ink dark:text-slate-100">{total}</span> result
                {total === 1 ? "" : "s"} for "{debouncedQuery}"
              </p>
              {usedFuzzyFallback && (
                <Badge tone="info">
                  <Sparkles className="h-3 w-3" />
                  Showing similar matches
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              {results.map((doc) => (
                <SearchResultCard key={doc.id} document={doc} query={debouncedQuery} onSelect={setViewerDoc} />
              ))}
            </div>

            <PaginationControls page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
          </>
        )}
      </div>

      <DocumentViewerModal isOpen={Boolean(viewerDoc)} onClose={() => setViewerDoc(null)} document={viewerDoc} />
    </div>
  );
}
