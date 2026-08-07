// Shared chart color tokens (Phase 8). Recharts renders SVG, so its axis/grid
// colors need real hex values rather than Tailwind classes - kept in one
// place so every chart in the Analytics section reads consistently in both
// themes. The 5-color STATUS_ORDER passed validate_palette.js (dataviz
// skill) for CVD-safe adjacency in this exact sequence - don't reorder it
// without re-running the validator.
export const CHART_COLORS = {
  light: { grid: "#e2e8f0", axis: "#64748b", tooltipBg: "#ffffff", tooltipBorder: "#e2e8f0" },
  dark: { grid: "#334155", axis: "#94a3b8", tooltipBg: "#0f172a", tooltipBorder: "#334155" },
};

export const PRIMARY_HUE = "#2563EB";

// Order: Approved, Needs Correction, Rejected, Archived, Pending - validated
// as a set (all-pairs CVD + normal-vision + contrast) in this exact sequence.
export const STATUS_ORDER = [
  { key: "approved", label: "Approved", color: "#16A34A" },
  { key: "needs_correction", label: "Needs Correction", color: "#7C3AED" },
  { key: "rejected", label: "Rejected", color: "#DC2626" },
  { key: "archived", label: "Archived", color: "#0D9488" },
  { key: "pending", label: "Pending", color: "#D97706" },
];
