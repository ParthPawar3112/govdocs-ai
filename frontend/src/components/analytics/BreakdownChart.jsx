// Reusable ranked-magnitude horizontal bar chart (Departments/Categories) -
// one hue, since these bars encode "how many" per label, not distinct
// identities that need separating colors. Direct value labels at each
// bar-end double as the data table for screen readers/zoom.
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import { useDarkMode } from "../../hooks/useDarkMode";
import { CHART_COLORS, PRIMARY_HUE } from "./ChartTheme";

export default function BreakdownChart({ title, subtitle, data, icon }) {
  const { isDark } = useDarkMode();
  const theme = CHART_COLORS[isDark ? "dark" : "light"];
  const rows = (data || []).slice(0, 8);

  return (
    <Card>
      <h3 className="text-sm font-semibold text-ink dark:text-slate-100">{title}</h3>
      {subtitle && <p className="text-xs text-ink-soft">{subtitle}</p>}
      <div className="mt-4 h-64">
        {rows.length === 0 ? (
          <EmptyState icon={icon} title="No data yet" description="This chart fills in once documents are processed." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: theme.axis, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip
                contentStyle={{ background: theme.tooltipBg, border: `1px solid ${theme.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: isDark ? "rgba(148,163,184,0.08)" : "rgba(100,116,139,0.06)" }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {rows.map((entry) => (
                  <Cell key={entry.label} fill={PRIMARY_HUE} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
