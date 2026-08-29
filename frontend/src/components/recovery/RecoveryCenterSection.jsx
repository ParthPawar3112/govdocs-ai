// BLACKOUT / RECOVERY CENTER ("The Blackout" challenge).
//
// Drives the live disaster-recovery demo: snapshot -> simulate blackout ->
// detect -> recover from verified snapshot -> identify in-flight operations
// -> operator reconciles -> system back online. Nothing here destroys data;
// the backend recovers document rows from a checksum-verified JSON snapshot
// kept outside the primary database (see backend/app/services/blackout.py).
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Database,
  DatabaseBackup,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Siren,
} from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../utils/format";
import {
  createRecoverySnapshot,
  getRecoveryStatus,
  reconcileOperation,
  resetBlackoutDemo,
  runRecovery,
  simulateBlackout,
} from "../../api/recovery";

const TIMELINE_ICON = { done: CheckCircle2, warn: AlertTriangle, pending: Circle };
const TIMELINE_TONE = {
  done: "text-success",
  warn: "text-orange-500",
  pending: "text-slate-300 dark:text-slate-600",
};

function storeTone(raw) {
  if (raw === "healthy") return "success";
  if (raw === "corrupted") return "danger";
  return "warning";
}

function Metric({ label, value, hint, tone = "neutral" }) {
  return (
    <div className="rounded-xl border border-line p-4 dark:border-slate-800">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-ink dark:text-slate-100">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
      {tone !== "neutral" && <span className="sr-only">{tone}</span>}
    </div>
  );
}

