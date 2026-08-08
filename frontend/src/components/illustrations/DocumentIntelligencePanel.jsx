// The login page's visual centerpiece. Rather than a document card surrounded
// by scattered floating badges, this reads as ONE system: a single document
// panel with an internal OCR -> AI -> Secure pipeline (a vertical timeline),
// built entirely from existing Tailwind utilities + lucide icons.
import clsx from "clsx";
import { CheckCircle2, FileText, ShieldCheck, Sparkles } from "lucide-react";

const TONE = {
  success: { badge: "bg-success/10 text-success", label: "text-success" },
  primary: { badge: "bg-primary/10 text-primary", label: "text-primary" },
  primaryDark: { badge: "bg-primary-dark/10 text-primary-dark", label: "text-primary-dark" },
};

const TAGS = ["Municipal Dept.", "Certificate", "96% confidence"];

const STEPS = [
  {
    icon: CheckCircle2,
    tone: "success",
    label: "OCR Extraction",
    body: (
      <div className="mt-1.5 space-y-1.5">
        <div className="h-1.5 w-full animate-pulseSoft rounded-full bg-slate-100" />
        <div className="h-1.5 w-11/12 animate-pulseSoft rounded-full bg-slate-100 [animation-delay:0.3s]" />
        <div className="h-1.5 w-2/3 animate-pulseSoft rounded-full bg-primary/20 [animation-delay:0.6s]" />
      </div>
    ),
  },
  {
    icon: Sparkles,
    tone: "primary",
    label: "AI Understanding",
    body: (
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {TAGS.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary"
          >
            {tag}
          </span>
        ))}
      </div>
    ),
  },
  {
    icon: ShieldCheck,
    tone: "primaryDark",
    label: "Indexed & Secured",
    body: <p className="mt-1 text-[11px] text-slate-500">Searchable &middot; Encrypted &middot; Audit-logged</p>,
  },
];

export default function DocumentIntelligencePanel() {
  return (
    <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Government Document
          </span>
        </div>
        <span className="flex items-center gap-1 text-[9px] font-medium text-slate-400">
          <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-success" />
          Live
        </span>
      </div>

      <div className="px-4 py-3.5">
        <p className="text-[13px] font-bold text-ink">Municipal Property Certificate</p>

        <div className="mt-3 space-y-3">
          {STEPS.map(({ icon: Icon, tone, label, body }, index) => (
            <div key={label} className="flex gap-2.5">
              <div className="flex flex-col items-center">
                <span
                  className={clsx(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full",
                    TONE[tone].badge
                  )}
                >
                  <Icon className="h-3 w-3" strokeWidth={2.5} />
                </span>
                {index < STEPS.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-100" />}
              </div>
              <div className="flex-1 pb-0.5">
                <p className={clsx("text-[10px] font-semibold uppercase tracking-wide", TONE[tone].label)}>
                  {label}
                </p>
                {body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
