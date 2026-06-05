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
