// "My Documents" - a Citizen's own submissions only. The list comes from
// GET /api/citizen/documents, which is server-scoped to the caller; there is
// no repository-wide search here by design (§14). Silent 3s re-poll while any
// row is still mid-pipeline, same approach as DocumentsSection.
import { useCallback, useEffect, useState } from "react";
import { FolderOpen, RefreshCw } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import StatusBadge from "../documents/StatusBadge";
import CitizenDocumentModal from "./CitizenDocumentModal";
import { getCitizenDocumentsRequest } from "../../api/citizen";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../utils/format";

const IN_FLIGHT = new Set(["Uploaded", "OCR Processing", "AI Processing"]);

export default function CitizenDocumentsSection() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const fetchDocuments = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const { data } = await getCitizenDocumentsRequest();
        setDocuments(data);
      } catch {
        if (!silent) showToast("Unable to load documents.", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    const anyInFlight = documents.some((doc) => IN_FLIGHT.has(doc.lifecycle_status));
    if (!anyInFlight) return undefined;
    const interval = setInterval(() => fetchDocuments(true), 3000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">My Documents</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-slate-100">
            Your submitted documents
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Documents submitted by{" "}
            <span className="font-medium text-ink dark:text-slate-200">
              {user?.full_name || user?.username}
            </span>
            {user?.citizen_id ? ` · Citizen ID: ${user.citizen_id}` : ""}. Track each one through
            OCR, AI analysis, and officer review.
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => fetchDocuments()}>
          Refresh
        </Button>
      </div>

      <Card padding="p-0" className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No documents submitted yet"
            description="Use Upload Document to submit a document for digital processing and officer review."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft dark:border-slate-800">
                  <th className="px-5 py-3">Document</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">OCR</th>
                  <th className="px-5 py-3">AI</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => setSelected(doc)}
                    className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-5 py-3 font-medium text-ink dark:text-slate-100">{doc.title}</td>
                    <td className="px-5 py-3 text-ink-soft">
                      {formatDateTime(new Date(doc.upload_date))}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={doc.lifecycle_status} />
                    </td>
                    <td className="px-5 py-3 capitalize text-ink-soft">{doc.ocr_status}</td>
                    <td className="px-5 py-3 capitalize text-ink-soft">{doc.ai_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CitizenDocumentModal
        isOpen={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          fetchDocuments(true);
        }}
        document={selected}
      />
    </div>
  );
}
