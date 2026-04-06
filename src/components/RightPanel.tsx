import { memo, useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import QueuePanel from './QueuePanel';
import type { TrackInfo as TrackInfoType } from '../services/audioStream';

type RightPanelTab = 'queue' | 'logs';

type Props = {
  rightPanelTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
  currentTrack: TrackInfoType | null;
  previousTrack: TrackInfoType | null;
  upNext: TrackInfoType[];
  onReorder: (newOrder: number[]) => void;
  onRemove: (index: number) => void;
  backendLogs: string[];
  bassLevel: number;
  bassAngle: number;
  isEditingBass: boolean;
  bassInput: string;
  onBassInputChange: (value: string) => void;
  onBassInputCommit: () => void;
  onBassInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onBassEditStart: () => void;
  onKnobPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onKnobPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onKnobPointerUp: () => void;
};

function getLogLineClass(line: string) {
  if (line.includes('ERROR') || line.includes('Error')) return 'text-red-400';
  if (line.includes('[WS]')) return 'text-neon-cyan/70';
  if (line.includes('[QUEUE]')) return 'text-neon-green/70';
  if (line.includes('[TRANSITION]') || line.includes('[DEBUG]')) {
    return 'text-neon-purple/70';
  }
  return '';
}

function RightPanel({
  rightPanelTab,
  onTabChange,
  currentTrack,
  previousTrack,
  upNext,
  onReorder,
  onRemove,
  backendLogs,
  bassLevel,
  bassAngle,
  isEditingBass,
  bassInput,
  onBassInputChange,
  onBassInputCommit,
  onBassInputKeyDown,
  onBassEditStart,
  onKnobPointerDown,
  onKnobPointerMove,
  onKnobPointerUp,
}: Props) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rightPanelTab !== 'logs') return;
    const container = logContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [backendLogs.length, rightPanelTab]);

  return (
    <aside className="w-full lg:w-[360px] flex-shrink-0 flex flex-col">
      <div className="h-full bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl p-4 flex flex-col">
        <div className="flex mb-3 bg-black/20 rounded-lg p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onTabChange('queue')}
            className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-medium rounded-md transition-all cursor-pointer ${
              rightPanelTab === 'queue'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            Queue
          </button>
          <button
            type="button"
            onClick={() => onTabChange('logs')}
            className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-medium rounded-md transition-all cursor-pointer ${
              rightPanelTab === 'logs'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            Logs
          </button>
        </div>

        {rightPanelTab === 'queue' && (
          <div className="flex-1 min-h-0 flex flex-col relative">
            <div className="flex-1 min-h-0">
              <QueuePanel
                currentTrack={currentTrack}
                previousTrack={previousTrack}
                upNext={upNext}
                onReorder={onReorder}
                onRemove={onRemove}
              />
            </div>

            <div className="absolute bottom-4 right-4">
              <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 backdrop-blur-xl shadow-lg">
                <div className="flex flex-col items-center">
                  <div className="text-[10px] tracking-widest text-white/60 mb-1">
                    BASS
                  </div>

                  <button
                    type="button"
                    onPointerDown={onKnobPointerDown}
                    onPointerMove={onKnobPointerMove}
                    onPointerUp={onKnobPointerUp}
                    onPointerCancel={onKnobPointerUp}
                    className="relative w-14 h-14 rounded-full bg-black/30 border border-white/10 shadow-lg cursor-ns-resize touch-none select-none"
                    style={{ touchAction: 'none' }}
                    aria-label="Bass control (demo)"
                    title="Drag up/down"
                  >
                    <span
                      className="absolute left-1/2 top-1/2 w-1 h-6 bg-gradient-to-b from-neon-cyan/80 to-primary-500/80 rounded-full"
                      style={{
                        transform: `translate(-50%, -95%) rotate(${bassAngle}deg)`,
                        transformOrigin: '50% 95%',
                      }}
                    />
                    <span className="absolute left-1/2 top-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 border border-white/10" />
                  </button>

                  <div className="mt-1 text-[10px] text-white/50 tabular-nums">
                    {isEditingBass ? (
                      <input
                        type="number"
                        value={bassInput}
                        autoFocus
                        min={0}
                        max={100}
                        onChange={(event) => onBassInputChange(event.target.value)}
                        onBlur={onBassInputCommit}
                        onKeyDown={onBassInputKeyDown}
                        className="w-10 bg-black/40 border border-white/10 rounded text-center text-white outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={onBassEditStart}
                        className="hover:text-white transition"
                      >
                        {bassLevel}%
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {rightPanelTab === 'logs' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div
              ref={logContainerRef}
              className="flex-1 overflow-y-auto library-scroll rounded-lg bg-black/30 border border-white/5 p-3 font-mono text-[11px] leading-relaxed text-white/60"
            >
              {backendLogs.length === 0 ? (
                <p className="text-white/20 italic">No logs yet...</p>
              ) : (
                backendLogs.map((line, index) => (
                  <div
                    key={`${index}-${line}`}
                    className={`py-0.5 ${getLogLineClass(line)}`}
                  >
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default memo(RightPanel);
