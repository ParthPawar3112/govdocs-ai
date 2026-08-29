// "Verification & Trust" section shown inside the Document Viewer.
// Evidence-based, explainable, and honest about uncertainty - it never
// presents an AI score as proof of truth.
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileSearch,
  Info,
  Loader2,
  RefreshCw,
  ScrollText,
  ShieldQuestion,
} from "lucide-react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import VerificationBadge, { VERIFICATION_META } from "./VerificationBadge";
import {
  analyzeVerification,
  getVerification,
  recordReviewDecision,
  submitForTrustReview,
} from "../../api/verification";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../utils/format";

const CLAIM_TONE = {
  CORROBORATED: "info",
  NEEDS_REVIEW: "warning",
  FLAGGED: "danger",
  UNVERIFIED: "neutral",
};

const DECISIONS = [
  { key: "verified", label: "Verified" },
  { key: "corroborated", label: "Corroborated" },
  { key: "needs_more_evidence", label: "Needs more evidence" },
  { key: "flagged", label: "Flagged" },
  { key: "mark_outdated", label: "Mark outdated" },
];

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right font-medium text-ink dark:text-slate-100 break-all">{value ?? "Unknown"}</span>
    </div>
  );
}

export default function VerificationPanel({ documentId, isStaff = false, canSubmit = true, onChanged }) {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decision, setDecision] = useState("needs_more_evidence");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      const { data: payload } = await getVerification(documentId);
      setData(payload);
    } catch {
      showToast("Unable to load verification details.", "error");
    } finally {
      setLoading(false);
    }
  }, [documentId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (key, fn, okMsg) => {
    setBusy(key);
    try {
      await fn();
      if (okMsg) showToast(okMsg, "success");
      await load();
      onChanged?.();
    } catch (err) {
      showToast(err.response?.data?.detail || "Action failed.", "error");
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-line p-4 text-sm text-ink-soft dark:border-slate-800">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading verification &amp; trust…
      </div>
    );
  }
  if (!data) return null;

  const meta = VERIFICATION_META[data.status] || VERIFICATION_META.UNVERIFIED;
  const p = data.provenance || {};
  const evidence = data.evidence || {};
  const review = data.review || {};
  const primaryReason = (data.reasons || [])[0];

  return (
    <div className="rounded-xl border border-line dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 dark:border-slate-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-100">
          <FileSearch className="h-4 w-4 text-primary" />
          Verification &amp; Trust
        </h3>
        {isStaff && (
          <Button
            variant="secondary"
            size="sm"
            icon={busy === "analyze" ? Loader2 : RefreshCw}
            disabled={busy !== ""}
            onClick={() => act("analyze", () => analyzeVerification(documentId), "Re-analysis scheduled - refresh in a moment.")}
          >
            Re-run analysis
          </Button>
        )}
      </div>

      <div className="space-y-4 p-4">
        {/* 1. status + explanation */}
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
          <div className="flex flex-wrap items-center gap-2">
            <VerificationBadge status={data.status} />
            {data.trust_score != null && (
              <Badge tone="neutral">Trust assessment {Math.round(data.trust_score)}/100 · {data.trust_band}</Badge>
            )}
            {data.analysis_method && <Badge tone="neutral">via {data.analysis_method}</Badge>}
          </div>
          {primaryReason && (
            <p className="mt-2 text-sm text-ink dark:text-slate-200">{primaryReason}</p>
          )}
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-soft">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            {data.disclaimer}
          </p>
        </div>

        {/* outdated / superseded (Feature 7) */}
        {data.currency_status === "outdated" && (
          <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm dark:border-orange-500/40 dark:bg-orange-500/10">
            <p className="flex items-center gap-1.5 font-semibold text-orange-700 dark:text-orange-400">
              <CalendarClock className="h-4 w-4" /> Outdated information detected
            </p>
            {data.superseded_by && (
              <p className="mt-1 text-orange-800 dark:text-orange-300">
                Superseded by: <span className="font-medium">{data.superseded_by.title}</span>
              </p>
            )}
            {data.superseded_reason && (
              <p className="mt-0.5 text-xs text-orange-800 dark:text-orange-300">{data.superseded_reason}</p>
            )}
            <p className="mt-1 text-xs text-ink-soft">
              The historical document is preserved. Check the newer document for current guidance.
            </p>
          </div>
        )}

        {/* 2. why (reasons) */}
        {(data.reasons || []).length > 1 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">Why this assessment</p>
            <ul className="space-y-1">
              {data.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink dark:text-slate-200">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 3. contradictions - the headline of the challenge */}
        {(data.contradictions || []).length > 0 && (
          <div className="rounded-lg border border-danger/30 bg-red-50 p-3 dark:bg-red-500/10">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-danger">
              <AlertTriangle className="h-4 w-4" /> Conflict detected
            </p>
            <ul className="mt-2 space-y-2">
              {data.contradictions.map((c) => (
                <li key={c.id} className="text-sm">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge tone="neutral">{c.field}</Badge>
                    <span className="font-medium text-ink dark:text-slate-100">This document: {c.value_a}</span>
                    <span className="text-ink-soft">vs</span>
                    <span className="font-medium text-ink dark:text-slate-100">{c.value_b}</span>
                  </div>
                  {c.explanation && <p className="mt-0.5 text-xs text-ink-soft">{c.explanation}</p>}
                  <p className="mt-0.5 text-xs font-semibold text-danger">Resolution: {c.resolution.replace(/_/g, " ")}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 4. extracted claims */}
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Extracted claims ({(data.claims || []).length})
          </p>
          {(data.claims || []).length === 0 ? (
            <p className="text-sm text-ink-soft">No checkable factual claims were identified.</p>
          ) : (
            <ul className="space-y-2">
              {data.claims.map((c) => (
                <li key={c.id} className="rounded-lg border border-line p-2.5 text-sm dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={CLAIM_TONE[c.status] || "neutral"}>{c.status.replace(/_/g, " ")}</Badge>
                    <Badge tone="neutral">{c.claim_type}</Badge>
                    {c.reference_number && <span className="text-[11px] text-ink-soft">Ref: {c.reference_number}</span>}
                  </div>
                  <p className="mt-1 text-ink dark:text-slate-200">“{c.claim_text}”</p>
                  {(c.amounts?.length > 0 || c.dates?.length > 0 || c.percentages?.length > 0 || c.location) && (
                    <p className="mt-1 text-xs text-ink-soft">
                      {c.amounts?.length > 0 && <>Amounts: {c.amounts.join(", ")} </>}
                      {c.percentages?.length > 0 && <>· {c.percentages.join(", ")} </>}
                      {c.dates?.length > 0 && <>· Dates: {c.dates.join(", ")} </>}
                      {c.location && <>· Location: {c.location}</>}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 5 + 6. evidence */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line p-3 dark:border-slate-800">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Supporting evidence
            </p>
            {(evidence.corroborating || []).length === 0 ? (
              <p className="mt-1 text-xs text-ink-soft">None found in the repository.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-xs text-ink dark:text-slate-200">
                {evidence.corroborating.slice(0, 5).map((e, i) => (
                  <li key={i}>• {e.title} <span className="text-ink-soft">({e.source_type})</span></li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border border-line p-3 dark:border-slate-800">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
              <AlertTriangle className="h-3.5 w-3.5" /> Contradicting evidence
            </p>
            {(evidence.contradicting || []).length === 0 ? (
              <p className="mt-1 text-xs text-ink-soft">None found.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-xs text-ink dark:text-slate-200">
                {evidence.contradicting.slice(0, 5).map((e, i) => (
                  <li key={i}>• {e.field}: {e.value_a} vs {e.value_b}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {evidence.note && <p className="text-[11px] text-ink-soft">{evidence.note}</p>}

        {/* 7. risk factors */}
        {(data.risk_factors || []).length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">Risk factors</p>
            <ul className="space-y-1">
              {data.risk_factors.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink dark:text-slate-200">
                  <Badge tone={r.severity === "high" ? "danger" : r.severity === "medium" ? "warning" : "neutral"}>
                    {r.severity}
                  </Badge>
                  <span>{r.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 3. provenance + 8. AI confidence + 9. last verified */}
        <div className="rounded-lg border border-line p-3 dark:border-slate-800">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Provenance</p>
          <Row label="Source type" value={p.source_type_label} />
          <Row label="Uploader" value={p.uploader} />
          <Row label="Issuing department" value={p.issuing_department} />
          <Row label="Issuing organization" value={p.issuing_organization} />
          <Row label="Reference / circular no." value={p.reference_number} />
          <Row label="Publication date" value={p.publication_date} />
          <Row label="Source link" value={p.source_url} />
          <Row label="File fingerprint (SHA-256)" value={p.file_sha256 === "Unknown" ? "Unknown" : `${String(p.file_sha256).slice(0, 16)}…`} />
          <Row label="Uploaded" value={p.upload_timestamp ? formatDateTime(new Date(p.upload_timestamp)) : "Unknown"} />
          <Row label="Automated read confidence" value={data.ai_confidence != null ? `${Math.round(data.ai_confidence)}%` : "Unknown"} />
          <Row label="Last verification" value={data.last_verified_at ? formatDateTime(new Date(data.last_verified_at)) : "Not yet run"} />
        </div>

        {/* 10. human review */}
        <div className="rounded-lg border border-line p-3 dark:border-slate-800">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            <ShieldQuestion className="h-3.5 w-3.5" /> Human review
          </p>
          <p className="text-sm text-ink dark:text-slate-200">
            Status: <span className="font-semibold">{(review.review_status || "not_submitted").replace(/_/g, " ")}</span>
            {review.decision && (
              <> · Decision: <span className="font-semibold">{review.decision.replace(/_/g, " ")}</span>
                {review.decision_status ? ` (${VERIFICATION_META[review.decision_status]?.label || review.decision_status})` : ""}</>
            )}
          </p>
          {review.reviewer && (
            <p className="mt-0.5 text-xs text-ink-soft">
              by {review.reviewer}{review.reviewed_at ? ` · ${formatDateTime(new Date(review.reviewed_at))}` : ""}
              {review.reviewer_reason ? ` — “${review.reviewer_reason}”` : ""}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {canSubmit && review.review_status !== "pending_review" && review.review_status !== "resolved" && (
              <Button
                size="sm"
                disabled={busy !== ""}
                loading={busy === "submit"}
                onClick={() => act("submit", () => submitForTrustReview(documentId), "Sent for human trust review.")}
              >
                Send for review
              </Button>
            )}
            {isStaff && (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy !== ""}
                onClick={() => setDecisionOpen((v) => !v)}
              >
                {decisionOpen ? "Cancel decision" : "Record review decision"}
              </Button>
            )}
          </div>

          {isStaff && decisionOpen && (
            <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="flex flex-wrap gap-2">
                {DECISIONS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDecision(d.key)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      decision === d.key
                        ? "border-primary bg-primary text-white"
                        : "border-line text-ink-soft hover:border-primary/40 dark:border-slate-700"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Reason (recorded in the trust history)"
                className="w-full resize-none rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <Button
                size="sm"
                disabled={busy !== ""}
                loading={busy === "decide"}
                onClick={() =>
                  act(
                    "decide",
                    () => recordReviewDecision(documentId, decision, reason.trim() || null),
                    "Review decision recorded.",
                  ).then(() => {
                    setDecisionOpen(false);
                    setReason("");
                  })
                }
              >
                Save decision
              </Button>
            </div>
          )}
        </div>

        {/* 11. audit history */}
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            <ScrollText className="h-3.5 w-3.5" /> Verification history
          </p>
          <ul className="space-y-1">
            {(data.events || []).map((e, i) => (
              <li key={i} className="text-xs text-ink-soft">
                <span className="font-mono">{e.created_at ? formatDateTime(new Date(e.created_at)) : ""}</span>
                {" — "}
                <span className="font-semibold text-ink dark:text-slate-200">{e.action}</span>
                {e.detail ? ` · ${e.detail}` : ""} <span className="text-ink-soft">({e.actor})</span>
              </li>
            ))}
            {(data.events || []).length === 0 && <li className="text-xs text-ink-soft">No history yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
