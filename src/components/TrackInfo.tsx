import type { TrackInfo as TrackInfoType } from '../services/audioStream';

interface TrackInfoProps {
  track: TrackInfoType | null;
}

export default function TrackInfo({ track }: TrackInfoProps) {
  if (!track) return null;

  return (
    <div className="text-center space-y-2 animate-fade-in">
      <h2 className="text-4xl md:text-5xl font-display font-bold bg-gradient-music bg-clip-text text-transparent">
        {track.title}
      </h2>
      
      <p className="text-xl text-gray-300 font-medium">
        {track.artist}
      </p>
      
      {(track.bpm || track.key) && (
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mt-3">
          {track.bpm && (
            <span className="flex items-center gap-1.5">
              <span className="text-primary-400">♪</span>
              {Math.round(track.bpm)} BPM
            </span>
          )}
          {track.key && (
            <span className="flex items-center gap-1.5">
              <span className="text-secondary-400">♯</span>
              {track.key}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
