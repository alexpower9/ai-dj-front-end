// src/components/TrackInfo.tsx
import type { TrackInfo as TrackInfoType } from '../services/audioStream';

type Props = {
  track: TrackInfoType | null;
};

// Helper: if the string is ALL CAPS, convert to Title Case.
// Otherwise, leave it exactly as-is.
function formatTitle(raw: string): string {
  if (!raw) return '';

  const isAllCaps = raw === raw.toUpperCase();
  if (!isAllCaps) return raw;

  return raw
    .toLowerCase()
    .split(' ')
    .map(word =>
      word.length === 0
        ? word
        : word[0].toUpperCase() + word.slice(1)
    )
    .join(' ');
}

export default function TrackInfo({ track }: Props) {
  if (!track) return null;

  const displayTitle = formatTitle(track.title);
  const displayArtist = formatTitle(track.artist);

  return (
    <div className="text-center space-y-2">
      {/* Title – slightly smaller than before */}
      <h1 className="text-4xl md:text-5xl lg:text-5xl font-display font-black bg-gradient-music bg-clip-text text-transparent drop-shadow-2xl">
        {displayTitle}
      </h1>

      {/* Artist */}
      <p className="text-sm md:text-base text-slate-200/90">
        {displayArtist}
      </p>

      {/* Meta row */}
      <div className="mt-1 flex items-center justify-center gap-3 text-xs md:text-sm text-slate-400">
        <span>♪ {Math.round(track.bpm)} BPM</span>
        <span>•</span>
        <span>{track.key}</span>
      </div>
    </div>
  );
}