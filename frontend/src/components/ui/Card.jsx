// Base card surface used across the dashboard. Keeping this in one place
// means every card shares the same radius, border, and shadow language.
import clsx from "clsx";

export default function Card({
  children,
  className,
  hoverable = false,
  padding = "p-5",
  as: Component = "div",
  ...rest
}) {
  return (
    <Component
      className={clsx(
        "rounded-2xl border border-line bg-white shadow-card dark:border-slate-800 dark:bg-slate-900",
        padding,
        hoverable &&
          "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover",
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
