import { normalizePointsData } from "./normalize";
import type { VitalPointsData } from "../types";

const DRAFT_STORAGE_PREFIX = "kyusho-points-draft:";

/** Fast stable hash for cache-busting keys and draft versioning. */
export function hashPointsSource(source: string): string {
  let hash = 5381;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 33) ^ source.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function draftStorageKey(revision: string): string {
  return `${DRAFT_STORAGE_PREFIX}${revision}`;
}

export function pruneStalePointDrafts(activeRevision: string): void {
  const activeKey = draftStorageKey(activeRevision);
  const legacyKey = "kyusho-points-draft";

  if (localStorage.getItem(legacyKey)) {
    localStorage.removeItem(legacyKey);
  }

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(DRAFT_STORAGE_PREFIX) && key !== activeKey) {
      localStorage.removeItem(key);
    }
  }
}

export async function loadPointsData(
  buildRevision: string,
): Promise<{ data: VitalPointsData; fileDefaults: VitalPointsData; revision: string }> {
  const url = `${import.meta.env.BASE_URL}points.json?v=${encodeURIComponent(buildRevision)}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load points.json (${response.status})`);
  }

  const source = await response.text();
  const revision = hashPointsSource(source);
  const fileDefaults = normalizePointsData(JSON.parse(source));

  pruneStalePointDrafts(revision);

  try {
    const draft = localStorage.getItem(draftStorageKey(revision));
    if (draft) {
      return {
        data: normalizePointsData(JSON.parse(draft)),
        fileDefaults,
        revision,
      };
    }
  } catch {
    /* use file defaults */
  }

  return { data: fileDefaults, fileDefaults, revision };
}

export function persistPointsDraft(
  revision: string,
  data: VitalPointsData,
): void {
  localStorage.setItem(draftStorageKey(revision), JSON.stringify(data));
}

export function clearPointsDraft(revision: string): void {
  localStorage.removeItem(draftStorageKey(revision));
}
