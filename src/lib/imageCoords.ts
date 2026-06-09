import type { BodySide } from "../types";

export function svgViewBoxWidth(aspectRatio: number): number {
  return aspectRatio * 100;
}

export type VitalPointsImageVariant = "default" | "no-clue";

/** Diagram image for a body side (`public/vital-points-front.jpeg`, etc.). */
export function vitalPointsImageSrc(
  side: BodySide,
  variant: VitalPointsImageVariant = "default",
): string {
  const name =
    variant === "no-clue"
      ? `vital-points-${side}-no-clue.jpeg`
      : `vital-points-${side}.jpeg`;
  return `${import.meta.env.BASE_URL}${name}`;
}

/** Map a screen click to 0–100 % coords inside an element's bounding box. */
export function clientToPercent(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { x: number; y: number } | null {
  if (rect.width <= 0 || rect.height <= 0) return null;

  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;

  if (x < 0 || y < 0 || x > 100 || y > 100) return null;

  return { x, y };
}
