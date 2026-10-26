import { useState } from 'react';
import { ApiError } from '../lib/api';
import { useAddToPlaylist, useAddTracksToPlaylist, useCreatePlaylist, usePlaylists } from '../lib/queries';
import { Modal } from './Modal';

interface SaveToPlaylistDialogProps {
  trackIds: number[];
  label: string;
  onClose: () => void;
}

export function SaveToPlaylistDialog({ trackIds, label, onClose }: SaveToPlaylistDialogProps) {
  const playlists = usePlaylists();
  const addToPlaylist = useAddToPlaylist();
  const addTracksToPlaylist = useAddTracksToPlaylist();
  const createPlaylist = useCreatePlaylist();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addTo = (playlistId: number) => {
    setError(null);
    if (trackIds.length === 1) {
      addToPlaylist.mutate(
        { playlistId, trackId: trackIds[0] },
        {
          onSuccess: onClose,
          onError: (err) =>
            setError(err instanceof ApiError && err.code === 'DUPLICATE_PLAYLIST_TRACK'
              ? 'This track is already in that playlist.'
              : 'Could not add the track.'),
        },
      );
      return;
    }
    addTracksToPlaylist.mutate(
      { playlistId, trackIds },
      { onSuccess: onClose, onError: () => setError('Could not add the tracks.') },
    );
  };

  const createAndAdd = () => {
    const name = newName.trim();
    if (!name) return;
    createPlaylist.mutate(name, { onSuccess: (playlist) => addTo(playlist.id) });
  };

  return (
    <Modal title="Save to Playlist" onClose={onClose}>
      <p className="mb-3 truncate text-sm text-neutral-400">{label}</p>
      <div className="mb-3 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New Playlist…"
          className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-2 py-1"
        />
        <button type="button" onClick={createAndAdd} className="rounded bg-neutral-700 px-3 py-1">
          Create
        </button>
      </div>
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      <ul className="max-h-64 overflow-y-auto">
        {playlists.data?.map((playlist) => (
          <li key={playlist.id}>
            <button
              type="button"
              onClick={() => addTo(playlist.id)}
              className="w-full rounded px-2 py-2 text-left hover:bg-neutral-800"
            >
              {playlist.name} <span className="text-sm text-neutral-500">({playlist.trackCount})</span>
            </button>
          </li>
        ))}
        {playlists.data?.length === 0 && <li className="py-2 text-neutral-500">No playlists yet.</li>}
      </ul>
    </Modal>
  );
}
