// Identity/state breakdown (5 statuses) -> donut with a status-colored
// legend. Every slice is direct-labeled with its count in the legend, so
// identity never rests on color alone (dataviz skill: status colors ship
// with icon/label, never color-only).
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import { PieChart as PieIcon } from "lucide-react";
import { useDarkMode } from "../../hooks/useDarkMode";
import { CHART_COLORS, STATUS_ORDER } from "./ChartTheme";

export default function ApprovalRatioChart({ summary }) {
  const { isDark } = useDarkMode();
  const theme = CHART_COLORS[isDark ? "dark" : "light"];

  const data = STATUS_ORDER.map((slot) => ({
    ...slot,
    value: {
      approved: summary.approved,
      needs_correction: summary.needs_correction,
      rejected: summary.rejected,
      archived: summary.archived,
      pending: summary.pending,
    }[slot.key],
  })).filter((slot) => slot.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <h3 className="text-sm font-semibold text-ink dark:text-slate-100">Approval ratio</h3>
      <p className="text-xs text-ink-soft">Status breakdown across all documents</p>
      {total === 0 ? (
        <div className="mt-4 h-56">
          <EmptyState icon={PieIcon} title="No documents yet" description="The status breakdown appears once documents are uploaded." />
        </div>
      ) : (
        <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-48 w-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} stroke={isDark ? "#0f172a" : "#ffffff"} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: theme.tooltipBg, border: `1px solid ${theme.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(value, name) => [`${value} (${Math.round((value / total) * 100)}%)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="w-full space-y-1.5">
            {data.map((entry) => (
              <li key={entry.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-ink dark:text-slate-200">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.label}
                </span>
                <span className="font-semibold tabular-nums text-ink-soft">
                  {entry.value} <span className="font-normal">({Math.round((entry.value / total) * 100)}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
