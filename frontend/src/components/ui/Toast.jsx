import { CheckCircle2, X, XCircle } from "lucide-react";
import { useToast } from "../../hooks/useToast";

const STYLES = {
  success: {
    icon: CheckCircle2,
    classes: "border-green-200 bg-white text-ink dark:border-green-900 dark:bg-slate-900",
    iconClass: "text-success",
  },
  error: {
    icon: XCircle,
    classes: "border-red-200 bg-white text-ink dark:border-red-900 dark:bg-slate-900",
    iconClass: "text-danger",
  },
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => {
        const style = STYLES[toast.variant] ?? STYLES.success;
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            role="status"
            className={`flex animate-slideInRight items-start gap-2.5 rounded-xl border p-3.5 shadow-glass ${style.classes}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconClass}`} />
            <p className="flex-1 text-sm text-ink dark:text-slate-100">{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-ink-soft hover:text-ink dark:hover:text-slate-200"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
