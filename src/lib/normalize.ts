import type { PointCoordinate, VitalPoint, VitalPointsData } from "../types";

function isCoordinate(value: unknown): value is PointCoordinate {
  const c = value as PointCoordinate;
  return typeof c?.x === "number" && typeof c?.y === "number";
}

/** Supports legacy `{ x, y }` and new `{ positions: [...] }` shapes. */
export function normalizePoint(raw: unknown): VitalPoint {
  const p = raw as Record<string, unknown>;
  const id = String(p.id ?? "");
  const order = Number(p.order ?? 0);
  const name = String(p.name ?? "");

  if (Array.isArray(p.positions)) {
    const positions = p.positions.filter(isCoordinate);
    return { id, order, name, positions };
  }

  if (typeof p.x === "number" && typeof p.y === "number") {
    return { id, order, name, positions: [{ x: p.x, y: p.y }] };
  }

  return { id, order, name, positions: [] };
}

export function normalizePointsData(raw: unknown): VitalPointsData {
  const data = raw as { front?: unknown[]; back?: unknown[] };
  return {
    front: (data.front ?? []).map(normalizePoint),
    back: (data.back ?? []).map(normalizePoint),
  };
}
