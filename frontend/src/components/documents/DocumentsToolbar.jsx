import { Search, X } from "lucide-react";
import { DEPARTMENTS, DOCUMENT_STATUSES } from "../../config/departments";

const selectClass =
  "h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export default function DocumentsToolbar({ filters, onChange, onClear, hasActiveFilters }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        <input
          value={filters.q}
          onChange={(event) => onChange({ ...filters, q: event.target.value })}
          placeholder="Search by name, department, description..."
          className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <select
        value={filters.department}
        onChange={(event) => onChange({ ...filters, department: event.target.value })}
        className={selectClass}
      >
        <option value="">All departments</option>
        {DEPARTMENTS.map((dept) => (
          <option key={dept} value={dept}>
            {dept}
          </option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(event) => onChange({ ...filters, status: event.target.value })}
        className={selectClass}
      >
        <option value="">All statuses</option>
        {DOCUMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={filters.date}
        onChange={(event) => onChange({ ...filters, date: event.target.value })}
        className={selectClass}
      />

      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium text-ink-soft transition hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
