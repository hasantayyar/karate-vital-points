import type { VitalPointsData } from "../types";

export function serializePointsJson(data: VitalPointsData): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

export async function copyPointsJson(data: VitalPointsData): Promise<void> {
  await navigator.clipboard.writeText(serializePointsJson(data));
}

export function downloadPointsJson(data: VitalPointsData): void {
  const blob = new Blob([serializePointsJson(data)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "points.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
