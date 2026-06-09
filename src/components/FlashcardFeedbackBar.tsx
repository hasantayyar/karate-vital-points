import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";

interface FlashcardFeedbackBarProps {
  correct: boolean;
  targetName: string;
  clickedName?: string | null;
  score: { correct: number; total: number };
  onNext: () => void;
}

export default function FlashcardFeedbackBar({
  correct,
  targetName,
  clickedName,
  score,
  onNext,
}: FlashcardFeedbackBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 px-4 py-4 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:px-6"
      style={{
        borderColor: correct ? "#22c55e" : "#ef4444",
        backgroundColor: correct ? "rgba(5, 46, 22, 0.96)" : "rgba(69, 10, 10, 0.96)",
      }}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {correct ? (
            <CheckCircle2
              className="mt-0.5 h-8 w-8 shrink-0 text-green-400"
              aria-hidden
            />
          ) : (
            <XCircle
              className="mt-0.5 h-8 w-8 shrink-0 text-red-400"
              aria-hidden
            />
          )}
          <div>
            <p
              className={`text-xl font-bold ${correct ? "text-green-100" : "text-red-100"}`}
            >
              {correct ? "Correct!" : "Incorrect"}
            </p>
            {correct ? (
              <p className="mt-0.5 text-sm text-green-200/90">
                You found <strong className="text-green-50">{targetName}</strong>
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-red-200/90">
                {clickedName && clickedName !== targetName && (
                  <>
                    You tapped <strong className="text-red-100">{clickedName}</strong>
                    {" · "}
                  </>
                )}
                Answer: <strong className="text-red-50">{targetName}</strong>
              </p>
            )}
            <p className="mt-1 text-xs text-stone-400">
              Score: {score.correct} / {score.total}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-3 text-base font-semibold text-white shadow-lg hover:bg-red-600 sm:w-auto"
        >
          <RotateCcw className="h-5 w-5" />
          Next card
        </button>
      </div>
    </div>
  );
}
