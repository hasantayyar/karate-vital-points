import type { PlacedVitalPoint } from "../types";
import { pickWeightedPoint } from "./spacedRepetition";

export type QuizQuestionType = "locate" | "identify";

export const QUIZ_SESSION_SIZE = 10;
export const IDENTIFY_MIN_POOL = 2;
export const IDENTIFY_CHOICE_COUNT = 4;

export function getSessionQuestionCount(poolSize: number): number {
  if (poolSize === 0) return 0;
  return Math.min(QUIZ_SESSION_SIZE, poolSize);
}

export function pickQuestionType(
  poolSize: number,
  questionIndex = 0,
): QuizQuestionType {
  if (poolSize < IDENTIFY_MIN_POOL) return "locate";
  // Alternate so Identify (pulsing dot) appears regularly in each quiz
  return questionIndex % 2 === 0 ? "identify" : "locate";
}

export function buildQuestionQueue(
  pool: PlacedVitalPoint[],
  count: number,
): PlacedVitalPoint[] {
  const queue: PlacedVitalPoint[] = [];
  let lastId: string | undefined;

  for (let i = 0; i < count; i++) {
    const next = pickWeightedPoint(pool, lastId);
    if (!next) break;
    queue.push(next);
    lastId = next.id;
  }

  return queue;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildIdentifyChoices(
  correct: PlacedVitalPoint,
  pool: PlacedVitalPoint[],
): PlacedVitalPoint[] {
  const distractors = shuffle(
    pool.filter((p) => p.id !== correct.id),
  ).slice(0, IDENTIFY_CHOICE_COUNT - 1);

  return shuffle([correct, ...distractors]);
}
