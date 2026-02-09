// src/components/QueuePanel.tsx
import React from 'react';
import type { TrackInfo as TrackInfoType } from '../services/audioStream';

type Props = {
  currentTrack: TrackInfoType | null;
  previousTrack: TrackInfoType | null;
  upNext: TrackInfoType[];
};

// SAME helper we used in TrackInfo.tsx
function formatTitle(raw: string | undefined): string {
  if (!raw) return '';
  const isAllCaps = raw === raw.toUpperCase();
  if (!isAllCaps) return raw;

  return raw
    .toLowerCase()
    .split(' ')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export default function QueuePanel({ currentTrack, previousTrack, upNext }: Props) {
  if (!currentTrack && !previousTrack && upNext.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl bg-surface/70 border border-white/8 shadow-lg shadow-black/40 px-5 py-4 text-xs text-slate-300">
      {/* Header */}
      <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2">
        Queue
      </p>

      <div className="space-y-3">
        {/* Previous */}
        {previousTrack && (
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Previous
            </p>
            <p className="text-sm font-semibold text-slate-100 leading-snug">
              {formatTitle(previousTrack.title)}
            </p>
            <p className="text-[11px] text-slate-400">
              {formatTitle(previousTrack.artist)}
            </p>
          </div>
        )}

        {/* Current */}
        {currentTrack && (
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Now Playing
            </p>
            <p className="text-sm font-semibold text-slate-100 leading-snug">
              {formatTitle(currentTrack.title)}
            </p>
            <p className="text-[11px] text-slate-400">
              {formatTitle(currentTrack.artist)}
            </p>
          </div>
        )}

        {/* Up next (first only, optional) */}
        {upNext[0] && (
          <div className="space-y-0.5 pt-1 border-t border-white/5 mt-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Queued Up
            </p>
            <p className="text-sm font-medium text-slate-100 leading-snug">
              {formatTitle(upNext[0].title)}
            </p>
            <p className="text-[11px] text-slate-400">
              {formatTitle(upNext[0].artist)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}