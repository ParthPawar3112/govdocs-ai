import { useEffect, useState } from "react";
import axios from "axios";

const BACKEND_URL = "http://localhost:8000";

export default function App() {
  const [status, setStatus] = useState("checking"); // checking | ok | error
  const [details, setDetails] = useState(null);

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/health`)
      .then((res) => {
        setDetails(res.data);
        setStatus("ok");
      })
      .catch(() => {
        setStatus("error");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-[fadeIn_0.4s_ease-in-out]">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-semibold">
            G
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">GovDocs AI</h1>
            <p className="text-xs text-slate-500">Project setup verification</p>
          </div>
        </div>

        {status === "checking" && (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
            Checking backend connection...
          </div>
        )}

        {status === "ok" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Backend connected
            </div>
            <div className="bg-surface rounded-xl border border-slate-200 p-4 text-sm text-slate-600 space-y-1">
              <p>
                <span className="text-slate-400">Service:</span> {details.service}
              </p>
              <p>
                <span className="text-slate-400">Database:</span> {details.database}
              </p>
              <p>
                <span className="text-slate-400">DB URL:</span> {details.database_url}
              </p>
            </div>
            <p className="text-xs text-slate-400">
              Frontend, backend, and SQLite are all wired correctly. Ready for Module 1.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Could not reach the backend
            </div>
            <p className="text-xs text-slate-500">
              Make sure the FastAPI server is running at{" "}
              <code className="bg-surface px-1 py-0.5 rounded">{BACKEND_URL}</code> (see
              "Run commands" in the README).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
