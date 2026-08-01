// Trend is deliberately honest: with no documents processed yet there is no
// real percentage change to report, so we show a neutral "No activity yet"
// rather than a fabricated number - fake trend data would misrepresent the
// system's actual state.
import clsx from "clsx";
import { Minus, TrendingUp } from "lucide-react";
import Card from "../ui/Card";
import { useCountUp } from "../../hooks/useCountUp";

const BORDER_TONES = {
  primary: "border-l-primary",
  warning: "border-l-warning",
  success: "border-l-success",
  danger: "border-l-danger",
};

const ICON_TONES = {
  primary: "bg-primary-50 text-primary dark:bg-primary/15",
  warning: "bg-amber-50 text-warning dark:bg-amber-500/15",
  success: "bg-green-50 text-success dark:bg-green-500/15",
  danger: "bg-red-50 text-danger dark:bg-red-500/15",
};

export default function StatCard({ label, value, icon: Icon, tone = "primary", trend }) {
  const animatedValue = useCountUp(value);

  return (
    <Card
      hoverable
      className={clsx("border-l-4", BORDER_TONES[tone])}
    >
      <div className="flex items-start justify-between">
        <div className={clsx("grid h-10 w-10 place-items-center rounded-xl", ICON_TONES[tone])}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-ink-soft">
          {trend ? (
            <>
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              {trend}
            </>
          ) : (
            <>
              <Minus className="h-3.5 w-3.5" />
              No activity yet
            </>
          )}
        </span>
      </div>
      <p className="mt-5 text-3xl font-bold tabular-nums text-ink dark:text-slate-100">
        {animatedValue}
      </p>
      <p className="mt-1 text-sm font-medium text-ink-soft">{label}</p>
    </Card>
  );
}
