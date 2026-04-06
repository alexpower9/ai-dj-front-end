import { memo, useEffect, useRef, useState } from "react";
import type { TransitionInfo as TransitionInfoType } from "../services/audioStream";

type Props = {
  transition: TransitionInfoType | null;
  isTransitioning: boolean;
  isQuickTransitionPending: boolean;
};

function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) return "";
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// Slot value that flips out and snaps in with a new value
function SlotValue({
  value,
  flip,
  delayMs = 0,
  className = "",
}: {
  value: string;
  flip: boolean;
  delayMs?: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState(value);
  const [animating, setAnimating] = useState(false);
  const [landed, setLanded] = useState(false);
  const prevFlip = useRef(false);

  useEffect(() => {
    // Trigger only on false → true edge
    if (flip && !prevFlip.current) {
      prevFlip.current = true;

      const startTimer = setTimeout(() => {
        setAnimating(true);
        setLanded(false);

        // Swap text at midpoint while element is invisible
        const swapTimer = setTimeout(() => {
          setDisplayed(value);
          setLanded(true);
        }, 200);

        // Remove animation class after it finishes
        const doneTimer = setTimeout(() => {
          setAnimating(false);
        }, 450);

        return () => {
          clearTimeout(swapTimer);
          clearTimeout(doneTimer);
        };
      }, delayMs);

      return () => clearTimeout(startTimer);
    }

    if (!flip) {
      prevFlip.current = false;
      // Quietly sync value when flag resets (no animation)
      setDisplayed(value);
      setLanded(false);
    }
  }, [flip, value, delayMs]);

  return (
    <span
      className={`inline-block ${animating ? "animate-slot-flip" : ""} ${
        landed ? "text-violet-400" : ""
      } ${className}`}
      style={{ transition: landed ? "color 0.5s ease" : undefined }}
    >
      {displayed}
    </span>
  );
}

function TransitionInfo({
  transition,
  isTransitioning,
  isQuickTransitionPending,
}: Props) {
  if (!transition) return null;

  const nextTrackName = transition.song_b || "Next track";
  const exitLabel = transition.exit_segment || "Current section";
  const entryLabel = transition.entry_segment || "Next section";
  const matchScore = Number.isFinite(transition.score)
    ? transition.score.toFixed(1)
    : "–";

  const startTime =
    typeof transition.start_time === "number"
      ? transition.start_time
      : transition.transition_start_time;

  const startTimeLabel =
    typeof startTime === "number" ? formatSeconds(startTime) : "";

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl bg-surface/60 backdrop-blur-xl border border-white/10 shadow-2xl px-8 py-6 text-center space-y-3">
      <p className="text-xs tracking-[0.35em] text-slate-400 uppercase">
        Up Next
      </p>

      <h2 className="text-xl font-semibold text-white">{nextTrackName}</h2>

      <div className="mt-3 flex items-center justify-center gap-8 text-xs uppercase tracking-[0.2em] text-slate-400">
        {/* Exit segment */}
        <div className="space-y-1">
          <div className="text-[0.6rem] text-slate-500">Exit</div>
          <div className="text-[0.7rem] text-slate-200 overflow-hidden">
            <SlotValue
              value={exitLabel}
              flip={isQuickTransitionPending}
              delayMs={0}
            />
          </div>
        </div>

        <div className="h-10 w-px bg-white/10" />

        {/* Entry segment */}
        <div className="space-y-1">
          <div className="text-[0.6rem] text-slate-500">Entry</div>
          <div className="text-[0.7rem] text-slate-200 overflow-hidden">
            <SlotValue
              value={entryLabel}
              flip={isQuickTransitionPending}
              delayMs={70}
            />
          </div>
        </div>

        <div className="h-10 w-px bg-white/10" />

        {/* Match score */}
        <div className="space-y-1">
          <div className="text-[0.6rem] text-slate-500">Match</div>
          <div className="text-[0.8rem] font-semibold overflow-hidden">
            <SlotValue
              value={matchScore}
              flip={isQuickTransitionPending}
              delayMs={140}
              className="text-neon-cyan"
            />
          </div>
        </div>
      </div>

      {startTimeLabel && (
        <p className="text-[0.7rem] text-slate-400 mt-2">
          AI will start the mix around{" "}
          <span className="overflow-hidden inline-block align-middle">
            <SlotValue
              value={startTimeLabel}
              flip={isQuickTransitionPending}
              delayMs={210}
              className="text-slate-200"
            />
          </span>
        </p>
      )}

      {isTransitioning && (
        <p className="text-[0.7rem] text-neon-cyan/80 mt-1">
          Transition in progress…
        </p>
      )}
    </div>
  );
}

export default memo(TransitionInfo);
