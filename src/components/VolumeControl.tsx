import { Volume2, VolumeX } from "lucide-react";
import { cn } from "../lib/utils";

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (value: number) => void;
  className?: string;
}

export default function VolumeControl({
  volume,
  onVolumeChange,
  className,
}: VolumeControlProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-1 min-w-0", className)}>
      <button
        type="button"
        onClick={() => onVolumeChange(volume > 0 ? 0 : 1)}
        className="text-white/60 hover:text-white transition-colors shrink-0 cursor-pointer"
        title={volume === 0 ? "Unmute" : "Mute"}
        aria-label={volume === 0 ? "Unmute" : "Mute"}
      >
        {volume === 0 ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        aria-label="Volume"
        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-400"
      />
    </div>
  );
}
