import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  clampPan,
  DEFAULT_TRANSFORM,
  ensurePointVisible,
  type DiagramTransform,
  type EnsurePointVisibleOptions,
  zoomAtPoint,
  ZOOM_STEP,
} from "../lib/diagramZoom";

const PAN_THRESHOLD_PX = 8;
const TAP_THRESHOLD_PX = 14;
const DOUBLE_TAP_MS = 320;

interface UseDiagramZoomOptions {
  enabled?: boolean;
  resetKey?: string;
  onTap?: (clientX: number, clientY: number) => void;
}

export function useDiagramZoom({
  enabled = true,
  resetKey = "",
  onTap,
}: UseDiagramZoomOptions = {}) {
  const onTapRef = useRef(onTap);
  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<DiagramTransform>(DEFAULT_TRANSFORM);
  const pointersRef = useRef(
    new Map<number, { x: number; y: number; startX: number; startY: number }>(),
  );
  const pinchRef = useRef<{
    distance: number;
    scale: number;
    panX: number;
    panY: number;
    centerX: number;
    centerY: number;
  } | null>(null);
  const panStartRef = useRef<{ panX: number; panY: number; x: number; y: number } | null>(
    null,
  );
  const suppressClickRef = useRef(false);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const applyTransform = useCallback((next: DiagramTransform) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      setTransform(next);
      return;
    }
    const overlay = viewport.firstElementChild as HTMLElement | null;
    if (!overlay) {
      setTransform(next);
      return;
    }
    const { width: vw, height: vh } = viewport.getBoundingClientRect();
    const clamped = clampPan(
      next.panX,
      next.panY,
      next.scale,
      vw,
      vh,
      overlay.offsetWidth,
      overlay.offsetHeight,
    );
    setTransform({ scale: next.scale, ...clamped });
  }, []);

  const resetTransform = useCallback(() => {
    setTransform(DEFAULT_TRANSFORM);
  }, []);

  useEffect(() => {
    resetTransform();
  }, [resetKey, resetTransform]);

  const focalFromClient = useCallback((clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return { x: 0, y: 0 };
    const rect = viewport.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const zoomBy = useCallback(
    (delta: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      applyTransform(
        zoomAtPoint(transform, transform.scale + delta, rect.width / 2, rect.height / 2),
      );
    },
    [applyTransform, transform],
  );

  const zoomIn = useCallback(() => zoomBy(ZOOM_STEP), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(-ZOOM_STEP), [zoomBy]);

  const handleDoubleTap = useCallback(
    (clientX: number, clientY: number) => {
      const focal = focalFromClient(clientX, clientY);
      if (transform.scale > 1.05) {
        applyTransform(DEFAULT_TRANSFORM);
      } else {
        applyTransform(zoomAtPoint(transform, 2.5, focal.x, focal.y));
      }
    },
    [applyTransform, focalFromClient, transform],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const target = event.target as HTMLElement;
      if (target.closest("button.diagram-zoom-btn")) return;
      // Let dot hit-target buttons receive taps without starting a pan gesture.
      if (target.closest("button") && !target.closest("button.diagram-zoom-btn")) {
        return;
      }

      suppressClickRef.current = false;
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
      });

      if (pointersRef.current.size === 1) {
        panStartRef.current = {
          panX: transform.panX,
          panY: transform.panY,
          x: event.clientX,
          y: event.clientY,
        };
      }

      if (pointersRef.current.size === 2) {
        const pts = [...pointersRef.current.values()];
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const focal = focalFromClient((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
        pinchRef.current = {
          distance: Math.hypot(dx, dy),
          scale: transform.scale,
          panX: transform.panX,
          panY: transform.panY,
          centerX: focal.x,
          centerY: focal.y,
        };
        panStartRef.current = null;
      }
    },
    [enabled, focalFromClient, transform.panX, transform.panY, transform.scale],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const entry = pointersRef.current.get(event.pointerId);
      if (!entry) return;

      entry.x = event.clientX;
      entry.y = event.clientY;

      if (
        Math.hypot(entry.x - entry.startX, entry.y - entry.startY) > PAN_THRESHOLD_PX
      ) {
        suppressClickRef.current = true;
      }

      if (pointersRef.current.size === 2 && pinchRef.current) {
        const pts = [...pointersRef.current.values()];
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const distance = Math.max(24, Math.hypot(dx, dy));
        const ratio = distance / pinchRef.current.distance;
        applyTransform(
          zoomAtPoint(
            {
              scale: pinchRef.current.scale,
              panX: pinchRef.current.panX,
              panY: pinchRef.current.panY,
            },
            pinchRef.current.scale * ratio,
            pinchRef.current.centerX,
            pinchRef.current.centerY,
          ),
        );
        return;
      }

      if (
        pointersRef.current.size === 1 &&
        panStartRef.current &&
        transform.scale > 1
      ) {
        const dx = event.clientX - panStartRef.current.x;
        const dy = event.clientY - panStartRef.current.y;
        applyTransform({
          scale: transform.scale,
          panX: panStartRef.current.panX + dx,
          panY: panStartRef.current.panY + dy,
        });
      }
    },
    [applyTransform, enabled, transform.scale],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return;

      const entry = pointersRef.current.get(event.pointerId);
      pointersRef.current.delete(event.pointerId);

      if (pointersRef.current.size < 2) {
        pinchRef.current = null;
      }

      if (pointersRef.current.size === 0) {
        panStartRef.current = null;

        const travel = entry
          ? Math.hypot(entry.x - entry.startX, entry.y - entry.startY)
          : Infinity;
        const isTap = entry && !suppressClickRef.current && travel < TAP_THRESHOLD_PX;

        if (isTap) {
          const now = Date.now();
          const last = lastTapRef.current;
          if (
            last &&
            now - last.time < DOUBLE_TAP_MS &&
            Math.hypot(entry.x - last.x, entry.y - last.y) < 24
          ) {
            event.preventDefault();
            suppressClickRef.current = true;
            handleDoubleTap(entry.x, entry.y);
            lastTapRef.current = null;
            return;
          }
          lastTapRef.current = { time: now, x: entry.x, y: entry.y };
          onTapRef.current?.(entry.x, entry.y);
        }
      } else if (pointersRef.current.size === 1) {
        const remaining = [...pointersRef.current.values()][0];
        panStartRef.current = {
          panX: transform.panX,
          panY: transform.panY,
          x: remaining.x,
          y: remaining.y,
        };
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [enabled, handleDoubleTap, transform.panX, transform.panY],
  );

  const shouldSuppressClick = useCallback(() => suppressClickRef.current, []);

  const revealPoint = useCallback(
    (point: { x: number; y: number }, options?: EnsurePointVisibleOptions) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const overlay = viewport.firstElementChild as HTMLElement | null;
      if (!overlay) return;

      const { width: viewportW, height: viewportH } = viewport.getBoundingClientRect();
      applyTransform(
        ensurePointVisible(
          transform,
          point,
          viewportW,
          viewportH,
          overlay.offsetWidth,
          overlay.offsetHeight,
          options,
        ),
      );
    },
    [applyTransform, transform],
  );

  return {
    viewportRef,
    transform,
    resetTransform,
    zoomIn,
    zoomOut,
    revealPoint,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    shouldSuppressClick,
    isZoomed: transform.scale > 1.01,
  };
}
