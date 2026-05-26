import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { clientToPercent, svgViewBoxWidth } from "../lib/imageCoords";
import {
  dotKey,
  findNearestDot,
  flattenDots,
  percentToSvgCoords,
  roundCoord,
} from "../lib/points";
import type { BodySide, DotFeedback, PlacedDot, PlacedVitalPoint } from "../types";
import DotTooltip from "./DotTooltip";
import QuizPulseMarker from "./QuizPulseMarker";

const DOT_RADIUS = 3.5;
const NEAR_DOT_DISTANCE = 7;
/** Minimum touch target (CSS px). */
const TOUCH_TARGET_PX = 44;


export interface ImageViewerProps {
  side: BodySide;
  points: PlacedVitalPoint[];
  imageSrc?: string;
  mode: "study" | "flashcards" | "quiz" | "edit";
  highlightedPointId?: string | null;
  selectedPointId?: string | null;
  visibleDotKeys?: string[] | null;
  pulseDotKey?: string | null;
  /** Quiz: pulse at these % coords (same system as edit/study clicks). */
  quizPulsePosition?: { x: number; y: number } | null;
  /** Prefer live dot coords from this key when set. */
  quizPulseDotKey?: string | null;
  showPointLabels?: boolean;
  feedbackByPointId?: Record<string, DotFeedback>;
  onDotClick?: (dot: PlacedDot) => void;
  onSvgClick?: (x: number, y: number) => void;
  interactive?: boolean;
  tapNearestDot?: boolean;
}

