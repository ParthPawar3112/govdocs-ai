// Single-series magnitude-over-time -> one hue, area fill, no legend needed
// (the card title names the series). See dataviz skill: sequential = one hue.
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../ui/Card";
import { useDarkMode } from "../../hooks/useDarkMode";
import { CHART_COLORS, PRIMARY_HUE } from "./ChartTheme";

function formatDayLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export default function UploadsOverTimeChart({ data }) {
  const { isDark } = useDarkMode();
  const theme = CHART_COLORS[isDark ? "dark" : "light"];

  return (
    <Card>
      <h3 className="text-sm font-semibold text-ink dark:text-slate-100">Uploads over time</h3>
      <p className="text-xs text-ink-soft">Last 30 days</p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="uploadsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PRIMARY_HUE} stopOpacity={0.35} />
                <stop offset="100%" stopColor={PRIMARY_HUE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDayLabel}
              tick={{ fill: theme.axis, fontSize: 11 }}
              axisLine={{ stroke: theme.grid }}
              tickLine={false}
              interval={Math.max(0, Math.floor((data?.length || 0) / 6))}
            />
            <YAxis allowDecimals={false} tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              contentStyle={{ background: theme.tooltipBg, border: `1px solid ${theme.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
              labelFormatter={formatDayLabel}
              formatter={(value) => [value, "Uploads"]}
            />
            <Area type="monotone" dataKey="count" stroke={PRIMARY_HUE} strokeWidth={2} fill="url(#uploadsFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
