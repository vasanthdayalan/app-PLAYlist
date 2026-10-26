import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrackList } from '../components/TrackList';
import { ApiError } from '../lib/api';
import { useDeletePerson, usePeople, usePerson } from '../lib/queries';
import type { PersonRef, PersonRole } from '../lib/types';

const GROUPS: { role: PersonRole; label: string }[] = [
  { role: 'composer', label: 'Composer' },
  { role: 'artist', label: 'Artist' },
  { role: 'lyricist', label: 'Lyricist' },
  { role: 'actor', label: 'Actor' },
];

const SUGGESTION_LIMIT = 8;

// Deletes a person (any role). Blocked while any track, archived or not, still references them.
export function DeletePersonPage() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PersonRef | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const people = usePeople();
  const deletePerson = useDeletePerson();

  const lower = query.trim().toLowerCase();
  const suggestions = (people.data ?? []).filter((p) => p.name.toLowerCase().includes(lower)).slice(0, SUGGESTION_LIMIT);

  const choose = (person: PersonRef) => {
    setSelected(person);
    setQuery(person.name);
    setMessage(null);
  };

  const remove = () => {
    if (!selected) return;
    const name = selected.name;
    deletePerson.mutate(selected.id, {
      onSuccess: () => {
        setSelected(null);
        setQuery('');
        setMessage({ kind: 'ok', text: `Deleted ${name}.` });
      },
      onError: (err) =>
        setMessage({
          kind: 'error',
          text:
            err instanceof ApiError && err.status === 409
              ? 'This person still has tracks and cannot be deleted.'
              : 'Could not delete person.',
        }),
    });
  };

  return (
    <section className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Delete Person</h1>

      <div className="space-y-1">
        <label htmlFor="delete-person-search" className="block text-sm text-neutral-400">Person</label>
        <input
          id="delete-person-search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          placeholder="Type to search"
          autoComplete="off"
          className="w-full max-w-md rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
        />
        {!selected && lower && (
          <ul className="max-h-56 max-w-md overflow-y-auto rounded border border-neutral-800">
            {suggestions.length === 0 && <li className="px-3 py-2 text-sm text-neutral-500">No matches.</li>}
            {suggestions.map((person) => (
              <li key={person.id}>
                <button type="button" onClick={() => choose(person)} className="w-full px-3 py-2 text-left hover:bg-neutral-800">
                  {person.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && <PersonTracks person={selected} onDelete={remove} deleting={deletePerson.isPending} />}

      {message && <p className={message.kind === 'ok' ? 'text-sm text-green-400' : 'text-sm text-red-400'}>{message.text}</p>}
      <Link to="/people" className="block text-sm text-neutral-400 hover:underline">← Back to People</Link>
    </section>
  );
}

function PersonTracks({ person, onDelete, deleting }: { person: PersonRef; onDelete: () => void; deleting: boolean }) {
  const detail = usePerson(person.id, true);
  if (detail.isLoading) return <p className="text-neutral-500">Loading…</p>;
  if (!detail.data) return <p className="text-neutral-500">Person not found.</p>;

  const total = GROUPS.reduce((sum, group) => sum + detail.data.groups[group.role].length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-neutral-400">
          {total === 0 ? 'No tracks. This person can be deleted.' : `${total} ${total === 1 ? 'track' : 'tracks'} linked. Remove them before deleting.`}
        </p>
        <button
          type="button"
          onClick={onDelete}
          disabled={total > 0 || deleting}
          className="rounded bg-red-600 px-4 py-2 font-semibold text-white disabled:bg-neutral-700 disabled:text-neutral-400"
        >
          Delete {person.name}
        </button>
      </div>

      {GROUPS.map((group) => {
        const tracks = detail.data.groups[group.role];
        return (
          <div key={group.role} className="rounded-lg border border-neutral-700 bg-neutral-900 p-4">
            <div className="mb-3 flex items-baseline gap-2 border-b border-neutral-800 pb-2">
              <h2 className="font-semibold">{group.label}</h2>
              <span className="text-xs text-neutral-500">{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</span>
            </div>
            <TrackList tracks={tracks} emptyText={`No ${group.label.toLowerCase()} tracks`} />
          </div>
        );
      })}
    </div>
  );
}
