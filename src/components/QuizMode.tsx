import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, Trophy, XCircle } from "lucide-react";
import ImageViewer from "./ImageViewer";
import {
  buildIdentifyChoices,
  buildQuestionQueue,
  getSessionQuestionCount,
  IDENTIFY_MIN_POOL,
  pickQuestionType,
  type QuizQuestionType,
} from "../lib/quiz";
import { dotKey, pickRandomPositionIndex } from "../lib/points";
import { recordCorrect, recordMiss } from "../lib/spacedRepetition";
import type { BodySide, DotFeedback, PlacedDot, PlacedVitalPoint } from "../types";

interface QuizModeProps {
  side: BodySide;
  pool: PlacedVitalPoint[];
  points: PlacedVitalPoint[];
}

interface ActiveQuestion {
  target: PlacedVitalPoint;
  type: QuizQuestionType;
  choices: PlacedVitalPoint[];
  highlightPositionIndex: number;
  /** Snapshot of marker coords when the question was created. */
  pulsePosition: { x: number; y: number } | null;
}

function highlightIndexFor(target: PlacedVitalPoint): number {
  if (target.positions.length === 0) return 0;
  return Math.min(pickRandomPositionIndex(target), target.positions.length - 1);
}

function createQuestion(
  target: PlacedVitalPoint,
  pool: PlacedVitalPoint[],
  questionIndex: number,
): ActiveQuestion {
  const type = pickQuestionType(pool.length, questionIndex);
  const live = pool.find((p) => p.id === target.id) ?? target;
  const highlightPositionIndex = highlightIndexFor(live);
  const pos = live.positions[highlightPositionIndex];
  const pulsePosition =
    pos && typeof pos.x === "number" && typeof pos.y === "number"
      ? { x: pos.x, y: pos.y }
      : null;

  return {
    target,
    type,
    choices:
      type === "identify" ? buildIdentifyChoices(target, pool) : [],
    highlightPositionIndex,
    pulsePosition,
  };
}

