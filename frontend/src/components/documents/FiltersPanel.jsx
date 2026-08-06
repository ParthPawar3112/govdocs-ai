// A slide-over drawer (not the main nav sidebar) with its own draft state -
// changes only take effect when "Apply filters" is clicked, matching the
// brief's explicit Apply/Reset button pair.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Button from "../ui/Button";
import { DEPARTMENTS, ALLOWED_UPLOAD_EXTENSIONS, DOCUMENT_STATUSES } from "../../config/departments";

const selectClass =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

const emptyDraft = {
  category: "",
  department: "",
  status: "",
  file_type: "",
  date: "",
  ocr_processed: false,
  ai_processed: false,
};

export default function FiltersPanel({ isOpen, onClose, activeFilters, categories, onApply, onReset }) {
  const [draft, setDraft] = useState(emptyDraft);

  useEffect(() => {
    if (isOpen) setDraft({ ...emptyDraft, ...activeFilters });
  }, [isOpen, activeFilters]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleReset = () => {
    setDraft(emptyDraft);
    onReset();
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm animate-slideInRight flex-col border-l border-line bg-white shadow-glass dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-ink dark:text-slate-100">Advanced filters</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close filters"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
              Category
            </span>
            <select
              value={draft.category}
              onChange={(event) => setDraft((d) => ({ ...d, category: event.target.value }))}
              className={selectClass}
            >
              <option value="">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
              Department
            </span>
            <select
              value={draft.department}
              onChange={(event) => setDraft((d) => ({ ...d, department: event.target.value }))}
              className={selectClass}
            >
              <option value="">All departments</option>
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
              value={draft.status}
              onChange={(event) => setDraft((d) => ({ ...d, status: event.target.value }))}
              className={selectClass}
            >
              <option value="">All statuses</option>
              {DOCUMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
              File type
            </span>
            <select
              value={draft.file_type}
              onChange={(event) => setDraft((d) => ({ ...d, file_type: event.target.value }))}
              className={selectClass}
            >
              <option value="">All file types</option>
              {ALLOWED_UPLOAD_EXTENSIONS.map((ext) => (
                <option key={ext} value={ext}>
                  {ext.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
              Upload date
            </span>
            <input
              type="date"
              value={draft.date}
              onChange={(event) => setDraft((d) => ({ ...d, date: event.target.value }))}
              className={selectClass}
            />
          </label>

          <div className="space-y-3 border-t border-line pt-4 dark:border-slate-800">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink dark:text-slate-200">
              <input
                type="checkbox"
                checked={draft.ocr_processed}
                onChange={(event) => setDraft((d) => ({ ...d, ocr_processed: event.target.checked }))}
                className="h-4 w-4 rounded border-line text-primary focus:ring-primary/40"
              />
              OCR completed
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink dark:text-slate-200">
              <input
                type="checkbox"
                checked={draft.ai_processed}
                onChange={(event) => setDraft((d) => ({ ...d, ai_processed: event.target.checked }))}
                className="h-4 w-4 rounded border-line text-primary focus:ring-primary/40"
              />
              AI completed
            </label>
          </div>
        </div>

        <div className="flex gap-3 border-t border-line px-5 py-4 dark:border-slate-800">
          <Button variant="secondary" className="flex-1" onClick={handleReset}>
            Reset filters
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            Apply filters
          </Button>
        </div>
      </aside>
    </>
  );
}
