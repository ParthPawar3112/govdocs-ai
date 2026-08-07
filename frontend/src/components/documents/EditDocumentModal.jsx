import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { DEPARTMENTS, DOCUMENT_STATUSES } from "../../config/departments";
import { updateDocumentRequest } from "../../api/documents";
import { useToast } from "../../hooks/useToast";

export default function EditDocumentModal({ isOpen, onClose, document: doc, onUpdated }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ title: "", department: "", description: "", status: "" });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (doc) {
      setForm({
        title: doc.title,
        department: doc.department,
        description: doc.description || "",
        status: doc.status,
      });
      setError("");
    }
  }, [doc]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const { data } = await updateDocumentRequest(doc.id, form);
      showToast(`"${data.title}" updated successfully`, "success");
      onUpdated(data);
      onClose();
    } catch (requestError) {
      const message = requestError.response?.data?.detail || "Could not save changes.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!doc) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit document" size="md">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">Title</span>
          <input
            value={form.title}
            onChange={(event) => setForm((c) => ({ ...c, title: event.target.value }))}
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
            Department
          </span>
          <select
            value={form.department}
            onChange={(event) => setForm((c) => ({ ...c, department: event.target.value }))}
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
            Status
          </span>
          <select
            value={form.status}
            onChange={(event) => setForm((c) => ({ ...c, status: event.target.value }))}
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {DOCUMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
            Description
          </span>
          <textarea
            value={form.description}
            onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))}
            rows={3}
            className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" loading={isSaving}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
