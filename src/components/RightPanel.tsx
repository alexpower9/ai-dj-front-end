import { memo, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import QueuePanel from './QueuePanel';
import type { TrackInfo as TrackInfoType } from '../services/audioStream';

type RightPanelTab = 'queue' | 'logs';

type Props = {
  rightPanelTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
  showLogsTab?: boolean;
  currentTrack: TrackInfoType | null;
  previousTrack: TrackInfoType | null;
  upNext: TrackInfoType[];
  onReorder: (newOrder: number[]) => void;
  onRemove: (index: number) => void;
  backendLogs: string[];
  bassLevel: number;
  isEditingBass: boolean;
  bassInput: string;
  onBassInputChange: (value: string) => void;
  onBassInputCommit: () => void;
  onBassInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onBassEditStart: () => void;
  onBassLevelChange: (value: number) => void;

  // Optional additional controls (if handlers are not provided, RightPanel will manage local UI state)
  eqLevel?: number;
  trebleLevel?: number;
  onEqLevelChange?: (value: number) => void;
  onTrebleLevelChange?: (value: number) => void;
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
  showLogsTab = true,
  currentTrack,
  previousTrack,
  upNext,
  onReorder,
  onRemove,
  backendLogs,
  bassLevel,
  isEditingBass,
  bassInput,
  onBassInputChange,
  onBassInputCommit,
  onBassInputKeyDown,
  onBassEditStart,
  onBassLevelChange,
  eqLevel = 50,
  trebleLevel = 50,
  onEqLevelChange,
  onTrebleLevelChange,
}: Props) {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const activeTab = showLogsTab ? rightPanelTab : 'queue';

  // Local UI state (optimistic): sliders should move immediately even if parent updates are delayed
  const [eqLocal, setEqLocal] = useState<number>(eqLevel);
  const [trebleLocal, setTrebleLocal] = useState<number>(trebleLevel);
  const [bassLocal, setBassLocal] = useState<number>(bassLevel);

  // Keep local state in sync when parent-controlled values change
  useEffect(() => {
    setEqLocal(eqLevel);
  }, [eqLevel]);

  useEffect(() => {
    setTrebleLocal(trebleLevel);
  }, [trebleLevel]);

  useEffect(() => {
    setBassLocal(bassLevel);
  }, [bassLevel]);

  useEffect(() => {
    if (activeTab !== 'logs') return;
    const container = logContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [activeTab, backendLogs.length]);

  return (
    <aside className="w-full lg:w-[360px] flex-shrink-0 flex flex-col">
      <div className="h-full bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl p-4 flex flex-col">
        <div className="flex mb-3 bg-black/20 rounded-lg p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onTabChange('queue')}
            className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-medium rounded-md transition-all cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            Queue
          </button>
          {showLogsTab && (
            <button
              type="button"
              onClick={() => onTabChange('logs')}
              className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Logs
            </button>
          )}
        </div>

        {activeTab === 'queue' && (
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
              <div className="flex items-end gap-4 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 backdrop-blur-xl shadow-lg">
                {/* EQ */}
                <div className="flex flex-col items-center">
                  <div className="text-[10px] tracking-widest text-white/60 mb-1">EQ</div>

                  <div className="flex flex-col items-center">
                    <div className="relative h-28 w-10 flex items-center justify-center">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={eqLocal}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setEqLocal(v);
                          onEqLevelChange?.(v);
                        }}
                        aria-label="EQ level"
                        className="w-28 h-2 appearance-none rounded-full bg-white/10 border border-white/10 cursor-pointer -rotate-90 origin-center \
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 \
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/60 [&::-webkit-slider-thumb]:border \
              [&::-webkit-slider-thumb]:border-white/20 [&::-webkit-slider-thumb]:shadow-lg \
              [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full \
              [&::-moz-range-thumb]:bg-white/60 [&::-moz-range-thumb]:border-white/20"
                      />
                    </div>
                    <div className="mt-2 text-[10px] tracking-widest text-white/40 text-center">0–100</div>
                  </div>

                  <div className="mt-1 text-[10px] text-white/50 tabular-nums">{Math.round(eqLocal)}%</div>
                </div>

                {/* BASS (existing editable control) */}
                <div className="flex flex-col items-center">
                  <div className="text-[10px] tracking-widest text-white/60 mb-1">BASS</div>

                  <div className="flex flex-col items-center">
                    <div className="relative h-28 w-10 flex items-center justify-center">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={bassLocal}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setBassLocal(v);
                          onBassLevelChange(v);
                        }}
                        aria-label="Bass level"
                        className="w-28 h-2 appearance-none rounded-full bg-white/10 border border-white/10 cursor-pointer -rotate-90 origin-center \
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 \
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/60 [&::-webkit-slider-thumb]:border \
              [&::-webkit-slider-thumb]:border-white/20 [&::-webkit-slider-thumb]:shadow-lg \
              [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full \
              [&::-moz-range-thumb]:bg-white/60 [&::-moz-range-thumb]:border-white/20"
                      />
                    </div>
                    <div className="mt-2 text-[10px] tracking-widest text-white/40 text-center">0–100</div>
                  </div>

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
                        onClick={() => {
                          onBassInputChange(String(bassLocal));
                          onBassEditStart();
                        }}
                        className="hover:text-white transition"
                      >
                        {bassLocal}%
                      </button>
                    )}
                  </div>
                </div>

                {/* TREBLE */}
                <div className="flex flex-col items-center">
                  <div className="text-[10px] tracking-widest text-white/60 mb-1">TREBLE</div>

                  <div className="flex flex-col items-center">
                    <div className="relative h-28 w-10 flex items-center justify-center">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={trebleLocal}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setTrebleLocal(v);
                          onTrebleLevelChange?.(v);
                        }}
                        aria-label="Treble level"
                        className="w-28 h-2 appearance-none rounded-full bg-white/10 border border-white/10 cursor-pointer -rotate-90 origin-center \
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 \
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/60 [&::-webkit-slider-thumb]:border \
              [&::-webkit-slider-thumb]:border-white/20 [&::-webkit-slider-thumb]:shadow-lg \
              [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full \
              [&::-moz-range-thumb]:bg-white/60 [&::-moz-range-thumb]:border-white/20"
                      />
                    </div>
                    <div className="mt-2 text-[10px] tracking-widest text-white/40 text-center">0–100</div>
                  </div>

                  <div className="mt-1 text-[10px] text-white/50 tabular-nums">{Math.round(trebleLocal)}%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && showLogsTab && (
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
