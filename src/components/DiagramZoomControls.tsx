import { Minus, Plus, RotateCcw } from "lucide-react";

interface DiagramZoomControlsProps {
  scale: number;
  isZoomed: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export default function DiagramZoomControls({
  scale,
  isZoomed,
  onZoomIn,
  onZoomOut,
  onReset,
}: DiagramZoomControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 bg-stone-900/80 px-3 py-2">
      <p className="text-xs text-stone-500 sm:text-sm">
        Pinch or use +/− to zoom · drag to pan · double-tap to reset
      </p>
      <div className="flex items-center gap-1.5">
        <span className="min-w-[3rem] text-center text-xs tabular-nums text-stone-400">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          className="diagram-zoom-btn inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-700 bg-stone-800 text-stone-200 hover:bg-stone-700"
          aria-label="Zoom out"
          onClick={onZoomOut}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="diagram-zoom-btn inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-700 bg-stone-800 text-stone-200 hover:bg-stone-700"
          aria-label="Zoom in"
          onClick={onZoomIn}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="diagram-zoom-btn inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-700 bg-stone-800 text-stone-200 hover:bg-stone-700 disabled:opacity-40"
          aria-label="Reset zoom"
          disabled={!isZoomed}
          onClick={onReset}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
