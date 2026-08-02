import Badge from "../ui/Badge";

const TONES = { Pending: "warning", Approved: "success", Rejected: "danger" };

export default function StatusBadge({ status }) {
  return <Badge tone={TONES[status] ?? "neutral"}>{status}</Badge>;
}
