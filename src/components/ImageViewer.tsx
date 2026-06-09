import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  clientToPercent,
  svgViewBoxWidth,
  vitalPointsImageSrc,
} from "../lib/imageCoords";
import { clientToPercentInViewport } from "../lib/diagramZoom";
import {
  dotKey,
  findNearDots,
  flattenDots,
  isAmbiguousTap,
  percentToSvgCoords,
  roundCoord,
  scaleAwareTapRadius,
} from "../lib/points";
import { useCoarsePointer } from "../hooks/useCoarsePointer";
import { useDiagramZoom } from "../hooks/useDiagramZoom";
import type { BodySide, DotFeedback, PlacedDot, PlacedVitalPoint } from "../types";
import DiagramZoomControls from "./DiagramZoomControls";
import DotPickerSheet from "./DotPickerSheet";
import DotTooltip from "./DotTooltip";
import QuizPulseMarker from "./QuizPulseMarker";

const DOT_RADIUS = 3.5;
const NEAR_DOT_DISTANCE = 7;
const TOUCH_TARGET_DESKTOP = 44;
const TOUCH_TARGET_MOBILE = 52;

export interface ImageViewerProps {
  side: BodySide;
  points: PlacedVitalPoint[];
  imageSrc?: string;
  mode: "study" | "flashcards" | "quiz" | "edit";
  highlightedPointId?: string | null;
  selectedPointId?: string | null;
  visibleDotKeys?: string[] | null;
  pulseDotKey?: string | null;
  quizPulsePosition?: { x: number; y: number } | null;
  quizPulseDotKey?: string | null;
  showPointLabels?: boolean;
  feedbackByPointId?: Record<string, DotFeedback>;
  onDotClick?: (dot: PlacedDot) => void;
  onSvgClick?: (x: number, y: number) => void;
  interactive?: boolean;
  tapNearestDot?: boolean;
  /** Increment to pan/zoom toward the selected point (list selection only). */
  focusRequestId?: number;
}

