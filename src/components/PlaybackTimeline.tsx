
type Props = {
  currentTime: number;        // seconds
  duration: number;           // seconds
  transitionPoints: number[]; // seconds where a transition could happen
};

export default function PlaybackTimeline({
  currentTime,
  duration,
  transitionPoints,
}: Props) {
  const safeDuration = duration > 0 ? duration : 1; // avoid divide-by-zero
  const progressPct = Math.min(
    100,
    Math.max(0, (currentTime / safeDuration) * 100),
  );

  return (
    <div className="w-full">
      {/* Time labels */}
      <div className="flex justify-between text-[0.7rem] text-slate-400 mb-1">
        <span>
          {formatTime(currentTime)}
        </span>
        <span>
          {duration > 0 ? formatTime(duration) : '--:--'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden">
        {/* Filled portion */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-neon-cyan to-purple-500 transition-all duration-200"
          style={{ width: `${progressPct}%` }}
        />

        {/* Transition markers */}
        {transitionPoints.map((pt, idx) => {
          const pct = Math.min(100, Math.max(0, (pt / safeDuration) * 100));
          return (
            <div
              key={`${pt}-${idx}`}
              className="absolute top-0 bottom-0 w-[2px] bg-amber-300/80"
              style={{ left: `${pct}%` }}
            />
          );
        })}
      </div>

      {/* Legend */}
      {transitionPoints.length > 0 && (
        <div className="mt-1 text-[0.65rem] text-slate-500 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-300/80" />
          <span>Possible transition points</span>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const rStr = r < 10 ? `0${r}` : `${r}`;
  return `${m}:${rStr}`;
}