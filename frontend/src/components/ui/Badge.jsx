import clsx from "clsx";

const TONES = {
  primary: "bg-primary-50 text-primary dark:bg-primary/15 dark:text-primary-100",
  success: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  danger: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  // Phase 8 - extra tones for the lifecycle status badge (see StatusBadge.jsx).
  info: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  purple: "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
  orange: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
};

export default function Badge({ children, tone = "neutral", className }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
