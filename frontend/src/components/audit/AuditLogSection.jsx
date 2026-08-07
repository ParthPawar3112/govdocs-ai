// Phase 8 - Admin-only audit trail. Reuses PaginationControls/Card/EmptyState
// from the existing design system, same pattern as DocumentsSection.
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import PaginationControls from "../documents/PaginationControls";
import { listAuditLogsRequest } from "../../api/audit";
import { useDebounce } from "../../hooks/useDebounce";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../utils/format";

const ACTION_TONES = {
  Login: "text-ink-soft",
  Upload: "text-primary",
  Approved: "text-success",
  Rejected: "text-danger",
  "Sent Back for Corrections": "text-warning",
  "OCR Failed": "text-danger",
  "AI Failed": "text-danger",
  Deleted: "text-danger",
};

export default function AuditLogSection() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const debouncedUser = useDebounce(userFilter, 300);
  const debouncedAction = useDebounce(actionFilter, 300);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await listAuditLogsRequest({
        user: debouncedUser || undefined,
        action: debouncedAction || undefined,
        page,
        page_size: 20,
      });
      setLogs(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (error) {
      if (error.response?.status === 403) setIsForbidden(true);
      else showToast("Could not load audit logs.", "error");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedUser, debouncedAction, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [debouncedUser, debouncedAction]);

  if (isForbidden) {
    return (
      <Card>
        <p className="text-sm text-ink-soft">Audit logs are available to Admin accounts only.</p>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Audit Logs</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-slate-100">
          System activity log
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">{total} recorded actions</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          placeholder="Filter by user..."
          className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 sm:w-56"
        />
        <input
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder="Filter by action (e.g. Approved)..."
          className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 sm:w-64"
        />
      </div>

      <Card padding="p-0" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft dark:border-slate-800">
                {["User", "Action", "Document", "Details", "Timestamp"].map((col) => (
                  <th key={col} className="whitespace-nowrap px-5 py-3 font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-slate-800">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4" colSpan={5}>
                      <Skeleton className="h-5 w-full rounded-md" />
                    </td>
                  </tr>
                ))}

              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon={Search} title="No matching activity" description="Try a different user or action filter." />
                  </td>
                </tr>
              )}

              {!isLoading &&
                logs.map((log) => (
                  <tr key={log.id} className="animate-fadeIn hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-5 py-3 font-medium text-ink dark:text-slate-100">{log.user}</td>
                    <td className={`whitespace-nowrap px-5 py-3 font-medium ${ACTION_TONES[log.action] || "text-ink-soft"}`}>
                      {log.action}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-ink-soft">{log.document_id ?? "-"}</td>
                    <td className="max-w-xs truncate px-5 py-3 text-ink-soft">{log.details || "-"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-ink-soft">{formatDateTime(new Date(log.timestamp))}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      <PaginationControls page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </div>
  );
}
