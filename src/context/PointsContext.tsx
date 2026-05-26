import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import initialData from "../data/points.json";
import { normalizePointsData } from "../lib/normalize";
import { roundCoord } from "../lib/points";
import type { VitalPointsData } from "../types";

const DRAFT_STORAGE_KEY = "kyusho-points-draft";

const fileDefaults = normalizePointsData(initialData);

function loadInitialPoints(): VitalPointsData {
  try {
    const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (draft) {
      return normalizePointsData(JSON.parse(draft));
    }
  } catch {
    /* use file defaults */
  }
  return fileDefaults;
}

interface PointsContextValue {
  data: VitalPointsData;
  addPosition: (side: "front" | "back", pointId: string, x: number, y: number) => void;
  removePosition: (
    side: "front" | "back",
    pointId: string,
    positionIndex: number,
  ) => void;
  clearPositions: (side: "front" | "back", pointId: string) => void;
  resetToFileDefaults: () => void;
  clearDraft: () => void;
  placedCount: (side: "front" | "back") => number;
}

const PointsContext = createContext<PointsContextValue | null>(null);

export function PointsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<VitalPointsData>(loadInitialPoints);

  const persistDraft = useCallback((next: VitalPointsData) => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const updatePoint = useCallback(
    (
      side: "front" | "back",
      pointId: string,
      updater: (positions: VitalPointsData["front"][0]["positions"]) => VitalPointsData["front"][0]["positions"],
    ) => {
      setData((prev) => {
        const next: VitalPointsData = {
          ...prev,
          [side]: prev[side].map((p) =>
            p.id === pointId ? { ...p, positions: updater(p.positions) } : p,
          ),
        };
        persistDraft(next);
        return next;
      });
    },
    [persistDraft],
  );

  const addPosition = useCallback(
    (side: "front" | "back", pointId: string, x: number, y: number) => {
      const coord = { x: roundCoord(x), y: roundCoord(y) };
      updatePoint(side, pointId, (positions) => [...positions, coord]);
    },
    [updatePoint],
  );

  const removePosition = useCallback(
    (side: "front" | "back", pointId: string, positionIndex: number) => {
      updatePoint(side, pointId, (positions) =>
        positions.filter((_, i) => i !== positionIndex),
      );
    },
    [updatePoint],
  );

  const clearPositions = useCallback(
    (side: "front" | "back", pointId: string) => {
      updatePoint(side, pointId, () => []);
    },
    [updatePoint],
  );

  const resetToFileDefaults = useCallback(() => {
    setData(fileDefaults);
    persistDraft(fileDefaults);
  }, [persistDraft]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setData(fileDefaults);
  }, []);

  const placedCount = useCallback(
    (side: "front" | "back") =>
      data[side].filter((p) => p.positions.length > 0).length,
    [data],
  );

  const value = useMemo(
    () => ({
      data,
      addPosition,
      removePosition,
      clearPositions,
      resetToFileDefaults,
      clearDraft,
      placedCount,
    }),
    [
      data,
      addPosition,
      removePosition,
      clearPositions,
      resetToFileDefaults,
      clearDraft,
      placedCount,
    ],
  );

  return (
    <PointsContext.Provider value={value}>{children}</PointsContext.Provider>
  );
}

export function usePoints() {
  const ctx = useContext(PointsContext);
  if (!ctx) {
    throw new Error("usePoints must be used within PointsProvider");
  }
  return ctx;
}
