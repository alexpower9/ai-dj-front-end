import { Sparkles } from 'lucide-react';

export interface QueuedTrackInfo {
  title: string;
  artist: string;
  isAutoQueued: boolean;
}

interface AutoplayIndicatorProps {
  queuedTrack: QueuedTrackInfo | null;
  isTransitioning: boolean;
}

export default function AutoplayIndicator({ queuedTrack, isTransitioning }: AutoplayIndicatorProps) {
  // DEBUG LOGGING
  console.log('🎵 AutoplayIndicator render:', { 
    queuedTrack, 
    isTransitioning,
    willRender: !!(queuedTrack && !isTransitioning)
  });

  // Don't show if no track queued or if we're actively transitioning
  if (!queuedTrack || isTransitioning) {
    console.log('🎵 AutoplayIndicator: returning null (no track or transitioning)');
    return null;
  }

  console.log('🎵 AutoplayIndicator: RENDERING COMPONENT');

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-center gap-3">
        {/* Autoplay badge - only show for auto-queued songs */}
        {queuedTrack.isAutoQueued && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary-600/20 to-secondary-600/20 border border-primary-500/30">
            <Sparkles className="w-3 h-3 text-neon-cyan" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-300">
              Autoplay
            </span>
          </div>
        )}
        
        {/* Up next text */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Up next:</span>
          <span className="text-sm font-medium bg-gradient-music bg-clip-text text-transparent">
            {queuedTrack.title}
          </span>
          <span className="text-sm text-gray-500">by</span>
          <span className="text-sm font-medium text-gray-300">
            {queuedTrack.artist}
          </span>
        </div>
      </div>
    </div>
  );
}