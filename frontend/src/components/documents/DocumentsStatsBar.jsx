import { FileText, Filter, ScanText, Sparkles } from "lucide-react";

function StatChip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-50 dark:bg-primary/15">
        <Icon className="h-4 w-4 text-primary" />
      </span>
      <div>
        <p className="text-sm font-bold leading-tight text-ink dark:text-slate-100">{value}</p>
        <p className="text-xs text-ink-soft">{label}</p>
      </div>
    </div>
  );
}

export default function DocumentsStatsBar({ overallTotal, filteredTotal, aiProcessed, ocrProcessed }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatChip icon={FileText} label="Total documents" value={overallTotal} />
      <StatChip icon={Filter} label="Filtered results" value={filteredTotal} />
      <StatChip icon={Sparkles} label="AI processed" value={aiProcessed} />
      <StatChip icon={ScanText} label="OCR processed" value={ocrProcessed} />
    </div>
  );
}
