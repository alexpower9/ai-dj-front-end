import type { TransitionInfo as TransitionInfoType } from '../services/audioStream';

interface TransitionInfoProps {
  transition: TransitionInfoType | null;
  isTransitioning: boolean;
}

// Format segment names for display (e.g., "cool-down" -> "Cool Down")
function formatSegmentName(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function TransitionInfo({ transition, isTransitioning }: TransitionInfoProps) {
  if (!transition) return null;

  return (
    <div className="animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-900/40 via-secondary-900/40 to-primary-900/40 border border-primary-500/30 backdrop-blur-sm p-4">
        {/* Animated background effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-r from-primary-500/10 via-neon-cyan/10 to-primary-500/10 ${
            isTransitioning ? 'animate-pulse' : ''
          }`} />
          {isTransitioning && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
          )}
        </div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${
              isTransitioning 
                ? 'bg-neon-cyan animate-pulse' 
                : 'bg-primary-400'
            }`} />
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              isTransitioning 
                ? 'text-neon-cyan' 
                : 'text-primary-300'
            }`}>
              {isTransitioning ? 'Mixing Now' : 'Up Next'}
            </span>
          </div>
          
          {/* Next song title */}
          <h3 className="text-xl font-display font-bold text-white text-center mb-3">
            {transition.songB}
          </h3>
          
          {/* Transition visualization */}
          <div className="flex items-center justify-center gap-3">
            {/* Exit segment */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Exit</span>
              <div className="px-3 py-1.5 rounded-lg bg-primary-600/30 border border-primary-500/40">
                <span className="text-sm font-medium text-primary-200">
                  {formatSegmentName(transition.exitSegment)}
                </span>
              </div>
            </div>
            
            {/* Arrow with animation */}
            <div className="flex items-center gap-1 py-4">
              <div className={`w-8 h-0.5 bg-gradient-to-r from-primary-500 to-neon-cyan ${
                isTransitioning ? 'animate-pulse' : ''
              }`} />
              <svg 
                className={`w-4 h-4 text-neon-cyan ${isTransitioning ? 'animate-pulse' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            {/* Entry segment */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Entry</span>
              <div className="px-3 py-1.5 rounded-lg bg-secondary-600/30 border border-secondary-500/40">
                <span className="text-sm font-medium text-secondary-200">
                  {formatSegmentName(transition.entrySegment)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Score indicator */}
          {transition.score > 0 && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Match</span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i < Math.round(transition.score / 2)
                        ? 'bg-neon-cyan'
                        : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400">{transition.score.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
