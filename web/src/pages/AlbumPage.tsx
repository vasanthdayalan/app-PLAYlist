import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { TrackList } from '../components/TrackList';
import { ChangeArtworkDialog } from '../components/ChangeArtworkDialog';
import { Artwork } from '../components/Artwork';
import { usePlayerStore } from '../player/player-store';
import { toQueueItem } from '../player/queue-item';
import { useAlbum } from '../lib/queries';
import { useIsAdmin } from '../lib/admin-store';

export function AlbumPage() {
  const { id } = useParams();
  const album = useAlbum(Number(id));
  const playNow = usePlayerStore((s) => s.playNow);
  const isAdmin = useIsAdmin();
  const [changingArt, setChangingArt] = useState(false);

  if (album.isLoading) return <p className="text-neutral-500">Loading…</p>;
  if (!album.data) return <p className="text-neutral-500">Album not found.</p>;
  const first = album.data.tracks[0];

  return (
    <section className="grid items-start gap-x-8 gap-y-4 md:grid-cols-[24rem_1fr]">
      <div className="flex flex-col items-center gap-4 text-center md:col-start-1 md:row-span-2 md:row-start-1">
        {first ? (
          <Artwork trackId={first.id} hasArt={first.hasArt} className="aspect-square w-full max-w-72 rounded-lg text-6xl" fallback="♪" />
        ) : (
          <div aria-hidden className="flex aspect-square w-full max-w-72 items-center justify-center rounded-lg bg-neutral-800 text-6xl text-neutral-500">♪</div>
        )}
        <h1 className="text-2xl font-semibold">{album.data.name} ({album.data.year})</h1>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 md:col-start-2 md:row-start-1 md:justify-end">
        <button
          type="button"
          disabled={album.data.tracks.length === 0}
          onClick={() => playNow(album.data.tracks.map(toQueueItem), 0)}
          className="rounded bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-900 disabled:opacity-40"
        >
          Play album
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setChangingArt(true)}
            className="rounded border border-neutral-600 px-3 py-1 text-sm hover:border-neutral-400"
          >
            Change Artwork
          </button>
        )}
      </div>
      <div className="min-w-0 md:col-start-2 md:row-start-2">
        <TrackList tracks={album.data.tracks} />
      </div>
      {changingArt && <ChangeArtworkDialog albumId={album.data.id} onClose={() => setChangingArt(false)} />}
    </section>
  );
}

