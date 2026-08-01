import { FileStack } from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";

const COLUMNS = ["Document", "Type", "Status", "Uploaded by", "Date"];

export default function RecentDocuments() {
  return (
    <Card padding="p-0" className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-ink dark:text-slate-100">Recent documents</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft dark:border-slate-800">
              {COLUMNS.map((col) => (
                <th key={col} className="px-5 py-3 font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={COLUMNS.length}>
                <EmptyState
                  icon={FileStack}
                  title="No documents yet"
                  description="Uploaded records will appear here once Document Upload goes live."
                  phase="Phase 4 - Document Upload"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
