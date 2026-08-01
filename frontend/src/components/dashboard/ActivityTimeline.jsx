import { LogIn } from "lucide-react";
import Card from "../ui/Card";
import { formatDateTime } from "../../utils/format";

export default function ActivityTimeline({ username, sessionStartedAt }) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-ink dark:text-slate-100">Recent activity</h3>

      <ol className="mt-4 space-y-4">
        <li className="relative flex gap-3 pl-1">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary/15">
            <LogIn className="h-3.5 w-3.5 text-primary" />
          </span>
          <div>
            <p className="text-sm text-ink dark:text-slate-100">
              <span className="font-semibold">{username}</span> signed in
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">{formatDateTime(sessionStartedAt)}</p>
          </div>
        </li>
      </ol>

      <p className="mt-4 border-t border-line pt-3 text-xs text-ink-soft dark:border-slate-800">
        Document and approval activity will populate this timeline in upcoming phases.
      </p>
    </Card>
  );
}
