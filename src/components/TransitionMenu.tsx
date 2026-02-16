// src/components/TransitionMenu.tsx
import type { TransitionInfo as TransitionInfoType } from '../services/audioStream';

type Props = {
  transition: TransitionInfoType | null;
  isTransitioning: boolean;
};

function prettySection(label?: string) {
  if (!label) return 'Section';
  const lower = label.toLowerCase();
  if (lower.includes('intro')) return 'Intro';
  if (lower.includes('outro')) return 'Outro';
  if (lower.includes('build')) return 'Build-up';
  if (lower.includes('drop')) return 'Drop';
  if (lower.includes('chorus')) return 'Chorus';
  if (lower.includes('verse')) return 'Verse';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function TransitionMenu({ transition, isTransitioning }: Props) {
  if (!transition) return null;

  const exitLabel = prettySection(transition.exit_segment);
  const entryLabel = prettySection(transition.entry_segment);
  const score =
    typeof transition.score === 'number' ? transition.score.toFixed(1) : '–';

  return (
    <div
      className={[
        'mx-auto w-full max-w-sm rounded-2xl border px-5 py-4 mt-3 text-xs',
        'bg-surface/70 shadow-lg shadow-black/40',
        isTransitioning
          ? 'border-neon-cyan/80 ring-2 ring-neon-cyan/40'
          : 'border-white/8',
      ].join(' ')}
    >
      <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2">
        Transition
      </p>

      {/* Current choice */}
      <div className="flex items-center justify-between text-[11px] text-slate-200 mb-2">
        <div className="space-y-0.5">
          <p className="text-slate-400 text-[10px] uppercase tracking-[0.16em]">
            Exit → Entry
          </p>
          <p className="font-medium">
            {exitLabel} <span className="text-slate-500">→</span> {entryLabel}
          </p>
        </div>

        <div className="text-right">
          <p className="text-slate-400 text-[10px] uppercase tracking-[0.16em]">
            Match
          </p>
          <p className="font-semibold text-neon-cyan">{score}</p>
        </div>
      </div>

      {/* State pill */}
      <p className="text-[11px] text-center">
        {isTransitioning ? (
          <span className="px-3 py-1 rounded-full bg-neon-cyan/15 text-neon-cyan/90 font-medium">
            Transition in progress
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full bg-slate-700/40 text-slate-200/90 font-medium">
            AI mix ready
          </span>
        )}
      </p>

      {/* Future: choice buttons – wired to console for now */}
      <div className="mt-3 flex items-center justify-center gap-2 text-[11px]">
        <button
          onClick={() => console.log('Keep this transition')}
          className="px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 transition-colors"
        >
          Keep
        </button>
        <button
          onClick={() => console.log('Would request a different transition here')}
          className="px-3 py-1 rounded-full border border-slate-600/80 hover:border-slate-400/80 transition-colors"
        >
          Try another (UI only)
        </button>
      </div>
    </div>
  );
}