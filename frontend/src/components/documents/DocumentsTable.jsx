import { Download, Edit3, Eye, FileText, Image as ImageIcon, Search, Trash2 } from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import StatusBadge from "./StatusBadge";
import HighlightedText from "./HighlightedText";
import { formatDateTime, isImageFile } from "../../utils/format";

const COLUMNS = ["Document", "Department", "Uploaded by", "Upload date", "Status", "Actions"];

function FileTypeIcon({ filetype }) {
  const Icon = isImageFile(filetype) ? ImageIcon : FileText;
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-50 dark:bg-primary/15">
      <Icon className="h-4 w-4 text-primary" />
    </span>
  );
}

function ActionButton({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`rounded-lg p-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
        danger ? "text-ink-soft hover:text-danger" : "text-ink-soft hover:text-primary"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default function DocumentsTable({
  documents,
  isLoading,
  hasActiveFilters,
  searchQuery,
  onView,
  onDownload,
  onEdit,
  onDelete,
}) {
  return (
    <Card padding="p-0" className="overflow-hidden">
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
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-4" colSpan={COLUMNS.length}>
                    <Skeleton className="h-5 w-full rounded-md" />
                  </td>
                </tr>
              ))}

            {!isLoading && documents.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length}>
                  {hasActiveFilters ? (
                    <EmptyState
                      icon={Search}
                      title="No matching documents found"
                      description="Try changing your search or filters."
                    />
                  ) : (
                    <EmptyState
                      icon={FileText}
                      title="No documents yet"
                      description='Click "Upload document" to digitize your first record.'
                    />
                  )}
                </td>
              </tr>
            )}

            {!isLoading &&
              documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="animate-fadeIn transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <FileTypeIcon filetype={doc.filetype} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink dark:text-slate-100">
                          <HighlightedText text={doc.title} query={searchQuery} />
                        </p>
                        <p className="truncate text-xs text-ink-soft">
                          <HighlightedText text={doc.original_filename} query={searchQuery} />
                        </p>
                        {doc.ai_title && doc.ai_title !== doc.title && (
                          <p className="truncate text-xs text-primary">
                            AI: <HighlightedText text={doc.ai_title} query={searchQuery} />
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">{doc.department}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">{doc.uploaded_by}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">
                    {formatDateTime(new Date(doc.upload_date))}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <StatusBadge status={doc.lifecycle_status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <div className="flex items-center gap-0.5">
                      <ActionButton icon={Eye} label="View" onClick={() => onView(doc)} />
                      <ActionButton icon={Download} label="Download" onClick={() => onDownload(doc)} />
                      <ActionButton icon={Edit3} label="Edit" onClick={() => onEdit(doc)} />
                      <ActionButton icon={Trash2} label="Delete" danger onClick={() => onDelete(doc)} />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
