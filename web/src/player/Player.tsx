import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { audioUrl } from '../lib/api';
import { useIsAdmin } from '../lib/admin-store';
import { useToggleFavorite, useTrack } from '../lib/queries';
import { formatDuration } from '../lib/format';
import { Modal } from '../components/Modal';
import { Artwork } from '../components/Artwork';
import { FavoriteHeart } from '../components/FavoriteHeart';
import { usePlayerStore } from './player-store';
import { QueueList } from './QueueList';



// Single audio element driven by the player store. The queue is per browser (PLY-5).
export function Player() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { queue, currentIndex, playing, next, previous, setPlaying, removeFromQueue, moveInQueue, jumpTo, clearQueue, repeat, toggleRepeat, shuffle, toggleShuffle } =
    usePlayerStore();
  const current = queue[currentIndex];
  const currentTrack = useTrack(current?.trackId ?? 0);
  const toggleFavorite = useToggleFavorite();
  const [time, setTime] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Publishes the bar's height so the page content can leave room for it.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const publish = () => document.documentElement.style.setProperty('--player-h', `${root.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(root);
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty('--player-h', '0px');
    };
  }, [current]);
  const [duration, setDuration] = useState(0);
  const [missingAudio, setMissingAudio] = useState<number | null>(null);
  const isAdmin = useIsAdmin();
  const [showQueue, setShowQueue] = useState(false);

  // Load the new source when the current track changes.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.src = audioUrl(current.trackId);
    setTime(0);
    if (playing) void audio.play().catch(() => setPlaying(false));
    // Only the track change should reload the source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.trackId]);

  // Keep the element in sync with the play flag set elsewhere in the app.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (playing && audio.paused) void audio.play().catch(() => setPlaying(false));
    if (!playing && !audio.paused) audio.pause();
  }, [playing, current, setPlaying]);

  if (!current) return null;

  const audio = audioRef.current;
  const seek = (seconds: number) => {
    if (audio) audio.currentTime = Math.max(0, Math.min(seconds, duration || seconds));
  };

  return (
    <div ref={rootRef} className="fixed inset-x-0 bottom-14 z-30 border-t border-neutral-700 bg-neutral-800 px-4 pb-3 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.6)] backdrop-blur md:bottom-0 md:left-56">
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={(e) => {
          // With a single-track queue, the index does not change, so restart the element directly.
          if (repeat && queue.length === 1) {
            e.currentTarget.currentTime = 0;
            void e.currentTarget.play();
            return;
          }
          next();
        }}
        onError={() => {
          // Skip tracks whose audio is missing. The dialog appears only when the queue has no later track.
          if (currentIndex + 1 < queue.length) {
            next();
            return;
          }
          setPlaying(false);
          setMissingAudio(current.trackId);
        }}
      />

      <div className="flex items-center gap-3">
        {currentTrack.data && (
          <Artwork trackId={current.trackId} hasArt={currentTrack.data.hasArt} className="h-14 w-14 shrink-0 rounded-md shadow-lg" fallback="♪" />
        )}
        <div className="min-w-0 flex-1">
          <Link to={`/tracks/${current.trackId}`} className="block truncate font-semibold hover:underline">
            {current.title}
          </Link>
          <p className="truncate text-xs text-neutral-400">{current.subtitle}</p>
        </div>
        <button
          type="button"
          aria-label={currentTrack.data?.favorite ? 'Remove from favorites' : 'Add to favorites'}
          onClick={() => currentTrack.data && toggleFavorite.mutate({ id: current.trackId, favorite: !currentTrack.data.favorite })}
          className="flex h-10 w-10 items-center justify-center rounded-full p-2 hover:bg-neutral-800"
        >
          <FavoriteHeart favorite={!!currentTrack.data?.favorite} className="h-6 w-6" />
        </button>
        <button
          type="button"
          aria-label="Toggle queue"
          onClick={() => setShowQueue((v) => !v)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium hover:bg-neutral-800 ${showQueue ? 'bg-neutral-700 text-white' : 'text-neutral-300'}`}
        >
          Queue ({queue.length})
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs tabular-nums text-neutral-400">
        <span className="w-10 text-right">{formatDuration(time)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={1}
          value={time}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
          className="min-w-0 flex-1 accent-white"
        />
        <span className="w-10">{formatDuration(duration)}</span>
      </div>

      <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex justify-start">
          <button
            type="button"
            onClick={toggleShuffle}
            aria-label="Shuffle queue"
            aria-pressed={shuffle}
            title="Shuffle queue"
            className={`flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-neutral-800 hover:text-white ${shuffle ? 'text-orange-400' : 'text-neutral-300'}`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden><path d="M10.6 9.2 7.8 6.4 9.2 5l2.8 2.8zM3 5h4.5l9.8 9.8 3.2-.1v2l-4.1.1-9.8-9.8H3zm13.7 8.8 2.8 2.8-1.4 1.4-2.8-2.8zM3 17h4.5l2.4-2.4 1.4 1.4L8.4 18.4H3zm13.5-12h4.5v4.5l-1.8-1.8-3.2 3.2-1.4-1.4 3.2-3.2z" /></svg>
          </button>
        </div>
        <div className="flex items-center justify-center gap-5 shrink-0">
          <button type="button" onClick={previous} aria-label="Previous" className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-300 transition hover:bg-neutral-800 hover:text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden><path d="M6 5h2v14H6zM20 5v14L9.5 12z" /></svg>
          </button>
          <button
            type="button"
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? 'Pause' : 'Play'}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 transition hover:scale-105 hover:bg-orange-400"
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-0.5 fill-current" aria-hidden><path d="M7 5v14l12-7z" /></svg>
            )}
          </button>
          <button type="button" onClick={next} aria-label="Next" className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-300 transition hover:bg-neutral-800 hover:text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden><path d="M16 5h2v14h-2zM4 5v14l10.5-7z" /></svg>
          </button>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggleRepeat}
            aria-label="Repeat queue"
            aria-pressed={repeat}
            title="Repeat queue"
            className={`flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-neutral-800 hover:text-white ${repeat ? 'text-orange-400' : 'text-neutral-300'}`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden><path d="M7 7h10v3l4-4-4-4v3H5v6h2zM17 17H7v-3l-4 4 4 4v-3h12v-6h-2z" /></svg>
          </button>
        </div>
      </div>

      {showQueue && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded border border-neutral-800 p-2">
          <div className="mb-1 flex justify-end">
            <button type="button" onClick={clearQueue} className="text-xs text-neutral-400 hover:text-red-400">Clear queue</button>
          </div>
          <QueueList
            queue={queue}
            currentIndex={currentIndex}
            onJump={jumpTo}
            onMove={moveInQueue}
            onRemove={removeFromQueue}
          />
        </div>
      )}

      {missingAudio !== null && (
        <Modal title="Audio missing" onClose={() => setMissingAudio(null)}>
          <p className="mb-4 text-sm text-neutral-300">
            {isAdmin
              ? "This track has no audio file. Upload one from the track's edit page."
              : 'This track has no audio file yet. Ask an admin to upload one.'}
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMissingAudio(null)} className="rounded px-3 py-1 text-neutral-300">Close</button>
            {isAdmin && (
              <Link to={`/tracks/${missingAudio}/edit`} onClick={() => setMissingAudio(null)} className="rounded bg-neutral-700 px-3 py-1">
                Edit track
              </Link>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
