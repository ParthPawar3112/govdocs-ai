import { Loader2, Search } from "lucide-react";

export default function SearchBar({ value, onChange, isSearching }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search documents, OCR text, AI metadata..."
        className="h-14 w-full rounded-2xl border border-line bg-white pl-12 pr-32 text-base text-ink shadow-card outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      {isSearching && (
        <span className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-xs font-medium text-ink-soft">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Searching...
        </span>
      )}
    </div>
  );
}
