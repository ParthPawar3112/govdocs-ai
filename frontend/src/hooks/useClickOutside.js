// Closes a dropdown/menu when a click lands outside its referenced element.
import { useEffect } from "react";

export function useClickOutside(ref, onOutsideClick, isActive) {
  useEffect(() => {
    if (!isActive) return undefined;

    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        onOutsideClick();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ref, onOutsideClick, isActive]);
}