export default function QuizMode({ side, pool, points }: QuizModeProps) {
  const sessionSize = getSessionQuestionCount(pool.length);

  const [queue, setQueue] = useState<PlacedVitalPoint[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState<ActiveQuestion | null>(null);
  const [answered, setAnswered] = useState(false);
  const [lastResult, setLastResult] = useState<"correct" | "incorrect" | null>(
    null,
  );
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, DotFeedback>>({});
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [complete, setComplete] = useState(false);

  const startSession = useCallback(() => {
    const nextQueue = buildQuestionQueue(pool, sessionSize);
    setQueue(nextQueue);
    setQuestionIndex(0);
    setAnswered(false);
    setLastResult(null);
    setSelectedChoiceId(null);
    setFeedback({});
    setScore({ correct: 0, total: 0 });
    setComplete(false);

    if (nextQueue.length > 0) {
      setQuestion(createQuestion(nextQueue[0], pool, 0));
    } else {
      setQuestion(null);
    }
  }, [pool, sessionSize]);

  useEffect(() => {
    startSession();
  }, [startSession, side]);

  const progress = useMemo(() => {
    if (queue.length === 0) return 0;
    return complete ? queue.length : questionIndex;
  }, [queue.length, complete, questionIndex]);

  const advance = () => {
    const nextIndex = questionIndex + 1;
    if (nextIndex >= queue.length) {
      setComplete(true);
      setQuestion(null);
      return;
    }

    setQuestionIndex(nextIndex);
    setQuestion(createQuestion(queue[nextIndex], pool, nextIndex));
    setAnswered(false);
    setLastResult(null);
    setSelectedChoiceId(null);
    setFeedback({});
  };

  const recordAnswer = (correct: boolean, targetId: string) => {
    setLastResult(correct ? "correct" : "incorrect");
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      total: s.total + 1,
    }));
    if (correct) {
      recordCorrect(targetId);
    } else {
      recordMiss(targetId);
    }
  };

  const handleLocateClick = (dot: PlacedDot) => {
    if (!question || question.type !== "locate" || answered) return;

    const correct = dot.pointId === question.target.id;
    setAnswered(true);
    recordAnswer(correct, question.target.id);

    if (correct) {
      setFeedback({ [dot.pointId]: "correct" });
    } else {
      setFeedback({
        [dot.pointId]: "incorrect",
        [question.target.id]: "correct",
      });
    }
  };

  const handleIdentifyChoice = (choice: PlacedVitalPoint) => {
    if (!question || question.type !== "identify" || answered) return;

    const correct = choice.id === question.target.id;
    setAnswered(true);
    setSelectedChoiceId(choice.id);
    recordAnswer(correct, question.target.id);
    setFeedback({ [question.target.id]: "correct" });
  };

  const percent =
    score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  if (pool.length === 0) {
    return (
      <p className="rounded-lg border border-stone-800 bg-stone-900/60 px-4 py-3 text-center text-sm text-amber-400/90">
        Place coordinates in Edit mode first, then start a quiz.
      </p>
    );
  }

  if (complete) {
    return (
      <div className="space-y-4 rounded-lg border border-stone-800 bg-stone-900/60 px-4 py-6 text-center">
        <Trophy className="mx-auto h-10 w-10 text-amber-400" aria-hidden />
        <h2 className="text-xl font-semibold text-stone-50">Quiz complete</h2>
        <p className="text-3xl font-bold text-amber-400">
          {score.correct} / {score.total}
        </p>
        <p className="text-sm text-stone-400">{percent}% correct on this round</p>
        <button
          type="button"
          onClick={startSession}
          className="inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
        >
          <RotateCcw className="h-4 w-4" />
          New quiz
        </button>
      </div>
    );
  }

  if (!question) return null;

  const isLocate = question.type === "locate";
  const quizPulsePosition = !answered ? question.pulsePosition : null;
  const quizPulseDotKey =
    !answered && question.pulsePosition
      ? dotKey(question.target.id, question.highlightPositionIndex)
      : null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-800 bg-stone-900/60 px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-xs text-stone-500">
          <span className="uppercase tracking-wider">
            {isLocate ? "Locate" : "Identify"} · {side}
          </span>
          <span>
            Question {questionIndex + 1} of {queue.length}
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-stone-800">
          <div
            className="h-full bg-red-700 transition-all duration-300"
            style={{ width: `${(progress / queue.length) * 100}%` }}
          />
        </div>

        {isLocate ? (
          <div className="mt-3 text-center">
            <p className="text-xs uppercase tracking-wider text-stone-500">
              Locate · tap a dot on the diagram
            </p>
            <p className="text-2xl font-semibold text-amber-400">
              {question.target.name}
            </p>
            <p className="mt-1 text-xs text-amber-400/90">
              Tap the large pulsing yellow dot on the diagram.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-1 text-center">
            <p className="text-xs uppercase tracking-wider text-amber-400">
              Identify · find the huge pulsing yellow dot
            </p>
            <p className="text-sm text-stone-300">
              Then pick the correct name in the buttons below.
            </p>
            {!quizPulsePosition && (
              <p className="text-xs text-red-400">
                Marker missing — re-place this point in Edit mode.
              </p>
            )}
          </div>
        )}

        {pool.length < IDENTIFY_MIN_POOL && (
          <p className="mt-2 text-center text-xs text-stone-500">
            Place {IDENTIFY_MIN_POOL}+ points in Edit to get Identify questions
            with the pulsing dot.
          </p>
        )}

        <p className="mt-2 text-center text-xs text-stone-500">
          Score: {score.correct} / {score.total}
          {answered && lastResult && (
            <span className="ml-2 inline-flex items-center gap-1">
              {lastResult === "correct" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Correct
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                  Incorrect
                </>
              )}
            </span>
          )}
        </p>
      </div>

      <ImageViewer
        side={side}
        points={points}
        mode="quiz"
        highlightedPointId={answered ? question.target.id : null}
        visibleDotKeys={
          isLocate ? null : answered ? null : []
        }
        quizPulsePosition={quizPulsePosition}
        quizPulseDotKey={quizPulseDotKey}
        feedbackByPointId={feedback}
        onDotClick={isLocate ? handleLocateClick : undefined}
        interactive={isLocate && !answered}
        tapNearestDot={isLocate && !answered}
      />

      {!isLocate && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {question.choices.map((choice) => {
            const isCorrect = choice.id === question.target.id;
            const isSelected = selectedChoiceId === choice.id;

            let buttonClass =
              "rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ";

            if (!answered) {
              buttonClass +=
                "border-stone-700 bg-stone-900 text-stone-200 hover:border-amber-600 hover:bg-amber-950/40";
            } else if (isCorrect) {
              buttonClass +=
                "border-green-600 bg-green-950/50 text-green-200";
            } else if (isSelected) {
              buttonClass += "border-red-600 bg-red-950/50 text-red-200";
            } else {
              buttonClass +=
                "border-stone-800 bg-stone-950/50 text-stone-500";
            }

            return (
              <button
                key={choice.id}
                type="button"
                disabled={answered}
                onClick={() => handleIdentifyChoice(choice)}
                className={buttonClass}
              >
                {choice.name}
              </button>
            );
          })}
        </div>
      )}

      {answered && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={advance}
            className="inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            <RotateCcw className="h-4 w-4" />
            {questionIndex + 1 >= queue.length ? "See results" : "Next question"}
          </button>
        </div>
      )}
    </div>
  );
}