export default function RecoveryCenterSection() {
  const { showToast } = useToast();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // which action is running

  const refresh = useCallback(async () => {
    try {
      const { data } = await getRecoveryStatus();
      setStatus(data);
    } catch {
      showToast("Unable to load recovery status.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [refresh]);

  const run = async (key, fn, okMsg) => {
    setBusy(key);
    try {
      const { data } = await fn();
      if (data && data.ok === false) {
        showToast(data.error || "Operation failed.", "error");
      } else if (okMsg) {
        showToast(okMsg, "success");
      }
      await refresh();
    } catch (err) {
      showToast(err.response?.data?.detail?.message || err.response?.data?.detail || "Operation failed.", "error");
    } finally {
      setBusy(null);
    }
  };

  const reconcile = async (opId, action) => {
    setBusy(`${opId}:${action}`);
    try {
      const { data } = await reconcileOperation(opId, action);
      if (data.ok === false) showToast(data.error, "error");
      else showToast(`${opId} - ${action.replace("_", " ")}`, "success");
      await refresh();
    } catch {
      showToast("Reconciliation failed.", "error");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-soft">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Recovery Center…
      </div>
    );
  }

  const s = status || {};
  const inRecovery = s.recovery_mode || s.primary_store_raw !== "healthy";
  const snap = s.last_snapshot;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Blackout Challenge</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-ink dark:text-slate-100">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Recovery Center
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Disaster recovery &amp; data-resilience console for the primary data store.
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={refresh}>
          Refresh
        </Button>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <strong>DEMO SIMULATION — NO PRODUCTION DATA IS DESTROYED.</strong> A blackout is a
          reversible status flag; recovery restores rows from a checksum-verified snapshot kept
          outside the database. Use “Reset Blackout Demo” to run it again.
        </span>
      </div>

      {/* status strip */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className={inRecovery ? "border-l-4 border-l-danger" : "border-l-4 border-l-success"}>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">System Status</p>
          <p className="mt-1.5 flex items-center gap-2 text-lg font-bold text-ink dark:text-slate-100">
            <span className={inRecovery ? "text-danger" : "text-success"}>●</span>
            {s.system_status}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Primary Data Store</p>
          <p className="mt-2">
            <Badge tone={storeTone(s.primary_store_raw)}>
              <Database className="h-3 w-3" />
              {s.primary_store_status}
            </Badge>
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Data Loss Status</p>
          <p className="mt-2">
            <Badge
              tone={
                s.data_loss_status === "None detected"
                  ? "success"
                  : s.data_loss_status === "Partial"
                    ? "warning"
                    : "neutral"
              }
            >
              {s.data_loss_status}
            </Badge>
          </p>
        </Card>
      </section>

      {/* actions */}
      <section className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          icon={busy === "snapshot" ? Loader2 : DatabaseBackup}
          disabled={busy !== null}
          onClick={() => run("snapshot", createRecoverySnapshot, "Recovery snapshot created.")}
        >
          Create Snapshot
        </Button>
        <Button
          variant="danger"
          icon={busy === "blackout" ? Loader2 : Siren}
          disabled={busy !== null || inRecovery}
          onClick={() => run("blackout", simulateBlackout, "Blackout simulated — recovery mode active.")}
        >
          Simulate Blackout
        </Button>
        <Button
          icon={busy === "recover" ? Loader2 : Play}
          disabled={busy !== null || !s.recovery_mode}
          onClick={() => run("recover", runRecovery, "Recovery run complete.")}
        >
          Run Recovery
        </Button>
        <Button
          variant="secondary"
          icon={busy === "reset" ? Loader2 : RotateCcw}
          disabled={busy !== null}
          onClick={() => run("reset", resetBlackoutDemo, "Blackout demo reset.")}
        >
          Reset Blackout Demo
        </Button>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* metrics */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink dark:text-slate-100">Recovery metrics</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Metric
                label="Last Verified Snapshot"
                value={snap ? "Present" : "—"}
                hint={snap ? formatDateTime(new Date(snap.created_at)) : "no snapshot"}
              />
              <Metric
                label="Snapshot Status"
                value={s.snapshot_status}
                hint={s.snapshot_verify?.valid ? "checksum OK" : s.snapshot_verify?.reason}
              />
              <Metric
                label="Records In Snapshot"
                value={
                  snap
                    ? Object.values(snap.record_counts || {}).reduce((a, b) => a + b, 0)
                    : 0
                }
                hint={snap ? `${(snap.record_counts || {}).documents || 0} documents` : ""}
              />
              <Metric label="Documents Recovered" value={s.documents_recovered} />
              <Metric label="Metadata Recovered" value={s.metadata_recovered} />
              <Metric label="In-Flight Operations" value={s.in_flight_operations} />
              <Metric label="Requires Reconciliation" value={s.requires_reconciliation} />
              <Metric label="Not Verified" value={s.not_verified} />
              <Metric label="File Mismatches" value={s.file_mismatch} />
            </div>
          </Card>

          {/* in-flight ops */}
          <Card>
            <h2 className="mb-1 text-sm font-semibold text-ink dark:text-slate-100">
              In-flight operations
            </h2>
            <p className="mb-3 text-xs text-ink-soft">
              Operations that cannot be proven complete. Unknown is not the same as successful.
            </p>
            {(!s.inflight || s.inflight.length === 0) ? (
              <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-ink-soft dark:bg-slate-800/60">
                No operations require reconciliation.
              </p>
            ) : (
              <ul className="space-y-3">
                {s.inflight.map((op) => (
                  <li
                    key={op.op_id}
                    className="rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-500/30 dark:bg-orange-500/10"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono text-xs font-semibold text-ink dark:text-slate-100">
                        {op.op_id}
                      </span>
                      <Badge tone="neutral">
                        {op.document_ref}
                        {op.document_id ? ` · DOC-${op.document_id}` : ""}
                      </Badge>
                      <span className="text-xs text-ink-soft">
                        {op.previous_state} <span className="mx-1">→</span>
                      </span>
                      <Badge tone={op.recovery_state === "NOT VERIFIED" ? "danger" : "warning"}>
                        {op.recovery_state === "NOT VERIFIED" ? "❌ " : "⚠ "}
                        {op.recovery_state}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-orange-800 dark:text-orange-300">{op.reason}</p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={busy !== null}
                        loading={busy === `${op.op_id}:retry`}
                        onClick={() => reconcile(op.op_id, "retry")}
                      >
                        Retry Processing
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy !== null}
                        loading={busy === `${op.op_id}:mark_recovered`}
                        onClick={() => reconcile(op.op_id, "mark_recovered")}
                      >
                        Mark Recovered
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busy !== null}
                        loading={busy === `${op.op_id}:discard`}
                        onClick={() => reconcile(op.op_id, "discard")}
                      >
                        Discard
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* timeline */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-ink dark:text-slate-100">Recovery timeline</h2>
          <ol className="space-y-0">
            {(s.timeline || []).map((step, i) => {
              const Icon = TIMELINE_ICON[step.state] || Circle;
              const last = i === s.timeline.length - 1;
              return (
                <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
                  {!last && (
                    <span
                      className={`absolute left-[11px] top-6 h-full w-0.5 ${
                        step.state === "done" ? "bg-success" : "bg-line dark:bg-slate-700"
                      }`}
                    />
                  )}
                  <Icon className={`h-[22px] w-[22px] shrink-0 ${TIMELINE_TONE[step.state]}`} />
                  <span
                    className={`pt-0.5 text-sm ${
                      step.state === "pending"
                        ? "text-ink-soft"
                        : "font-medium text-ink dark:text-slate-100"
                    }`}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      </section>

      {/* event log */}
      <Card className="mt-6" padding="p-0">
        <div className="border-b border-line px-5 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-ink dark:text-slate-100">Recovery &amp; audit event log</h2>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white dark:bg-slate-900">
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft dark:border-slate-800">
                <th className="px-5 py-2.5">Time</th>
                <th className="px-5 py-2.5">Event</th>
                <th className="px-5 py-2.5">Ref</th>
                <th className="px-5 py-2.5">Result</th>
              </tr>
            </thead>
            <tbody>
              {(s.events || []).map((e, i) => (
                <tr key={i} className="border-b border-line last:border-0 dark:border-slate-800">
                  <td className="whitespace-nowrap px-5 py-2 text-xs text-ink-soft">
                    {formatDateTime(new Date(e.timestamp))}
                  </td>
                  <td className="px-5 py-2 font-mono text-xs font-semibold text-ink dark:text-slate-100">
                    {e.event}
                  </td>
                  <td className="px-5 py-2 text-xs text-ink-soft">{e.ref || "—"}</td>
                  <td className="px-5 py-2 text-xs text-ink-soft">{e.result || "—"}</td>
                </tr>
              ))}
              {(!s.events || s.events.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm text-ink-soft">
                    No recovery events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