export default function ImageViewer({
  side,
  points,
  imageSrc = `${import.meta.env.BASE_URL}vital-points.jpeg`,
  mode,
  highlightedPointId = null,
  selectedPointId = null,
  visibleDotKeys = null,
  pulseDotKey = null,
  quizPulsePosition = null,
  quizPulseDotKey = null,
  showPointLabels = true,
  feedbackByPointId = {},
  onDotClick,
  onSvgClick,
  interactive = true,
  tapNearestDot = false,
}: ImageViewerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageReady, setImageReady] = useState(false);
  const [imageAspect, setImageAspect] = useState(1);
  const [hoveredDotKey, setHoveredDotKey] = useState<string | null>(null);
  const [pinnedDotKey, setPinnedDotKey] = useState<string | null>(null);
  const labelId = useId();

  const syncImageFromElement = useCallback(() => {
    const img = imgRef.current;
    if (!img || img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
    setImageAspect(img.naturalWidth / img.naturalHeight);
    setImageReady(true);
  }, []);

  useEffect(() => {
    setImageReady(false);
    setImageAspect(1);
  }, [imageSrc]);

  // Cached images often skip onLoad; opening DevTools only resized the page before.
  useLayoutEffect(() => {
    syncImageFromElement();
  }, [imageSrc, syncImageFromElement]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const observer = new ResizeObserver(() => syncImageFromElement());
    observer.observe(img);
    return () => observer.disconnect();
  }, [imageSrc, syncImageFromElement]);

  const viewBoxW = svgViewBoxWidth(imageAspect);

  const allDots = flattenDots(points);
  const isEditMode = mode === "edit";
  const isStudyMode = mode === "study";
  const isQuizMode = mode === "quiz";
  const tooltipsEnabled = isStudyMode || isEditMode;
  const canPickOnImage = interactive && !!onDotClick && tapNearestDot;
  const dotsInteractive = interactive || isEditMode;

  const renderedDots =
    visibleDotKeys === null
      ? allDots
      : allDots.filter((d) =>
          visibleDotKeys.includes(dotKey(d.pointId, d.positionIndex)),
        );

  const hasAnyMarkers = allDots.length > 0;

  const quizPulseCoords = useMemo(() => {
    if (quizPulseDotKey) {
      const dot = allDots.find(
        (d) => dotKey(d.pointId, d.positionIndex) === quizPulseDotKey,
      );
      if (dot) return { x: dot.x, y: dot.y };
    }
    return quizPulsePosition;
  }, [allDots, quizPulseDotKey, quizPulsePosition]);

  const showQuizPulse = isQuizMode && quizPulseCoords !== null;

  const mapClickToPercent = useCallback((event: React.MouseEvent) => {
    const el = overlayRef.current;
    if (!el) return null;
    return clientToPercent(event.clientX, event.clientY, el.getBoundingClientRect());
  }, []);

  const handleDotActivate = useCallback(
    (dot: PlacedDot, event: React.MouseEvent | React.PointerEvent) => {
      if (!dotsInteractive) return;
      event.stopPropagation();

      const key = dotKey(dot.pointId, dot.positionIndex);

      if (isStudyMode) {
        setPinnedDotKey((prev) => (prev === key ? null : key));
      }

      onDotClick?.(dot);
    },
    [dotsInteractive, isStudyMode, onDotClick],
  );

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (isEditMode && onSvgClick) {
        const coords = mapClickToPercent(event);
        if (!coords) return;
        onSvgClick(roundCoord(coords.x), roundCoord(coords.y));
        return;
      }

      if (!canPickOnImage) return;

      const coords = mapClickToPercent(event);
      if (!coords) return;

      const pool = visibleDotKeys === null ? allDots : renderedDots;
      const nearest = findNearestDot(
        coords.x,
        coords.y,
        pool,
        NEAR_DOT_DISTANCE,
        imageAspect,
      );
      if (nearest) {
        handleDotActivate(nearest, event);
      }
    },
    [
      isEditMode,
      onSvgClick,
      canPickOnImage,
      mapClickToPercent,
      visibleDotKeys,
      allDots,
      renderedDots,
      handleDotActivate,
      imageAspect,
    ],
  );

  const overlayClickable = isEditMode || canPickOnImage;

  return (
    <div className="relative mx-auto w-full max-w-3xl overflow-visible rounded-xl border border-stone-700 bg-stone-900 shadow-lg">
      <div
        ref={overlayRef}
        className={`relative w-full overflow-visible ${
          isEditMode
            ? "cursor-crosshair"
            : canPickOnImage
              ? "cursor-pointer"
              : ""
        }`}
        onClick={overlayClickable ? handleOverlayClick : undefined}
        onMouseLeave={() => {
          setHoveredDotKey(null);
          if (isStudyMode) setPinnedDotKey(null);
        }}
        role={isEditMode ? "application" : undefined}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt={`${side === "front" ? "Front" : "Back"} view vital points diagram`}
          className="pointer-events-none block h-auto w-full select-none"
          draggable={false}
          onLoad={syncImageFromElement}
        />

        {imageReady && (
          <>
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${viewBoxW} 100`}
              preserveAspectRatio="none"
              aria-labelledby={labelId}
            >
              <title id={labelId}>
                {side === "front" ? "Front" : "Back"} kyusho points
              </title>

              {renderedDots.map((dot) => {
                const key = dotKey(dot.pointId, dot.positionIndex);
                const feedback = feedbackByPointId[dot.pointId] ?? "none";
                const isHighlighted = highlightedPointId === dot.pointId;
                const isSelected = selectedPointId === dot.pointId;
                const isQuizPulseDot =
                  showQuizPulse &&
                  quizPulseCoords &&
                  Math.hypot(dot.x - quizPulseCoords.x, dot.y - quizPulseCoords.y) <
                    1.5;
                const isPulsing = pulseDotKey === key || isQuizPulseDot;
                const { cx, cy } = percentToSvgCoords(dot.x, dot.y, imageAspect);
                const dotR = isQuizPulseDot
                  ? 1.2
                  : isPulsing
                    ? (DOT_RADIUS * 1.5) / 10
                    : DOT_RADIUS / 10;

                const fill = isQuizPulseDot || isPulsing
                  ? "#f59e0b"
                  : feedback === "correct"
                    ? "#22c55e"
                    : feedback === "incorrect"
                      ? "#ef4444"
                      : isSelected || isHighlighted
                        ? "#f59e0b"
                        : "#dc2626";

                const stroke = isQuizPulseDot || isPulsing
                  ? "#fef3c7"
                  : feedback === "correct"
                    ? "#86efac"
                    : feedback === "incorrect"
                      ? "#fca5a5"
                      : isSelected || isHighlighted
                        ? "#fde68a"
                        : "#fecaca";

                return (
                  <g key={`dot-${key}`}>
                    {isPulsing && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={dotR * 2.8}
                        fill="#fbbf24"
                        fillOpacity={0.35}
                        className="quiz-ping-ring"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={dotR}
                      fill={fill}
                      fillOpacity={0.95}
                      stroke={stroke}
                      strokeWidth={isPulsing ? 0.5 : isSelected ? 0.45 : 0.3}
                    />
                  </g>
                );
              })}
            </svg>

            <div
              className={`absolute inset-0 ${dotsInteractive ? "" : "pointer-events-none"}`}
              aria-hidden={!dotsInteractive}
            >
              {renderedDots.map((dot) => {
                const key = dotKey(dot.pointId, dot.positionIndex);
                const isSelected = selectedPointId === dot.pointId;
                const isPulsing = pulseDotKey === key;
                const isHovered = hoveredDotKey === key;
                const isPinned = pinnedDotKey === key;

                const showRevealLabel =
                  tooltipsEnabled && showPointLabels && isSelected;

                const showTooltip =
                  tooltipsEnabled &&
                  (isHovered || isPinned || showRevealLabel);

                const orderLabel =
                  dot.positionIndex > 0 && isEditMode
                    ? `${dot.order}.${dot.positionIndex + 1}`
                    : String(dot.order);

                const tooltipBelow = dot.y < 14;

                return (
                  <div
                    key={`hit-${key}`}
                    className="absolute touch-manipulation"
                    style={{
                      left: `${dot.x}%`,
                      top: `${dot.y}%`,
                      width: TOUCH_TARGET_PX,
                      height: TOUCH_TARGET_PX,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <button
                      type="button"
                      className="relative flex h-full w-full items-center justify-center rounded-full border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80"
                      aria-label={`${orderLabel}. ${dot.pointName}`}
                      onClick={(e) => handleDotActivate(dot, e)}
                      onPointerEnter={() => {
                        if (tooltipsEnabled) setHoveredDotKey(key);
                      }}
                      onPointerLeave={() => {
                        if (tooltipsEnabled) {
                          setHoveredDotKey((prev) => (prev === key ? null : prev));
                        }
                      }}
                      onPointerDown={() => {
                        if (tooltipsEnabled) setHoveredDotKey(key);
                      }}
                    >
                      {isPulsing && (
                        <span
                          className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/45 quiz-ping-ring"
                          aria-hidden
                        />
                      )}
                      {isPulsing && (
                        <span
                          className="pointer-events-none relative z-10 h-3.5 w-3.5 rounded-full bg-amber-400 ring-2 ring-amber-100 shadow-[0_0_10px_rgba(251,191,36,0.85)]"
                          aria-hidden
                        />
                      )}
                      {showTooltip && (
                        <DotTooltip
                          orderLabel={orderLabel}
                          name={dot.pointName}
                          below={tooltipBelow}
                        />
                      )}
                    </button>
                  </div>
                );
              })}

            </div>
          </>
        )}

        {showQuizPulse && quizPulseCoords && (
          <div
            className="quiz-pulse-anchor pointer-events-none absolute z-[99999]"
            style={{
              left: `${quizPulseCoords.x}%`,
              top: `${quizPulseCoords.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <QuizPulseMarker />
          </div>
        )}
      </div>

      {!hasAnyMarkers && !isEditMode && (
        <p className="border-t border-stone-700 bg-stone-900/90 px-4 py-3 text-center text-sm text-stone-400">
          No dots placed yet. Use <strong className="text-amber-400">Edit</strong>{" "}
          mode to click the diagram and build{" "}
          <code className="text-amber-400">points.json</code>.
        </p>
      )}
    </div>
  );
}
