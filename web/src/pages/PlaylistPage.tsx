import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TrackList } from '../components/TrackList';
import { usePlayerStore } from '../player/player-store';
import { toQueueItem } from '../player/queue-item';
import { useDeletePlaylist, usePlaylist, useRemoveFromPlaylist, useRenamePlaylist, useReorderPlaylist } from '../lib/queries';

// Playlist detail: rename and delete live here (PL-3). Tracks can be reordered and removed.
export function PlaylistPage() {
  const { id } = useParams();
  const playlistId = Number(id);
  const navigate = useNavigate();
  const playlist = usePlaylist(playlistId);
  const rename = useRenamePlaylist(playlistId);
  const remove = useDeletePlaylist();
  const removeTrack = useRemoveFromPlaylist();
  const reorder = useReorderPlaylist(playlistId);
  const playNow = usePlayerStore((s) => s.playNow);
  const [name, setName] = useState<string | null>(null);

  if (playlist.isLoading) return <p className="text-neutral-500">Loading…</p>;
  if (!playlist.data) return <p className="text-neutral-500">Playlist not found.</p>;
  const data = playlist.data;

  const saveName = () => {
    const trimmed = (name ?? data.name).trim();
    if (trimmed && trimmed !== data.name) rename.mutate(trimmed);
    setName(null);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name ?? data.name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          aria-label="Playlist name"
          className="min-w-0 flex-1 rounded bg-transparent text-xl font-semibold outline-none focus:bg-neutral-900"
        />
        <button
          type="button"
          disabled={data.tracks.length === 0}
          onClick={() => playNow(data.tracks.map(toQueueItem), 0)}
          className="rounded bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-900 disabled:opacity-40"
        >
          Play
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Delete playlist "${data.name}"?`)) {
              remove.mutate(data.id, { onSuccess: () => navigate('/library') });
            }
          }}
          className="rounded px-3 py-1 text-sm text-red-400 hover:bg-neutral-800"
        >
          Delete playlist
        </button>
      </div>

      <TrackList
        tracks={data.tracks}
        emptyText="No records"
        playlistId={data.id}
        onRemove={(track) => removeTrack.mutate({ playlistId: data.id, trackId: track.id })}
        onReorder={(trackIds) => reorder.mutate(trackIds)}
      />
    </section>
  );
}
