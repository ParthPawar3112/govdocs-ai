import { ClipboardCheck } from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import StatusBadge from "../documents/StatusBadge";

export default function PendingApprovals({ documents, isLoading, onNavigate }) {
  return (
    <Card padding="p-0">
      <div className="flex items-center justify-between border-b border-line px-5 py-4 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-ink dark:text-slate-100">Pending approvals</h3>
        {documents.length > 0 && (
          <button
            onClick={() => onNavigate("documents")}
            className="text-xs font-medium text-primary hover:text-primary-dark"
          >
            Review
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3 p-5">
          <Skeleton className="h-5 w-full rounded-md" />
          <Skeleton className="h-5 w-3/4 rounded-md" />
        </div>
      )}

      {!isLoading && documents.length === 0 && (
        <EmptyState
          icon={ClipboardCheck}
          title="No pending approvals"
          description="Documents pending review will show up here."
        />
      )}

      {!isLoading && documents.length > 0 && (
        <ul className="divide-y divide-line dark:divide-slate-800">
          {documents.map((doc) => (
            <li key={doc.id}>
              <button
                onClick={() => onNavigate("documents")}
                className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink dark:text-slate-100">
                    {doc.title}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {doc.department} &middot; {doc.uploaded_by}
                  </p>
                </div>
                <StatusBadge status={doc.lifecycle_status} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-line px-5 py-3 text-xs text-ink-soft dark:border-slate-800">
        Full approve, reject, and send-back actions are available in the Review Queue.
      </p>
    </Card>
  );
}
