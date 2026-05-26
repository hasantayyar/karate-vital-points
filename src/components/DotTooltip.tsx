interface DotTooltipProps {
  orderLabel: string;
  name: string;
  /** Show below the dot when near the top edge. */
  below?: boolean;
}

/** HTML tooltip — crisp on all screens, works with touch + hover. */
export default function DotTooltip({
  orderLabel,
  name,
  below = false,
}: DotTooltipProps) {
  return (
    <div
      role="tooltip"
      className={`pointer-events-none absolute left-1/2 z-20 w-max max-w-[min(7rem,40vw)] -translate-x-1/2 rounded border border-stone-600/80 bg-stone-950/95 px-1.5 py-0.5 text-center shadow-md ${
        below ? "top-full mt-1" : "bottom-full mb-1"
      }`}
    >
      <p className="text-[9px] font-semibold leading-tight text-stone-500">
        {orderLabel}
      </p>
      <p className="mt-px text-[11px] font-medium leading-snug text-stone-100">
        {name}
      </p>
    </div>
  );
}
