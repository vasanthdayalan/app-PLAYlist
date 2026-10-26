import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayerStore } from '../player/player-store';
import { toQueueItem } from '../player/queue-item';
import { formatDuration, trackSubtitle } from '../lib/format';
import type { TrackView } from '../lib/types';
import { useToggleFavorite } from '../lib/queries';
import { SaveToPlaylistDialog } from './SaveToPlaylistDialog';
import { Artwork } from './Artwork';
import { FavoriteHeart } from './FavoriteHeart';

interface TrackMenuProps {
  track: TrackView;
  playlistId?: number;
  onRemoveFromPlaylist?: () => void;
}

// The 3-dot menu for a track (4.8). Remove only appears inside a playlist.
export function TrackMenu({ track, playlistId, onRemoveFromPlaylist }: TrackMenuProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playNext = usePlayerStore((s) => s.playNext);
  const playNow = usePlayerStore((s) => s.playNow);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const item = toQueueItem(track);
  const itemClass = 'block w-full px-3 py-2 text-left text-sm hover:bg-neutral-800';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Track actions"
        onClick={() => setOpen((value) => !value)}
        className="rounded px-2 py-1 text-neutral-400 hover:bg-neutral-800"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-44 rounded-md border border-neutral-700 bg-neutral-900 py-1 shadow-lg">
          <button className={itemClass} onClick={() => { playNow([item]); setOpen(false); }}>Play Now</button>
          <button className={itemClass} onClick={() => { playNext([item]); setOpen(false); }}>Play Next</button>
          <button className={itemClass} onClick={() => { addToQueue([item]); setOpen(false); }}>Add to Queue</button>
          <button className={itemClass} disabled={track.archived} onClick={() => { setSaving(true); setOpen(false); }}>Save to Playlist</button>
          <Link className={itemClass} to={`/albums/${track.album.id}`} onClick={() => setOpen(false)}>Go to Album</Link>
          {playlistId !== undefined && onRemoveFromPlaylist && (
            <button className={`${itemClass} text-red-400`} onClick={() => { onRemoveFromPlaylist(); setOpen(false); }}>
              Remove from Playlist
            </button>
          )}
        </div>
      )}
      {saving && (
        <SaveToPlaylistDialog trackIds={[track.id]} label={trackSubtitle(track)} onClose={() => setSaving(false)} />
      )}
    </div>
  );
}

interface TrackListProps {
  tracks: TrackView[];
  emptyText?: string;
  playlistId?: number;
  onRemove?: (track: TrackView) => void;
  onReorder?: (trackIds: number[]) => void;
}

// Shared track list for Tracks, Search, Album, Person, Favorites, and Playlist pages (4.8).
export function TrackList({ tracks, emptyText = 'No records', playlistId, onRemove, onReorder }: TrackListProps) {
  const playNow = usePlayerStore((s) => s.playNow);
  const toggleFavorite = useToggleFavorite();
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (tracks.length === 0) {
    return <p className="py-8 text-center text-neutral-500">{emptyText}</p>;
  }

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex || !onReorder) return;
    const ids = tracks.map((t) => t.id);
    const [moved] = ids.splice(dragIndex, 1);
    ids.splice(targetIndex, 0, moved);
    onReorder(ids);
    setDragIndex(null);
  };

  return (
    <ul className="divide-y divide-neutral-800">
      {tracks.map((track, index) => (
        <li
          key={track.id}
          draggable={Boolean(onReorder)}
          onDragStart={() => setDragIndex(index)}
          onDragOver={(event) => onReorder && event.preventDefault()}
          onDrop={() => handleDrop(index)}
          className="flex items-center gap-3 py-2"
        >
          <button
            type="button"
            onClick={() => playNow([toQueueItem(track)])}
            className="relative h-10 w-10 shrink-0 overflow-hidden rounded"
            aria-label={`Play ${track.trackName}`}
          >
            <Artwork trackId={track.id} hasArt={track.hasArt} className="h-full w-full text-neutral-300" fallback="▶" />
          </button>
          <div className="min-w-0 flex-1">
            <Link to={`/tracks/${track.id}`} className="block truncate font-medium hover:underline">
              {track.trackName}
            </Link>
            <p className="truncate text-sm text-neutral-400">{trackSubtitle(track)}</p>
          </div>
          <span className="hidden text-sm text-neutral-500 sm:inline">{formatDuration(track.durationSeconds)}</span>
          {!track.hasAudio && <span className="text-xs text-amber-400">No audio</span>}
          {track.archived && <span className="text-xs text-amber-400">Archived</span>}
          <button
            type="button"
            aria-label={track.favorite ? 'Remove from favorites' : 'Add to favorites'}
            onClick={() => toggleFavorite.mutate({ id: track.id, favorite: !track.favorite })}
            disabled={track.archived}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-800 disabled:opacity-40"
          >
            <FavoriteHeart favorite={track.favorite} className="h-5 w-5" />
          </button>
          {onRemove && (
            <button type="button" onClick={() => onRemove(track)} className="text-sm text-neutral-500 hover:text-red-400">
              Remove
            </button>
          )}
          <TrackMenu track={track} playlistId={playlistId} onRemoveFromPlaylist={onRemove ? () => onRemove(track) : undefined} />
        </li>
      ))}
    </ul>
  );
}
