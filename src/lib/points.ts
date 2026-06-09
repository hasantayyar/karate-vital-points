import type {
  BodySide,
  PlacedDot,
  PlacedVitalPoint,
  VitalPoint,
  VitalPointsData,
} from "../types";

export function getPointsForSide(
  data: VitalPointsData,
  side: BodySide,
): VitalPoint[] {
  return data[side];
}

export function getAllPoints(data: VitalPointsData): PlacedVitalPoint[] {
  return [
    ...data.front.map((p) => ({ ...p, side: "front" as const })),
    ...data.back.map((p) => ({ ...p, side: "back" as const })),
  ];
}

export function getPlacedPoints(
  data: VitalPointsData,
  side: BodySide,
): PlacedVitalPoint[] {
  return getPointsForSide(data, side)
    .filter(hasCoordinates)
    .map((p) => ({ ...p, side }));
}

export function findPointById(
  data: VitalPointsData,
  id: string,
): PlacedVitalPoint | undefined {
  return getAllPoints(data).find((p) => p.id === id);
}

export function hasCoordinates(point: VitalPoint): boolean {
  return point.positions.length > 0;
}

export function positionCount(point: VitalPoint): number {
  return point.positions.length;
}

export function dotKey(pointId: string, positionIndex: number): string {
  return `${pointId}:${positionIndex}`;
}

export function flattenDots(points: PlacedVitalPoint[]): PlacedDot[] {
  return points.flatMap((point) =>
    point.positions.map((pos, positionIndex) => ({
      pointId: point.id,
      pointName: point.name,
      order: point.order,
      side: point.side,
      positionIndex,
      x: pos.x,
      y: pos.y,
    })),
  );
}

export function pickRandomPositionIndex(point: VitalPoint): number {
  if (point.positions.length === 0) return 0;
  return Math.floor(Math.random() * point.positions.length);
}

export function roundCoord(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface NearDotCandidate {
  dot: PlacedDot;
  distance: number;
}

/** Distance from tap (% coords) to a marker, aspect-corrected. */
export function dotDistanceFromTap(
  x: number,
  y: number,
  dot: PlacedDot,
  aspectRatio = 1,
): number {
  return Math.hypot((dot.x - x) * aspectRatio, dot.y - y);
}

/** Shrink pick radius when zoomed in so taps stay precise. */
export function scaleAwareTapRadius(baseDistance: number, zoomScale: number): number {
  return baseDistance / Math.max(1, zoomScale);
}

/** Markers within maxDistance of a tap, nearest first. */
export function findNearDots(
  x: number,
  y: number,
  dots: PlacedDot[],
  maxDistance = 8,
  aspectRatio = 1,
  limit = 4,
): NearDotCandidate[] {
  const candidates: NearDotCandidate[] = [];

  for (const dot of dots) {
    const distance = dotDistanceFromTap(x, y, dot, aspectRatio);
    if (distance < maxDistance) {
      candidates.push({ dot, distance });
    }
  }

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates.slice(0, limit);
}

/** True when a second marker is almost as close as the nearest. */
export function isAmbiguousTap(
  candidates: NearDotCandidate[],
  ratio = 0.35,
): boolean {
  if (candidates.length < 2) return false;
  const best = candidates[0].distance;
  if (best <= 0) return candidates.length > 1;
  return candidates[1].distance <= best * (1 + ratio);
}

/** Nearest marker within maxDistance (% of image). Used when tapping near a dot. */
export function findNearestDot(
  x: number,
  y: number,
  dots: PlacedDot[],
  maxDistance = 8,
  /** Image width / height — keeps hit detection circular on the diagram. */
  aspectRatio = 1,
): PlacedDot | null {
  return findNearDots(x, y, dots, maxDistance, aspectRatio, 1)[0]?.dot ?? null;
}

/** Map stored % coords to SVG viewBox (width = aspectRatio × 100, height = 100). */
export function percentToSvgCoords(
  x: number,
  y: number,
  aspectRatio: number,
): { cx: number; cy: number } {
  return { cx: (x / 100) * aspectRatio * 100, cy: y };
}
