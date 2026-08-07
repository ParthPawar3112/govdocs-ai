// OCR/AI success vs failure - a 2-value proportion, not a full chart. Green
// vs red fails the dataviz skill's CVD adjacency check on its own, so every
// segment carries an icon + explicit count (secondary encoding), never color
// alone - same mitigation the skill requires for reserved status colors.
import { CheckCircle2, XCircle } from "lucide-react";
import Card from "../ui/Card";

function Row({ label, success, failure }) {
  const total = success + failure;
  const successPct = total === 0 ? 0 : Math.round((success / total) * 100);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-ink dark:text-slate-200">{label}</span>
        <span className="flex items-center gap-3 text-xs text-ink-soft">
          <span className="flex items-center gap-1 text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> {success} succeeded
          </span>
          <span className="flex items-center gap-1 text-danger">
            <XCircle className="h-3.5 w-3.5" /> {failure} failed
          </span>
        </span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {total === 0 ? null : (
          <>
            <div className="h-full bg-success" style={{ width: `${successPct}%` }} />
            <div className="h-full bg-danger" style={{ width: `${100 - successPct}%` }} />
          </>
        )}
      </div>
    </div>
  );
}

export default function SuccessRateBars({ summary }) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-ink dark:text-slate-100">Processing success rate</h3>
      <p className="mb-4 text-xs text-ink-soft">OCR and AI extraction outcomes</p>
      <div className="space-y-5">
        <Row label="OCR" success={summary.ocr_success} failure={summary.ocr_failure} />
        <Row label="AI Analysis" success={summary.ai_success} failure={summary.ai_failure} />
      </div>
    </Card>
  );
}