export default function ImageViewer({
  side,
  points,
  imageSrc,
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
  focusRequestId = 0,
}: ImageViewerProps) {
  const imageVariant =
    mode === "flashcards" || mode === "quiz" ? "no-clue" : "default";
  const resolvedImageSrc = imageSrc ?? vitalPointsImageSrc(side, imageVariant);
  const coarsePointer = useCoarsePointer();
  const touchTargetPx = coarsePointer ? TOUCH_TARGET_MOBILE : TOUCH_TARGET_DESKTOP;

  const overlayRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const prevFocusRequestId = useRef(0);
  const transformRef = useRef({ scale: 1, panX: 0, panY: 0 });
  const handleTapRef = useRef<(clientX: number, clientY: number) => void>(() => {});
  const [animateFocus, setAnimateFocus] = useState(false);

  const [imageReady, setImageReady] = useState(false);
  const [imageAspect, setImageAspect] = useState(1);
  const [hoveredDotKey, setHoveredDotKey] = useState<string | null>(null);
  const [pinnedDotKey, setPinnedDotKey] = useState<string | null>(null);
  const [pickerCandidates, setPickerCandidates] = useState<PlacedDot[] | null>(null);
  const labelId = useId();

  const isEditMode = mode === "edit";
  const isStudyMode = mode === "study";
  const isQuizMode = mode === "quiz";
  const tooltipsEnabled = isStudyMode || isEditMode;

  const studyOverlayPick =
    isStudyMode && interactive && !!onDotClick && coarsePointer;
  const canPickOnImage =
    studyOverlayPick ||
    (interactive && !!onDotClick && !isEditMode && (tapNearestDot || coarsePointer));
  const dotsInteractive = interactive || isEditMode;
  const dotButtonsInteractive = dotsInteractive && !(coarsePointer && canPickOnImage);

  const allDots = flattenDots(points);
  const renderedDots =
    visibleDotKeys === null
      ? allDots
      : allDots.filter((d) =>
          visibleDotKeys.includes(dotKey(d.pointId, d.positionIndex)),
        );

  const {
    viewportRef,
    transform,
    resetTransform,
    zoomIn,
    zoomOut,
    revealPoint,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    shouldSuppressClick,
    isZoomed,
  } = useDiagramZoom({
    enabled: true,
    resetKey: `${side}-${resolvedImageSrc}`,
    onTap: canPickOnImage
      ? (clientX, clientY) => handleTapRef.current(clientX, clientY)
      : undefined,
  });

  transformRef.current = transform;
  const viewportConstrained = isZoomed;

  const syncImageFromElement = useCallback(() => {
    const img = imgRef.current;
    if (!img || img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
    setImageAspect(img.naturalWidth / img.naturalHeight);
    setImageReady(true);
  }, []);

  useEffect(() => {
    setImageReady(false);
    setImageAspect(1);
  }, [resolvedImageSrc]);

  useLayoutEffect(() => {
    syncImageFromElement();
  }, [resolvedImageSrc, syncImageFromElement]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const observer = new ResizeObserver(() => syncImageFromElement());
    observer.observe(img);
    return () => observer.disconnect();
  }, [resolvedImageSrc, syncImageFromElement]);

  useEffect(() => {
    prevFocusRequestId.current = 0;
  }, [side, resolvedImageSrc]);

  useLayoutEffect(() => {
    if (
      !isStudyMode ||
      !selectedPointId ||
      !imageReady ||
      focusRequestId === 0 ||
      focusRequestId === prevFocusRequestId.current
    ) {
      return;
    }

    const point = points.find((p) => p.id === selectedPointId);
    const position = point?.positions[0];
    if (!position) return;

    prevFocusRequestId.current = focusRequestId;

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimateFocus(true);
        revealPoint(position, {
          allowZoom: coarsePointer,
          maxAutoZoom: 1.75,
          edgeMargin: coarsePointer ? 0.22 : 0.12,
        });
        window.setTimeout(() => setAnimateFocus(false), 320);
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [
    isStudyMode,
    selectedPointId,
    imageReady,
    focusRequestId,
    points,
    revealPoint,
    coarsePointer,
  ]);

  const activateDot = useCallback(
    (dot: PlacedDot) => {
      if (!dotsInteractive) return;

      const key = dotKey(dot.pointId, dot.positionIndex);

      if (isStudyMode) {
        setPinnedDotKey((prev) => (prev === key ? null : key));
      }

      onDotClick?.(dot);
    },
    [dotsInteractive, isStudyMode, onDotClick],
  );

  const mapClickToPercent = useCallback((clientX: number, clientY: number) => {
    const overlay = overlayRef.current;
    const viewport = viewportRef.current;
    if (!overlay || !viewport) return null;

    const t = transformRef.current;

    if (t.scale > 1.01 || t.panX !== 0 || t.panY !== 0) {
      return clientToPercentInViewport(
        clientX,
        clientY,
        viewport.getBoundingClientRect(),
        overlay.offsetWidth,
        overlay.offsetHeight,
        t,
      );
    }

    return clientToPercent(clientX, clientY, overlay.getBoundingClientRect());
  }, [viewportRef]);

  const resolveTapAt = useCallback(
    (clientX: number, clientY: number) => {
      const coords = mapClickToPercent(clientX, clientY);
      if (!coords) return;

      const pool = visibleDotKeys === null ? allDots : renderedDots;
      const maxDistance = scaleAwareTapRadius(
        NEAR_DOT_DISTANCE,
        transformRef.current.scale,
      );
      const candidates = findNearDots(
        coords.x,
        coords.y,
        pool,
        maxDistance,
        imageAspect,
      );

      if (candidates.length === 0) return;

      const showPicker =
        candidates.length >= 2 &&
        (coarsePointer || isAmbiguousTap(candidates));

      if (showPicker) {
        setPickerCandidates(candidates.map((c) => c.dot));
        return;
      }

      activateDot(candidates[0].dot);
    },
    [
      mapClickToPercent,
      visibleDotKeys,
      allDots,
      renderedDots,
      imageAspect,
      coarsePointer,
      activateDot,
    ],
  );

  handleTapRef.current = resolveTapAt;

  const handleDotActivate = useCallback(
    (dot: PlacedDot, event: MouseEvent) => {
      event.stopPropagation();
      activateDot(dot);
    },
    [activateDot],
  );

  const handleOverlayClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (shouldSuppressClick()) return;

      if (isEditMode && onSvgClick) {
        const coords = mapClickToPercent(event.clientX, event.clientY);
        if (!coords) return;
        onSvgClick(roundCoord(coords.x), roundCoord(coords.y));
        return;
      }

      if (!canPickOnImage) return;

      resolveTapAt(event.clientX, event.clientY);
    },
    [
      shouldSuppressClick,
      isEditMode,
      onSvgClick,
      canPickOnImage,
      mapClickToPercent,
      resolveTapAt,
    ],
  );

  const handlePickerSelect = useCallback(
    (dot: PlacedDot) => {
      setPickerCandidates(null);
      activateDot(dot);
    },
    [activateDot],
  );

  const viewBoxW = svgViewBoxWidth(imageAspect);
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
  const overlayClickable = isEditMode || canPickOnImage;

  return (
    <div
      className={`diagram-shell relative mx-auto w-full max-w-3xl rounded-xl border border-stone-700 bg-stone-900 shadow-lg ${
        viewportConstrained ? "overflow-hidden" : "overflow-visible"
      }`}
    >
      <DiagramZoomControls
        scale={transform.scale}
        isZoomed={isZoomed}
        coarsePointer={coarsePointer}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetTransform}
      />

      <div
        ref={viewportRef}
        className={`diagram-viewport relative touch-none ${
          viewportConstrained
            ? "max-h-[min(82vh,920px)] overflow-hidden"
            : "overflow-visible"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div
          ref={overlayRef}
          className={`relative w-full will-change-transform ${
            isEditMode
              ? "cursor-crosshair"
              : canPickOnImage
                ? "cursor-pointer"
                : ""
          } ${animateFocus ? "transition-transform duration-300 ease-out" : ""}`}
          style={{
            transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.scale})`,
            transformOrigin: "0 0",
          }}
          onClick={overlayClickable ? handleOverlayClick : undefined}
          onMouseLeave={() => {
            setHoveredDotKey(null);
            if (isStudyMode) setPinnedDotKey(null);
          }}
          role={isEditMode ? "application" : undefined}
        >
          <img
            ref={imgRef}
            src={resolvedImageSrc}
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
                className={`absolute inset-0 ${dotButtonsInteractive ? "" : "pointer-events-none"}`}
                aria-hidden={!dotButtonsInteractive}
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
                        width: touchTargetPx,
                        height: touchTargetPx,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <button
                        type="button"
                        className="relative flex h-full w-full items-center justify-center rounded-full border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80 active:bg-amber-500/10"
                        aria-label={`${orderLabel}. ${dot.pointName}`}
                        onClick={(e) => handleDotActivate(dot, e)}
                        onPointerEnter={() => {
                          if (tooltipsEnabled) setHoveredDotKey(key);
                        }}
                        onPointerLeave={() => {
                          if (tooltipsEnabled) {
                            setHoveredDotKey((prev) => (prev === key ? null : key));
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
      </div>

      {!hasAnyMarkers && !isEditMode && (
        <p className="border-t border-stone-700 bg-stone-900/90 px-4 py-3 text-center text-sm text-stone-400">
          No dots placed yet. Use <strong className="text-amber-400">Edit</strong>{" "}
          mode to click the diagram and build{" "}
          <code className="text-amber-400">points.json</code>.
        </p>
      )}

      {pickerCandidates && (
        <DotPickerSheet
          candidates={pickerCandidates}
          onSelect={handlePickerSelect}
          onDismiss={() => setPickerCandidates(null)}
        />
      )}
    </div>
  );
}
