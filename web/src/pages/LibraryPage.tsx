import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCreatePlaylist, usePlaylists, useTracks } from '../lib/queries';
import { Artwork } from '../components/Artwork';

// Library hub: Favorites first, then the user's playlists as tiles (PL-1).
export function LibraryPage() {
  const playlists = usePlaylists();
  const favorites = useTracks({ favorite: true });
  const createPlaylist = useCreatePlaylist();
  const [name, setName] = useState('');
  const favoriteCover = favorites.data?.find((track) => track.hasArt) ?? null;

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createPlaylist.mutate(trimmed, { onSuccess: () => setName('') });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Library</h1>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New playlist name"
          aria-label="New playlist name"
          className="flex-1 rounded border border-neutral-600 bg-neutral-900 px-3 py-2 focus:border-neutral-400 focus:outline-none"
        />
        <button type="button" onClick={create} className="rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-white">
          Create playlist
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        <Link
          to="/library/favorites"
          className="relative flex aspect-square flex-col justify-between overflow-hidden rounded-lg border border-neutral-700 bg-neutral-800/60 p-3 hover:border-neutral-500"
        >
          {favoriteCover && (
            <Artwork trackId={favoriteCover.id} hasArt className="absolute inset-0 h-full w-full" fallback="" />
          )}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/30 to-transparent" />
          <span className="relative line-clamp-2 font-medium">♥ Favorites</span>
          <span className="relative text-xs text-neutral-300">{favorites.data?.length ?? 0} tracks</span>
        </Link>
        {playlists.data?.map((playlist) => (
          <Link
            key={playlist.id}
            to={`/library/playlists/${playlist.id}`}
            className="relative flex aspect-square flex-col justify-between overflow-hidden rounded-lg border border-neutral-700 bg-neutral-800/60 p-3 hover:border-neutral-500"
          >
            {playlist.coverTrackId !== null && (
              <Artwork trackId={playlist.coverTrackId} hasArt className="absolute inset-0 h-full w-full" fallback="" />
            )}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/30 to-transparent" />
            <span className="relative line-clamp-2 font-medium">{playlist.name}</span>
            <span className="relative text-xs text-neutral-300">{playlist.trackCount} tracks</span>
          </Link>
        ))}
      </div>
      {playlists.data?.length === 0 && <p className="text-neutral-500">No playlists yet</p>}
    </section>
  );
}
