export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 0.5;

export interface DiagramTransform {
  scale: number;
  panX: number;
  panY: number;
}

export const DEFAULT_TRANSFORM: DiagramTransform = {
  scale: 1,
  panX: 0,
  panY: 0,
};

export function clampZoom(scale: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

/** Map a screen point to overlay % coords (accounts for pan + scale). */
export function clientToPercentInViewport(
  clientX: number,
  clientY: number,
  viewportRect: DOMRect,
  overlayWidth: number,
  overlayHeight: number,
  transform: DiagramTransform,
): { x: number; y: number } | null {
  if (overlayWidth <= 0 || overlayHeight <= 0) return null;

  const localX =
    (clientX - viewportRect.left - transform.panX) / transform.scale;
  const localY =
    (clientY - viewportRect.top - transform.panY) / transform.scale;

  const x = (localX / overlayWidth) * 100;
  const y = (localY / overlayHeight) * 100;

  if (x < -2 || y < -2 || x > 102 || y > 102) return null;

  return { x, y };
}

/** Keep pan inside reasonable bounds so the diagram stays reachable. */
export function clampPan(
  panX: number,
  panY: number,
  scale: number,
  viewportW: number,
  viewportH: number,
  overlayW: number,
  overlayH: number,
): { panX: number; panY: number } {
  const scaledW = overlayW * scale;
  const scaledH = overlayH * scale;
  const margin = 48;

  const minX = Math.min(margin, viewportW - scaledW - margin);
  const maxX = margin;
  const minY = Math.min(margin, viewportH - scaledH - margin);
  const maxY = margin;

  return {
    panX: Math.min(maxX, Math.max(minX, panX)),
    panY: Math.min(maxY, Math.max(minY, panY)),
  };
}

/** Zoom toward a viewport-local focal point (pinch center or double-tap). */
export function zoomAtPoint(
  transform: DiagramTransform,
  nextScale: number,
  focalX: number,
  focalY: number,
): DiagramTransform {
  const scale = clampZoom(nextScale);
  if (scale === transform.scale) return transform;

  const ratio = scale / transform.scale;
  return {
    scale,
    panX: focalX - (focalX - transform.panX) * ratio,
    panY: focalY - (focalY - transform.panY) * ratio,
  };
}

/** Pan and zoom so a diagram point (% coords) sits near the viewport center. */
export function focusPoint(
  point: { x: number; y: number },
  viewportW: number,
  viewportH: number,
  overlayW: number,
  overlayH: number,
  targetScale = 2.5,
): DiagramTransform {
  const scale = clampZoom(targetScale);
  const px = (point.x / 100) * overlayW;
  const py = (point.y / 100) * overlayH;
  const panX = viewportW / 2 - px * scale;
  const panY = viewportH / 2 - py * scale;

  return {
    scale,
    ...clampPan(panX, panY, scale, viewportW, viewportH, overlayW, overlayH),
  };
}

export interface EnsurePointVisibleOptions {
  /** Zoom in when at 1x (typically mobile list selection). */
  allowZoom?: boolean;
  maxAutoZoom?: number;
  /** Fraction of viewport used as comfort margin (0–0.5). */
  edgeMargin?: number;
}

/**
 * Pan (and optionally zoom) only when the marker is outside a comfort zone.
 * Preserves the user's current zoom when the point is already easy to see.
 */
export function ensurePointVisible(
  current: DiagramTransform,
  point: { x: number; y: number },
  viewportW: number,
  viewportH: number,
  overlayW: number,
  overlayH: number,
  options: EnsurePointVisibleOptions = {},
): DiagramTransform {
  const {
    allowZoom = false,
    maxAutoZoom = 1.75,
    edgeMargin = 0.18,
  } = options;

  if (viewportW <= 0 || viewportH <= 0 || overlayW <= 0 || overlayH <= 0) {
    return current;
  }

  const px = (point.x / 100) * overlayW;
  const py = (point.y / 100) * overlayH;
  const screenX = current.panX + px * current.scale;
  const screenY = current.panY + py * current.scale;

  const marginX = viewportW * edgeMargin;
  const marginY = viewportH * edgeMargin;
  const inComfortZone =
    screenX >= marginX &&
    screenX <= viewportW - marginX &&
    screenY >= marginY &&
    screenY <= viewportH - marginY;

  if (inComfortZone) {
    return current;
  }

  let targetScale = current.scale;
  if (allowZoom && current.scale < maxAutoZoom - 0.01) {
    targetScale = clampZoom(maxAutoZoom);
  }

  const panX = viewportW / 2 - px * targetScale;
  const panY = viewportH / 2 - py * targetScale;

  return {
    scale: targetScale,
    ...clampPan(
      panX,
      panY,
      targetScale,
      viewportW,
      viewportH,
      overlayW,
      overlayH,
    ),
  };
}
