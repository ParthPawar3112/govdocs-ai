// Small reusable dashboard statistic card used for the Phase 2 placeholder counts.
export default function StatCard({ label, value, accent }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`mb-4 h-1 w-10 rounded ${accent}`} /><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold text-slate-900">{value}</p></article>;
}
