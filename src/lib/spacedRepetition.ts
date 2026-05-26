const STORAGE_KEY = "kyusho-missed-points";

export interface MissedPointRecord {
  id: string;
  missCount: number;
  lastMissedAt: number;
}

function readStore(): Record<string, MissedPointRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, MissedPointRecord>;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, MissedPointRecord>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function recordMiss(pointId: string): void {
  const store = readStore();
  const existing = store[pointId];
  store[pointId] = {
    id: pointId,
    missCount: (existing?.missCount ?? 0) + 1,
    lastMissedAt: Date.now(),
  };
  writeStore(store);
}

export function recordCorrect(pointId: string): void {
  const store = readStore();
  if (!store[pointId]) return;
  const nextCount = Math.max(0, store[pointId].missCount - 1);
  if (nextCount === 0) {
    delete store[pointId];
  } else {
    store[pointId] = { ...store[pointId], missCount: nextCount };
  }
  writeStore(store);
}

export function getMissedPointIds(): string[] {
  return Object.keys(readStore());
}

export function getMissWeight(pointId: string): number {
  const record = readStore()[pointId];
  if (!record) return 1;
  return 1 + record.missCount * 3;
}

/** Weighted random pick; higher weight for frequently missed points. */
export function pickWeightedPoint<T extends { id: string }>(
  pool: T[],
  excludeId?: string,
): T | null {
  const candidates = excludeId ? pool.filter((p) => p.id !== excludeId) : pool;
  if (candidates.length === 0) return null;

  const weights = candidates.map((p) => getMissWeight(p.id));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;

  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }

  return candidates[candidates.length - 1];
}

export function clearSpacedRepetition(): void {
  localStorage.removeItem(STORAGE_KEY);
}
