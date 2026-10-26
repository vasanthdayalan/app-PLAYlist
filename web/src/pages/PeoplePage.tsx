import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDeletePerson, usePeople } from '../lib/queries';
import { ApiError } from '../lib/api';
import { useIsAdmin } from '../lib/admin-store';
import type { PersonRole } from '../lib/types';

const ROLES: { role: PersonRole; label: string }[] = [
  { role: 'composer', label: 'Composer' },
  { role: 'artist', label: 'Artist' },
  { role: 'lyricist', label: 'Lyricist' },
  { role: 'actor', label: 'Actor' },
];

const TOP_LIMIT = 10;

// One section per role with the top 10 people by number of tracks in that role.
export function PeoplePage() {
  const isAdmin = useIsAdmin();
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">People</h1>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link
              to="/people/delete"
              className="rounded border border-neutral-600 px-3 py-1 text-sm font-medium hover:border-neutral-400"
            >
              Delete
            </Link>
            <Link
              to="/people/manage"
              className="rounded border border-neutral-600 px-3 py-1 text-sm font-medium hover:border-neutral-400"
            >
              Manage
            </Link>
            <Link
              to="/people/new"
              aria-label="Add person"
              title="Add person"
              className="flex h-8 w-8 items-center justify-center rounded bg-neutral-100 text-neutral-900 hover:bg-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
                <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
              </svg>
            </Link>
          </div>
        )}
      </div>
      {ROLES.map(({ role, label }) => (
        <RoleSection key={role} role={role} label={label} />
      ))}
    </section>
  );
}

function RoleSection({ role, label }: { role: PersonRole; label: string }) {
  const isAdmin = useIsAdmin();
  const people = usePeople(role, TOP_LIMIT);
  const deletePerson = useDeletePerson();
  const [error, setError] = useState<string | null>(null);
  const count = people.data?.length ?? 0;

  const remove = (id: number) => {
    setError(null);
    deletePerson.mutate(id, {
      onError: (err) =>
        setError(err instanceof ApiError && err.status === 409 ? 'This person still has tracks and cannot be deleted.' : 'Could not delete person.'),
    });
  };

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4">
      <h2 className="text-lg font-semibold">
        {label} <span className="text-sm font-normal text-neutral-500">top {TOP_LIMIT} by tracks</span>
      </h2>
      {count > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {people.data?.map((person) => (
            <li key={person.id} className="inline-flex items-center gap-1">
              <Link to={`/people/${person.id}`} className="inline-flex items-center gap-2 rounded-full border border-neutral-600 bg-neutral-800 px-3 py-1 text-sm hover:border-neutral-400">
                {person.name}
                <span className="rounded-full bg-neutral-700 px-2 text-xs text-neutral-300">{person.trackCount}</span>
              </Link>
              {isAdmin && (() => {
                const hasTracks = (person.trackCount ?? 0) > 0;
                return (
                  <button
                    type="button"
                    aria-label={`Delete ${person.name}`}
                    title={hasTracks ? 'Remove their tracks before deleting' : `Delete ${person.name}`}
                    disabled={hasTracks || deletePerson.isPending}
                    onClick={() => remove(person.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-neutral-600 text-sm hover:border-red-400 hover:text-red-400 disabled:opacity-40 disabled:hover:border-neutral-600 disabled:hover:text-current"
                  >
                    −
                  </button>
                );
              })()}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-neutral-500">{people.isLoading ? 'Loading…' : 'No people yet.'}</p>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

