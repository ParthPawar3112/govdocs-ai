import { ClipboardCheck } from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";

export default function PendingApprovals() {
  return (
    <Card padding="p-0">
      <div className="border-b border-line px-5 py-4 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-ink dark:text-slate-100">Pending approvals</h3>
      </div>
      <EmptyState
        icon={ClipboardCheck}
        title="Nothing waiting on you"
        description="Submissions that need Admin sign-off will show up here."
        phase="Phase 7 - Approval Workflow"
      />
    </Card>
  );
}
