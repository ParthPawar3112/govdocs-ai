import { FileStack } from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import StatusBadge from "../documents/StatusBadge";
import { Skeleton } from "../ui/Skeleton";
import { formatDateTime } from "../../utils/format";

const COLUMNS = ["Document", "Department", "Status", "Uploaded by", "Date"];

export default function RecentDocuments({ documents, isLoading, onNavigate }) {
  return (
    <Card padding="p-0" className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-ink dark:text-slate-100">Recent documents</h3>
        {documents.length > 0 && (
          <button
            onClick={() => onNavigate("documents")}
            className="text-xs font-medium text-primary hover:text-primary-dark"
          >
            View all
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft dark:border-slate-800">
              {COLUMNS.map((col) => (
                <th key={col} className="whitespace-nowrap px-5 py-3 font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line dark:divide-slate-800">
            {isLoading && (
              <tr>
                <td className="px-5 py-4" colSpan={COLUMNS.length}>
                  <Skeleton className="h-5 w-full rounded-md" />
                </td>
              </tr>
            )}

            {!isLoading && documents.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length}>
                  <EmptyState
                    icon={FileStack}
                    title="No documents yet"
                    description='Uploaded records will appear here. Try "Upload document" from Quick Actions.'
                  />
                </td>
              </tr>
            )}

            {!isLoading &&
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="max-w-[220px] truncate px-5 py-3.5 font-medium text-ink dark:text-slate-100">
                    {doc.title}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">{doc.department}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <StatusBadge status={doc.lifecycle_status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">{doc.uploaded_by}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">
                    {formatDateTime(new Date(doc.upload_date))}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
