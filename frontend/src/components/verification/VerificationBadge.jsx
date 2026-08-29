// Compact trust indicator used in search results, the documents table, and
// the citizen document view. Reuses the shared Badge; the label wording is
// deliberately plain ("Needs review", not "NEEDS_REVIEW").
import {
  BadgeCheck,
  CalendarClock,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import Badge from "../ui/Badge";

export const VERIFICATION_META = {
  VERIFIED: { label: "Verified", tone: "success", icon: ShieldCheck },
  CORROBORATED: { label: "Corroborated", tone: "info", icon: BadgeCheck },
  NEEDS_REVIEW: { label: "Needs review", tone: "warning", icon: ShieldQuestion },
  FLAGGED: { label: "Flagged", tone: "danger", icon: ShieldAlert },
  OUTDATED: { label: "Outdated", tone: "orange", icon: CalendarClock },
  UNVERIFIED: { label: "Not yet assessed", tone: "neutral", icon: HelpCircle },
};

export default function VerificationBadge({ status, sourceLabel, size = "md" }) {
  const meta = VERIFICATION_META[status] || VERIFICATION_META.UNVERIFIED;
  const Icon = meta.icon;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={meta.tone}>
        <Icon className="h-3 w-3" />
        {meta.label}
      </Badge>
      {sourceLabel && size !== "sm" && (
        <span className="text-[11px] text-ink-soft">{sourceLabel}</span>
      )}
    </span>
  );
}
