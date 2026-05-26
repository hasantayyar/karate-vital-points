const SIZE_PX = 56;
const HALO_PX = 14;
const CORE_PX = 7;
/**
 * Pulsing quiz marker — centered by parent (parent uses % + translate -50%).
 * Inspect in DevTools: `.quiz-pulse-marker` (root), rings are `.quiz-pulse-ring`.
 */
export default function QuizPulseMarker() {
  const half = SIZE_PX / 2;
  const haloHalf = HALO_PX / 2;
  const coreHalf = CORE_PX / 2;

  return (
    <>
      <style>
        {`
          @keyframes quizPulseExpand {
            0% { transform: scale(0.45); opacity: 1; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          @keyframes quizPulseCore {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
          }
        `}
      </style>
      <div
        className="quiz-pulse-marker pointer-events-none relative"
        style={{ width: SIZE_PX, height: SIZE_PX, marginLeft: -half, marginTop: -half }}
        role="img"
        aria-label="Pulsing question marker"
      >
        <span
          className="quiz-pulse-halo"
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: HALO_PX,
            height: HALO_PX,
            marginLeft: -haloHalf,
            marginTop: -haloHalf,
            borderRadius: "50%",
            background: "rgba(0, 0, 0, 0.7)",
            border: "2px solid rgba(255, 255, 255, 0.5)",
          }}
        />
        {[0, 0.38, 0.76].map((delay) => (
          <span
            key={delay}
            className="quiz-pulse-ring"
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: SIZE_PX,
              height: SIZE_PX,
              marginLeft: -half,
              marginTop: -half,
              borderRadius: "50%",
              border: "4px solid #ffffff",
              backgroundColor: "rgba(250, 204, 21, 0.65)",
              boxShadow:
                "0 0 0 3px #000000, 0 0 20px 10px rgba(250, 204, 21, 0.95)",
              animation: "quizPulseExpand 1.2s ease-out infinite",
              animationDelay: `${delay}s`,
            }}
          />
        ))}
        <span
          className="quiz-pulse-core"
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: CORE_PX,
            height: CORE_PX,
            marginLeft: -coreHalf,
            marginTop: -coreHalf,
            borderRadius: "50%",
            backgroundColor: "#facc15",
            border: "4px solid #ffffff",
            boxShadow:
              "0 0 0 4px #000000, 0 0 24px 12px rgba(250, 204, 21, 0.95)",
            animation: "quizPulseCore 0.9s ease-in-out infinite",
          }}
        />
      </div>
    </>
  );
}
