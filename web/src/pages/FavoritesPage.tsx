import { usePlayerStore } from '../player/player-store';
import { toQueueItem } from '../player/queue-item';
import { TrackList } from '../components/TrackList';
import { useTracks } from '../lib/queries';

// Favorites is a virtual playlist: tracks with the favorite flag set (PL-1).
export function FavoritesPage() {
  const favorites = useTracks({ favorite: true });
  const playNow = usePlayerStore((s) => s.playNow);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">♥ Favorites</h1>
        <button
          type="button"
          disabled={!favorites.data?.length}
          onClick={() => playNow((favorites.data ?? []).map(toQueueItem), 0)}
          className="rounded bg-neutral-100 px-3 py-1 text-sm text-neutral-900 disabled:opacity-40"
        >
          Play
        </button>
      </div>
      {favorites.isLoading ? <p className="text-neutral-500">Loading…</p> : <TrackList tracks={favorites.data ?? []} />}
    </section>
  );
}
