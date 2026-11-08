import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bookmark, Pencil, Play, Trash2 } from 'lucide-react';
import { TrackMenu } from '../components/TrackList';
import { Artwork } from '../components/Artwork';
import { FavoriteHeart } from '../components/FavoriteHeart';
import { Modal } from '../components/Modal';
import { SaveToPlaylistDialog } from '../components/SaveToPlaylistDialog';
import { usePlayerStore } from '../player/player-store';
import { toQueueItem } from '../player/queue-item';
import { formatDuration, trackSubtitle } from '../lib/format';
import { useIsAdmin } from '../lib/admin-store';
import { useDeleteTrack, useSetArchived, useToggleFavorite, useTrack } from '../lib/queries';
import type { PersonRef } from '../lib/types';

const ICON_BUTTON = 'flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40';

export function TrackDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const trackId = Number(id);
  const track = useTrack(trackId);
  const toggleFavorite = useToggleFavorite();
  const toggleArchive = useSetArchived();
  const deleteTrack = useDeleteTrack();
  const isAdmin = useIsAdmin();
  const playNow = usePlayerStore((s) => s.playNow);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  if (track.isLoading) return <p className="text-neutral-500">Loading…</p>;
  if (!track.data) return <p className="text-neutral-500">Track not found.</p>;
  const t = track.data;
  // The server enforces this too; the UI just explains why the switch is locked.
  const archiveLocked = !t.archived && (t.favorite || t.inPlaylist);

  const remove = () => {
    deleteTrack.mutate(t.id, {
      onSuccess: () => {
        removeFromQueue(t.id);
        navigate('/tracks');
      },
    });
  };

  return (
    <section className="grid items-center gap-x-8 gap-y-6 md:grid-cols-[24rem_1fr]">
      <div className="flex flex-col items-center gap-4 text-center md:col-start-1 md:row-start-1">
        <Artwork trackId={t.id} hasArt={t.hasArt} className="aspect-square w-full max-w-72 rounded-lg text-6xl" fallback="♪" />
        <div className="min-w-0 w-full">
          <h1 className="text-2xl font-semibold">{t.trackName}</h1>
          <p className="text-neutral-400">
            <Link to={`/albums/${t.album.id}`} className="hover:underline">{t.album.name}</Link>
          </p>
        </div>

        </div>

        <div className="flex flex-col items-center gap-4 md:col-start-1 md:row-start-2">
        <div className="flex items-center justify-center gap-2">
          <button type="button" aria-label="Save to playlist" title={t.archived ? 'Archived tracks cannot be added to playlists' : 'Save to playlist'} disabled={t.archived} onClick={() => setSaving(true)} className={ICON_BUTTON}>
            <Bookmark className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Play" title="Play" onClick={() => playNow([toQueueItem(t)], 0)} className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-900 hover:bg-white">
            <Play className="h-6 w-6 fill-current" />
          </button>
          <button
            type="button"
            aria-label={t.favorite ? 'Remove from favorites' : 'Add to favorites'}
            title={t.archived ? 'Archived tracks cannot be favorited' : t.favorite ? 'Remove from favorites' : 'Add to favorites'}
            onClick={() => toggleFavorite.mutate({ id: t.id, favorite: !t.favorite })}
            disabled={t.archived}
            className={ICON_BUTTON}
          >
            <FavoriteHeart favorite={t.favorite} className="h-5 w-5" />
          </button>
          <TrackMenu track={t} />
          {isAdmin && (
            <>
              <Link to={`/tracks/${t.id}/edit`} aria-label="Edit track" title="Edit track" className={`${ICON_BUTTON} inline-flex`}>
                <Pencil className="h-5 w-5" />
              </Link>
              <button type="button" aria-label="Delete track" title="Delete track" onClick={() => setConfirming(true)} className={`${ICON_BUTTON} text-red-400`}>
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={t.archived}
                aria-label="Archived"
                title={archiveLocked ? 'Remove from favorites and playlists before archiving' : t.archived ? 'Unarchive track' : 'Archive track'}
                disabled={archiveLocked || toggleArchive.isPending}
                onClick={() => toggleArchive.mutate({ id: t.id, archived: !t.archived })}
                className={`relative h-6 w-11 shrink-0 rounded-full border border-neutral-400 transition-colors disabled:cursor-not-allowed ${t.archived ? 'border-amber-300 bg-amber-600' : 'bg-neutral-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${t.archived ? 'translate-x-5' : ''}`} />
              </button>
            </>
          )}
        </div>
        {isAdmin && archiveLocked && (
          <p className="text-xs text-neutral-500">Remove from favorites and playlists before archiving.</p>
        )}
        {isAdmin && toggleArchive.isError && <p className="text-xs text-red-400">{toggleArchive.error.message}</p>}
      </div>

      <div className="flex min-w-0 flex-col items-center justify-center space-y-4 md:items-stretch md:col-start-2 md:row-start-1">
      <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
        <dt className="text-neutral-500">Type</dt>
        <dd className="capitalize">{t.type}</dd>
        <dt className="text-neutral-500">Language</dt>
        <dd>{t.language.name}</dd>
        <dt className="text-neutral-500">Year</dt>
        <dd>{t.year}</dd>
        <dt className="text-neutral-500">Duration</dt>
        <dd>{formatDuration(t.durationSeconds)}</dd>
        <dt className="text-neutral-500">Composer</dt>
        <dd><PersonLinks people={t.people.composers} /></dd>
        <dt className="text-neutral-500">Artist</dt>
        <dd><PersonLinks people={t.people.artists} /></dd>
        <dt className="text-neutral-500">Lyricist</dt>
        <dd><PersonLinks people={t.people.lyricists} /></dd>
        <dt className="text-neutral-500">Actor</dt>
        <dd><PersonLinks people={t.people.actors} /></dd>
      </dl>

      {!t.hasAudio && <p className="text-sm text-amber-400">No audio file is attached to this track.</p>}
      </div>

      {saving && (
        <SaveToPlaylistDialog trackIds={[t.id]} label={trackSubtitle(t)} onClose={() => setSaving(false)} />
      )}
      {isAdmin && confirming && (
        <Modal title="Delete track?" onClose={() => setConfirming(false)}>
          <p className="mb-4 text-sm text-neutral-300">
            “{t.trackName}” will be permanently deleted. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirming(false)} className="rounded px-3 py-2 text-neutral-300 hover:bg-neutral-800">Cancel</button>
            <button type="button" onClick={remove} disabled={deleteTrack.isPending} className="rounded bg-red-700 px-3 py-2 hover:bg-red-600 disabled:opacity-40">Delete</button>
          </div>
          {deleteTrack.isError && <p className="mt-2 text-sm text-red-400">{deleteTrack.error.message}</p>}
        </Modal>
      )}
    </section>
  );
}

function PersonLinks({ people }: { people: PersonRef[] }) {
  if (people.length === 0) return <span className="text-neutral-500">—</span>;
  return (
    <>
      {people.map((person, index) => (
        <span key={person.id}>
          {index > 0 && ', '}
          <Link to={`/people/${person.id}`} className="hover:underline">{person.name}</Link>
        </span>
      ))}
    </>
  );
}
