import { formatFullDate } from "../../utils/format";

export default function DashboardHeader({ username, pendingCount, documentCount }) {
  const today = new Date();

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Today&apos;s overview
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-slate-100 sm:text-3xl">
          Welcome back, {username}
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          {formatFullDate(today)} &middot; You have {pendingCount} pending approvals and{" "}
          {documentCount} documents on file.
        </p>
      </div>
    </div>
  );
}
