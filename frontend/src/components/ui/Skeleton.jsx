import clsx from "clsx";

export function Skeleton({ className }) {
  return <div className={clsx("skeleton animate-shimmer rounded-lg", className)} />;
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-4 w-10 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-7 w-16" />
      <Skeleton className="mt-2 h-3.5 w-24" />
    </div>
  );
}
