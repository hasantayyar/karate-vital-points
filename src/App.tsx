import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import CoordinateEditor from "./components/CoordinateEditor";
import ImageViewer from "./components/ImageViewer";
import Navbar from "./components/Navbar";
import QuizMode from "./components/QuizMode";
import { usePoints } from "./context/PointsContext";
import { useCoarsePointer } from "./hooks/useCoarsePointer";
import { getPlacedPoints, getPointsForSide, hasCoordinates, positionCount } from "./lib/points";
import type { PlacedDot } from "./types";
import {
  pickWeightedPoint,
  recordCorrect,
  recordMiss,
} from "./lib/spacedRepetition";
import type { BodySide, DotFeedback, GameMode, PlacedVitalPoint } from "./types";

function SideToggle({
  side,
  onChange,
}: {
  side: BodySide;
  onChange: (side: BodySide) => void;
}) {
  return (
    <div className="flex justify-center gap-2">
      {(["front", "back"] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
            side === s
              ? "bg-stone-100 text-stone-900"
              : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200"
          }`}
        >
          {s} ({s === "front" ? 24 : 10} points)
        </button>
      ))}
    </div>
  );
}

function StudyPointList({
  sidePoints,
  studyHighlightId,
  onSelect,
}: {
  sidePoints: PlacedVitalPoint[];
  studyHighlightId: string | null;
  onSelect: (pointId: string) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
      {sidePoints.map((p) => {
        const placed = hasCoordinates(p);
        const isHighlighted = studyHighlightId === p.id;

        return (
          <li key={p.id}>
            <button
              type="button"
              disabled={!placed}
              onClick={() => onSelect(p.id)}
              className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors ${
                isHighlighted
                  ? "border-amber-500/70 bg-amber-950/50 text-amber-100 ring-1 ring-amber-500/40"
                  : placed
                    ? "border-stone-700 text-stone-300 hover:border-stone-600 hover:bg-stone-800/60"
                    : "cursor-not-allowed border-stone-800 text-stone-600"
              }`}
            >
              <span className="text-stone-500">{p.order}.</span> {p.name}
              {positionCount(p) > 1 && (
                <span className="text-stone-500"> ({positionCount(p)})</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function App() {
  const { data } = usePoints();
  const coarsePointer = useCoarsePointer();
  const [mode, setMode] = useState<GameMode>("study");
  const [side, setSide] = useState<BodySide>("front");

  const [flashTarget, setFlashTarget] = useState<PlacedVitalPoint | null>(null);
  const [flashFeedback, setFlashFeedback] = useState<Record<string, DotFeedback>>(
    {},
  );
  const [flashAnswered, setFlashAnswered] = useState(false);
  const [lastFlashCorrect, setLastFlashCorrect] = useState<boolean | null>(null);
  const [flashScore, setFlashScore] = useState({ correct: 0, total: 0 });
  const [studyHighlightId, setStudyHighlightId] = useState<string | null>(null);
  const [studyFocusRequest, setStudyFocusRequest] = useState(0);

  const sidePoints = useMemo(
    () => getPointsForSide(data, side).map((p) => ({ ...p, side })),
    [data, side],
  );

  const placedOnSide = useMemo(
    () => getPlacedPoints(data, side),
    [data, side],
  );

  const startNextFlashcard = useCallback(() => {
    const pool = placedOnSide;
    if (pool.length === 0) {
      setFlashTarget(null);
      return;
    }
    const next = pickWeightedPoint(pool);
    setFlashTarget(next);
    setFlashFeedback({});
    setFlashAnswered(false);
    setLastFlashCorrect(null);
  }, [placedOnSide]);

  useEffect(() => {
    setStudyHighlightId(null);
    setStudyFocusRequest(0);
  }, [side, mode]);

  const handleModeChange = (next: GameMode) => {
    setMode(next);
    setStudyHighlightId(null);
    setStudyFocusRequest(0);
    setFlashFeedback({});
    setFlashAnswered(false);
    setLastFlashCorrect(null);
    if (next === "flashcards") {
      startNextFlashcard();
    } else {
      setFlashTarget(null);
    }
  };

  const handleSideChange = (next: BodySide) => {
    setSide(next);
    setFlashFeedback({});
    setFlashAnswered(false);
    setLastFlashCorrect(null);
    if (mode === "flashcards") {
      const pool = getPlacedPoints(data, next);
      if (pool.length > 0) {
        setFlashTarget(pickWeightedPoint(pool));
      } else {
        setFlashTarget(null);
      }
    }
  };

  const handleStudyPointSelect = useCallback((pointId: string) => {
    setStudyHighlightId((prev) => {
      const selecting = prev !== pointId;
      if (selecting) {
        queueMicrotask(() => setStudyFocusRequest((request) => request + 1));
      }
      return selecting ? pointId : null;
    });
  }, []);

  const handleFlashcardClick = (dot: PlacedDot) => {
    if (!flashTarget || flashAnswered) return;

    const correct = dot.pointId === flashTarget.id;
    setFlashAnswered(true);
    setLastFlashCorrect(correct);
    setFlashScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      total: s.total + 1,
    }));

    if (correct) {
      recordCorrect(flashTarget.id);
      setFlashFeedback({ [dot.pointId]: "correct" });
    } else {
      recordMiss(flashTarget.id);
      setFlashFeedback({
        [dot.pointId]: "incorrect",
        [flashTarget.id]: "correct",
      });
    }
  };

  return (
    <div className="min-h-screen pb-12">
      <Navbar mode={mode} onModeChange={handleModeChange} />

      <main className="mx-auto max-w-3xl space-y-6 px-4 pt-6">
        <SideToggle side={side} onChange={handleSideChange} />

        {mode === "edit" && <CoordinateEditor side={side} />}

        {mode === "study" && (
          <p className="text-center text-sm text-stone-400">
            {coarsePointer
              ? "Tap a name to jump to it on the diagram. Close points show a picker."
              : "Hover dots for names, or pick from the list to highlight."}
          </p>
        )}

        {mode === "study" && coarsePointer && (
          <StudyPointList
            sidePoints={sidePoints}
            studyHighlightId={studyHighlightId}
            onSelect={handleStudyPointSelect}
          />
        )}

        {mode === "flashcards" && (
          <div className="space-y-3 rounded-lg border border-stone-800 bg-stone-900/60 px-4 py-3 text-center">
            {placedOnSide.length === 0 ? (
              <p className="text-sm text-amber-400/90">
                Place coordinates in Edit mode first, then try flashcards.
              </p>
            ) : flashTarget ? (
              <>
                <p className="text-xs uppercase tracking-wider text-stone-500">
                  Find this point on the diagram
                </p>
                <p className="text-2xl font-semibold text-amber-400">
                  {flashTarget.name}
                </p>
                <p className="text-xs text-stone-500">
                  Score: {flashScore.correct} / {flashScore.total}
                  {flashAnswered && lastFlashCorrect !== null && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      {lastFlashCorrect ? (
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
                {flashAnswered && (
                  <button
                    type="button"
                    onClick={startNextFlashcard}
                    className="inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Next card
                  </button>
                )}
              </>
            ) : null}
          </div>
        )}

        {mode === "quiz" && (
          <QuizMode side={side} pool={placedOnSide} points={sidePoints} />
        )}

        {mode !== "edit" && mode !== "quiz" && (
          <ImageViewer
            side={side}
            points={sidePoints}
            mode={mode}
            highlightedPointId={
              mode === "study"
                ? studyHighlightId
                : mode === "flashcards" && flashAnswered
                  ? flashTarget?.id
                  : null
            }
            selectedPointId={mode === "study" ? studyHighlightId : null}
            feedbackByPointId={mode === "flashcards" ? flashFeedback : {}}
            onDotClick={
              mode === "flashcards"
                ? handleFlashcardClick
                : mode === "study"
                  ? (dot) =>
                      setStudyHighlightId((prev) =>
                        prev === dot.pointId ? null : dot.pointId,
                      )
                  : undefined
            }
            interactive={mode === "flashcards" ? !flashAnswered : true}
            tapNearestDot={
              (mode === "study" && coarsePointer) ||
              (mode === "flashcards" && !flashAnswered)
            }
            focusRequestId={mode === "study" ? studyFocusRequest : 0}
          />
        )}

        {mode === "study" && !coarsePointer && (
          <StudyPointList
            sidePoints={sidePoints}
            studyHighlightId={studyHighlightId}
            onSelect={handleStudyPointSelect}
          />
        )}
      </main>
    </div>
  );
}
