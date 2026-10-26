import { useParams } from 'react-router-dom';
import { TrackList } from '../components/TrackList';
import { usePlayerStore } from '../player/player-store';
import { toQueueItem } from '../player/queue-item';
import { usePerson } from '../lib/queries';
import type { PersonRole } from '../lib/types';

const GROUPS: { role: PersonRole; label: string }[] = [
  { role: 'composer', label: 'Composer' },
  { role: 'artist', label: 'Artist' },
  { role: 'lyricist', label: 'Lyricist' },
  { role: 'actor', label: 'Actor' },
];

// Person page: tracks grouped by the role the person played (4.8).
export function PersonPage() {
  const { id } = useParams();
  const person = usePerson(Number(id));
  const playNow = usePlayerStore((s) => s.playNow);

  if (person.isLoading) return <p className="text-neutral-500">Loading…</p>;
  if (!person.data) return <p className="text-neutral-500">Person not found.</p>;

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">{person.data.name}</h1>
      {GROUPS.map((group) => {
        const tracks = person.data.groups[group.role];
        const playable = tracks.filter((track) => track.hasAudio);
        return (
          <div key={group.role} className="rounded-lg border border-neutral-700 bg-neutral-900 p-4">
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-neutral-800 pb-2">
              <div className="flex items-baseline gap-2">
                <h2 className="font-semibold">{group.label}</h2>
                <span className="text-xs text-neutral-500">{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</span>
              </div>
              <button
                type="button"
                disabled={playable.length === 0}
                onClick={() => playNow(playable.map(toQueueItem), 0)}
                className="rounded bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-900 disabled:opacity-40"
              >
                Play
              </button>
            </div>
            <TrackList tracks={tracks} emptyText={`No ${group.label.toLowerCase()} tracks`} />
          </div>
        );
      })}
    </section>
  );
}
