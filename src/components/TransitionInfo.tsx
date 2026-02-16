import type { TransitionInfo as TransitionInfoType } from '../services/audioStream';

type Props = {
  transition: TransitionInfoType | null;
  isTransitioning: boolean;
};

function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) return '';
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function TransitionInfo({ transition, isTransitioning }: Props) {
  if (!transition) return null;

  // These keys come directly from TransitionPlan.to_dict() in Python
  const nextTrackName = transition.song_b || 'Next track';
  const exitLabel = transition.exit_segment || 'Current section';
  const entryLabel = transition.entry_segment || 'Next section';
  const matchScore = Number.isFinite(transition.score)
    ? transition.score.toFixed(1)
    : '–';

  // We added both "transition_start_time" and "start_time" in Python.
  // Prefer start_time if present, otherwise use transition_start_time.
  const startTime =
    typeof transition.start_time === 'number'
      ? transition.start_time
      : transition.transition_start_time;

  const startTimeLabel =
    typeof startTime === 'number' ? formatSeconds(startTime) : '';

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl bg-surface/60 backdrop-blur-xl border border-white/10 shadow-2xl px-8 py-6 text-center space-y-3">
      <p className="text-xs tracking-[0.35em] text-slate-400 uppercase">
        Up Next
      </p>

      <h2 className="text-xl font-semibold text-white">
        {nextTrackName}
      </h2>

      <div className="mt-3 flex items-center justify-center gap-8 text-xs uppercase tracking-[0.2em] text-slate-400">
        <div className="space-y-1">
          <div className="text-[0.6rem] text-slate-500">Exit</div>
          <div className="text-[0.7rem] text-slate-200">
            {exitLabel}
          </div>
        </div>

        <div className="h-10 w-px bg-white/10" />

        <div className="space-y-1">
          <div className="text-[0.6rem] text-slate-500">Entry</div>
          <div className="text-[0.7rem] text-slate-200">
            {entryLabel}
          </div>
        </div>

        <div className="h-10 w-px bg-white/10" />

        <div className="space-y-1">
          <div className="text-[0.6rem] text-slate-500">Match</div>
          <div className="text-[0.8rem] text-neon-cyan font-semibold">
            {matchScore}
          </div>
        </div>
      </div>

      {startTimeLabel && (
        <p className="text-[0.7rem] text-slate-400 mt-2">
          AI will start the mix around{' '}
          <span className="text-slate-200">{startTimeLabel}</span>
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