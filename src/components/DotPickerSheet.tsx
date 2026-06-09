import { createPortal } from "react-dom";
import type { PlacedDot } from "../types";

interface DotPickerSheetProps {
  candidates: PlacedDot[];
  onSelect: (dot: PlacedDot) => void;
  onDismiss: () => void;
}

export default function DotPickerSheet({
  candidates,
  onSelect,
  onDismiss,
}: DotPickerSheetProps) {
  if (candidates.length === 0) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-end justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dot-picker-title"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-md rounded-t-xl border border-stone-700 bg-stone-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-stone-800 px-4 py-3">
          <p id="dot-picker-title" className="text-sm font-medium text-stone-200">
            Which point?
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            Several points are close together
          </p>
        </div>
        <ul className="max-h-[min(50vh,320px)] overflow-y-auto p-2">
          {candidates.map((dot) => {
            const orderLabel =
              dot.positionIndex > 0
                ? `${dot.order}.${dot.positionIndex + 1}`
                : String(dot.order);

            return (
              <li key={`${dot.pointId}:${dot.positionIndex}`}>
                <button
                  type="button"
                  className="w-full rounded-lg px-4 py-3.5 text-left text-base font-medium text-stone-100 transition-colors hover:bg-stone-800 active:bg-amber-950/50"
                  onClick={() => onSelect(dot)}
                >
                  <span className="text-stone-500">{orderLabel}.</span> {dot.pointName}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-stone-800 p-2">
          <button
            type="button"
            className="w-full rounded-lg px-4 py-2.5 text-sm text-stone-400 hover:bg-stone-800 hover:text-stone-200"
            onClick={onDismiss}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
