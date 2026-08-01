import Badge from "./Badge";

export default function EmptyState({ icon: Icon, title, description, phase, className }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className || ""}`}>
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 dark:bg-primary/15">
        <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
      </div>
      <h3 className="text-sm font-semibold text-ink dark:text-slate-100">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-soft dark:text-slate-400">{description}</p>
      {phase && (
        <Badge tone="primary" className="mt-4">
          {phase}
        </Badge>
      )}
    </div>
  );
}
