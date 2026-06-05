import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Download,
  Eraser,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { usePoints } from "../context/PointsContext";
import { copyPointsJson, downloadPointsJson } from "../lib/exportPoints";
import {
  getPointsForSide,
  hasCoordinates,
  positionCount,
} from "../lib/points";
import type { BodySide } from "../types";
import ImageViewer from "./ImageViewer";

interface CoordinateEditorProps {
  side: BodySide;
}

export default function CoordinateEditor({ side }: CoordinateEditorProps) {
  const {
    data,
    addPosition,
    removePosition,
    clearPositions,
    clearDraft,
    placedCount,
  } = usePoints();
  const points = getPointsForSide(data, side);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  const selected = points[selectedIndex];
  const placed = placedCount(side);
  const total = points.length;

  const sidePoints = useMemo(
    () => points.map((p) => ({ ...p, side })),
    [points, side],
  );

  const goTo = (index: number) => {
    setSelectedIndex(Math.max(0, Math.min(index, points.length - 1)));
  };

  const handleSvgClick = (x: number, y: number) => {
    if (!selected) return;
    addPosition(side, selected.id, x, y);
  };

  const handleClear = () => {
    if (!selected) return;
    clearPositions(side, selected.id);
  };

  const handleCopy = async () => {
    try {
      await copyPointsJson(data);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
    }
  };

  if (!selected) return null;

  const markers = selected.positions;
  const markerCount = positionCount(selected);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100/90">
        <p className="font-medium text-amber-300">Build points.json</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-amber-100/80">
          <li>
            Put your diagram at{" "}
            <code className="text-amber-300">public/vital-points-front.jpeg</code>{" "}
            and{" "}
            <code className="text-amber-300">public/vital-points-back.jpeg</code>
          </li>
          <li>
            Select a point, then <strong>click each location</strong> on the image
            (multiple clicks for points like Shichu or Futto)
          </li>
          <li>
            Copy or download JSON and replace{" "}
            <code className="text-amber-300">src/data/points.json</code>
          </li>
        </ol>
        <p className="mt-2 text-xs text-amber-200/60">
          Coordinates are percentages (0–100) in a{" "}
          <code className="text-amber-300">positions</code> array per point.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-800 bg-stone-900/60 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-stone-500">
            Point {selected.order} of {total} · {placed} with markers
          </p>
          <p className="text-xl font-semibold text-stone-50">{selected.name}</p>
          <p className="text-xs text-stone-400">
            {markerCount === 0
              ? "No markers yet"
              : `${markerCount} marker${markerCount === 1 ? "" : "s"} on diagram`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(selectedIndex - 1)}
            disabled={selectedIndex === 0}
            className="rounded-md border border-stone-700 p-2 text-stone-300 hover:bg-stone-800 disabled:opacity-40"
            aria-label="Previous point"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => goTo(selectedIndex + 1)}
            disabled={selectedIndex === points.length - 1}
            className="rounded-md border border-stone-700 p-2 text-stone-300 hover:bg-stone-800 disabled:opacity-40"
            aria-label="Next point"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={markerCount === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-stone-700 px-3 py-2 text-sm text-stone-300 hover:bg-stone-800 disabled:opacity-40"
          >
            <Eraser className="h-4 w-4" />
            Clear all
          </button>
        </div>
      </div>

      {markers.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-stone-800 bg-stone-900/40 px-3 py-2">
          {markers.map((pos, index) => (
            <li
              key={`${selected.id}-${index}`}
              className="flex items-center justify-between gap-2 text-sm text-stone-300"
            >
              <span className="font-mono text-xs">
                Marker {index + 1}: x {pos.x}, y {pos.y}
              </span>
              <button
                type="button"
                onClick={() => removePosition(side, selected.id, index)}
                className="rounded p-1 text-stone-500 hover:bg-stone-800 hover:text-red-400"
                aria-label={`Remove marker ${index + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-sm text-stone-400">
        Click the image to add a marker. Use the list above to remove one.
      </p>

      <ImageViewer
        side={side}
        points={sidePoints}
        mode="edit"
        highlightedPointId={selected.id}
        selectedPointId={selected.id}
        onSvgClick={handleSvgClick}
        onDotClick={(dot) => {
          const index = points.findIndex((p) => p.id === dot.pointId);
          if (index >= 0) setSelectedIndex(index);
        }}
        interactive
      />

      <ul className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto text-sm sm:grid-cols-3">
        {points.map((p, index) => {
          const count = positionCount(p);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors ${
                  index === selectedIndex
                    ? "border-amber-500 bg-amber-950/50 text-amber-100"
                    : hasCoordinates(p)
                      ? "border-stone-700 text-stone-300 hover:border-stone-600"
                      : "border-stone-800 text-stone-500 hover:border-stone-700"
                }`}
              >
                <span className="text-stone-500">{p.order}.</span> {p.name}
                {count > 0 && (
                  <span className="ml-1 text-xs text-stone-500">({count})</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap justify-center gap-2 border-t border-stone-800 pt-4">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
        >
          <ClipboardCopy className="h-4 w-4" />
          {copyStatus === "copied"
            ? "Copied!"
            : copyStatus === "error"
              ? "Copy failed"
              : "Copy points.json"}
        </button>
        <button
          type="button"
          onClick={() => downloadPointsJson(data)}
          className="inline-flex items-center gap-2 rounded-md border border-stone-600 px-4 py-2 text-sm font-medium text-stone-200 hover:bg-stone-800"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                "Clear browser draft and reset all coordinates to empty?",
              )
            ) {
              clearDraft();
              setSelectedIndex(0);
            }
          }}
          className="inline-flex items-center gap-2 rounded-md border border-stone-700 px-4 py-2 text-sm text-stone-400 hover:bg-stone-800 hover:text-stone-200"
        >
          <RotateCcw className="h-4 w-4" />
          Reset all
        </button>
      </div>
    </div>
  );
}
