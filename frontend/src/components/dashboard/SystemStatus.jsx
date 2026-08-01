// The only "status" data in this dashboard that isn't a placeholder - it
// genuinely polls the real Phase 1 /api/health endpoint and reflects whatever
// comes back, including failure.
import { useEffect, useState } from "react";
import { Database, RefreshCw, Server } from "lucide-react";
import clsx from "clsx";
import Card from "../ui/Card";
import client from "../../api/client";

const POLL_INTERVAL_MS = 30_000;

export default function SystemStatus() {
  const [status, setStatus] = useState("checking"); // checking | online | offline
  const [dbConnected, setDbConnected] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = async () => {
    setIsRefreshing(true);
    try {
      const { data } = await client.get("/health");
      setStatus("online");
      setDbConnected(data.database === "connected");
    } catch {
      setStatus("offline");
      setDbConnected(false);
    } finally {
      setLastChecked(new Date());
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const rows = [
    { label: "Backend API", icon: Server, ok: status === "online" },
    { label: "Database", icon: Database, ok: dbConnected },
  ];

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink dark:text-slate-100">System status</h3>
        <button
          onClick={checkHealth}
          className="rounded-md p-1 text-ink-soft transition hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800"
          aria-label="Refresh status"
        >
          <RefreshCw className={clsx("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map(({ label, icon: Icon, ok }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-ink-soft">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <span
                className={clsx(
                  "h-2 w-2 rounded-full",
                  status === "checking" ? "animate-pulseSoft bg-slate-400" : ok ? "bg-success" : "bg-danger"
                )}
              />
              <span className={ok ? "text-success" : status === "checking" ? "text-ink-soft" : "text-danger"}>
                {status === "checking" ? "Checking..." : ok ? "Online" : "Offline"}
              </span>
            </span>
          </div>
        ))}
      </div>

      {lastChecked && (
        <p className="mt-4 border-t border-line pt-3 text-xs text-ink-soft dark:border-slate-800">
          Last checked {lastChecked.toLocaleTimeString("en-IN")}
        </p>
      )}
    </Card>
  );
}
