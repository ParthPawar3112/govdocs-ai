// The source logo file is a solid-background PNG (no transparency), so on
// dark surfaces (sidebar, login panel) it needs an explicit white chip
// behind it to avoid an ugly white box artifact - on light surfaces it can
// sit directly on the page. `chip` controls this; `size` covers the actual
// spots this app uses (collapsed sidebar icon, expanded sidebar header,
// login page hero).
import clsx from "clsx";

const SIZES = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
};

export default function Logo({ size = "md", chip = false, className }) {
  return (
    <div
      className={clsx(
        SIZES[size],
        "shrink-0 overflow-hidden rounded-xl",
        chip && "bg-white p-1 shadow-sm",
        className
      )}
    >
      <img src="/logo.png" alt="GovDocs AI logo" className="h-full w-full object-contain" />
    </div>
  );
}
