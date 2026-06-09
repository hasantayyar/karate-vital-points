import { useEffect, useState } from "react";

/** True on touch-first devices (phones, tablets, touch emulation). */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const coarseMq = window.matchMedia("(pointer: coarse)");
    const hoverMq = window.matchMedia("(hover: none)");

    const update = () => {
      const touchCapable = navigator.maxTouchPoints > 0;
      setCoarse(
        coarseMq.matches || (hoverMq.matches && touchCapable),
      );
    };

    update();
    coarseMq.addEventListener("change", update);
    hoverMq.addEventListener("change", update);
    return () => {
      coarseMq.removeEventListener("change", update);
      hoverMq.removeEventListener("change", update);
    };
  }, []);

  return coarse;
}
