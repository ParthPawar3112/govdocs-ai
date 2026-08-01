import clsx from "clsx";
import { getInitials } from "../../utils/format";

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
};

export default function Avatar({ username, size = "md", className }) {
  return (
    <div
      className={clsx(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-dark font-bold text-white",
        SIZES[size],
        className
      )}
      aria-hidden="true"
    >
      {getInitials(username)}
    </div>
  );
}
