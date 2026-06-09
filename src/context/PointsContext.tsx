import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearPointsDraft,
  loadPointsData,
  persistPointsDraft,
} from "../lib/pointsLoader";
import { roundCoord } from "../lib/points";
import type { VitalPointsData } from "../types";

interface PointsContextValue {
  data: VitalPointsData;
  isLoading: boolean;
  loadError: string | null;
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
  const [data, setData] = useState<VitalPointsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const revisionRef = useRef("");
  const defaultsRef = useRef<VitalPointsData | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const loaded = await loadPointsData(__POINTS_REVISION__);
        if (cancelled) return;

        revisionRef.current = loaded.revision;
        defaultsRef.current = loaded.fileDefaults;
        setData(loaded.data);
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : "Failed to load vital points",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistDraft = useCallback((next: VitalPointsData) => {
    if (!revisionRef.current) return;
    persistPointsDraft(revisionRef.current, next);
  }, []);

  const updatePoint = useCallback(
    (
      side: "front" | "back",
      pointId: string,
      updater: (positions: VitalPointsData["front"][0]["positions"]) => VitalPointsData["front"][0]["positions"],
    ) => {
      setData((prev) => {
        if (!prev) return prev;

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
    if (!defaultsRef.current) return;
    setData(defaultsRef.current);
    persistDraft(defaultsRef.current);
  }, [persistDraft]);

  const clearDraft = useCallback(() => {
    if (!revisionRef.current || !defaultsRef.current) return;
    clearPointsDraft(revisionRef.current);
    setData(defaultsRef.current);
  }, []);

  const placedCount = useCallback(
    (side: "front" | "back") =>
      data?.[side].filter((p) => p.positions.length > 0).length ?? 0,
    [data],
  );

  const value = useMemo(
    () =>
      data
        ? {
            data,
            isLoading,
            loadError,
            addPosition,
            removePosition,
            clearPositions,
            resetToFileDefaults,
            clearDraft,
            placedCount,
          }
        : null,
    [
      data,
      isLoading,
      loadError,
      addPosition,
      removePosition,
      clearPositions,
      resetToFileDefaults,
      clearDraft,
      placedCount,
    ],
  );

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 px-6 text-center text-stone-200">
        <p>{loadError}</p>
      </div>
    );
  }

  if (isLoading || !value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-400">
        Loading vital points…
      </div>
    );
  }

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
