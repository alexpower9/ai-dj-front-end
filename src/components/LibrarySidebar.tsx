import { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type LibrarySong = {
  id?: string;
  title?: string;
  artist?: string;
  bpm?: number;
  key?: string;
  scale?: string;
  name?: string;
  song_name?: string;
};

type Props = {
  isCollapsed: boolean;
  librarySongs: LibrarySong[];
  libraryLoading: boolean;
  libraryError: string | null;
  disabled: boolean;
  onRefresh: () => void;
  onCollapse: () => void;
  onExpand: () => void;
  onSelectSong: (title: string, artist: string) => void;
};

function LibrarySidebar({
  isCollapsed,
  librarySongs,
  libraryLoading,
  libraryError,
  disabled,
  onRefresh,
  onCollapse,
  onExpand,
  onSelectSong,
}: Props) {
  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-10' : 'w-[340px] xl:w-[360px]'
      }`}
    >
      <div
        className={`h-full bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden ${
          isCollapsed ? 'p-0' : 'p-4'
        }`}
      >
        {isCollapsed ? (
          <button
            type="button"
            onClick={onExpand}
            className="w-full h-full flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors"
            title="Expand library"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold tracking-widest text-gray-300">
                LIBRARY
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {libraryLoading ? 'Loading…' : 'Refresh'}
                </button>
                <button
                  type="button"
                  onClick={onCollapse}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                  title="Collapse library"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {libraryError && (
              <div className="text-xs text-red-300 mb-2 truncate">
                {libraryError}
              </div>
            )}

            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-12rem)] pr-3 library-scroll">
              {librarySongs.length === 0 && !libraryLoading ? (
                <div className="text-sm text-gray-500">No songs found.</div>
              ) : (
                librarySongs.map((song, idx) => {
                  const title =
                    song.title ??
                    song.name ??
                    song.song_name ??
                    song.id ??
                    'Untitled';
                  const artist = song.artist ?? '';
                  const bpm =
                    typeof song.bpm === 'number' ? Math.round(song.bpm) : null;
                  const key = song.key ?? '';
                  const scale = song.scale ?? '';
                  const keyStr = `${key}${scale ? ` ${scale}` : ''}`.trim();

                  return (
                    <button
                      key={song.id ?? `${title}::${artist}::${idx}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelectSong(title, artist)}
                      className="w-full text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 transition-colors disabled:opacity-50"
                    >
                      <div className="text-sm text-white/90 font-medium truncate">
                        {title}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {artist}
                        {bpm ? ` • ${bpm} BPM` : ''}
                        {keyStr ? ` • ${keyStr}` : ''}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

export default memo(LibrarySidebar);
