import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { usePeople, useRenamePerson } from '../lib/queries';
import type { PersonRef, PersonRole } from '../lib/types';

const ROLE_OPTIONS: { value: PersonRole; label: string }[] = [
  { value: 'actor', label: 'Actor' },
  { value: 'artist', label: 'Artist' },
  { value: 'composer', label: 'Composer' },
  { value: 'lyricist', label: 'Lyricist' },
];

const SUGGESTION_LIMIT = 8;

// Renames a person everywhere they appear. The role dropdown limits the person search to that role.
export function ManagePeoplePage() {
  const [role, setRole] = useState<PersonRole>('artist');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PersonRef | null>(null);
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const people = usePeople(role);
  const renamePerson = useRenamePerson();

  const lower = query.trim().toLowerCase();
  const suggestions = (people.data ?? []).filter((p) => p.name.toLowerCase().includes(lower)).slice(0, SUGGESTION_LIMIT);

  const choose = (person: PersonRef) => {
    setSelected(person);
    setNewName(person.name);
    setQuery(person.name);
    setMessage(null);
  };

  const changeRole = (value: PersonRole) => {
    setRole(value);
    setSelected(null);
    setQuery('');
    setNewName('');
    setMessage(null);
  };

  const update = () => {
    const trimmed = newName.trim();
    if (!selected || !trimmed) return;
    setMessage(null);
    renamePerson.mutate(
      { id: selected.id, name: trimmed },
      {
        onSuccess: (person) => {
          setSelected(person);
          setNewName(person.name);
          setQuery(person.name);
          setMessage({ kind: 'ok', text: `Renamed to ${person.name}.` });
        },
        onError: (err) =>
          setMessage({
            kind: 'error',
            text:
              err instanceof ApiError && err.status === 409
                ? 'Another person already has that name.'
                : 'Could not update the name.',
          }),
      },
    );
  };

  return (
    <section className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Manage People</h1>

      <label className="block space-y-1">
        <span className="text-sm text-neutral-400">Role</span>
        <select
          value={role}
          onChange={(e) => changeRole(e.target.value as PersonRole)}
          aria-label="Role"
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-1">
        <label htmlFor="person-search" className="block text-sm text-neutral-400">Person</label>
        <input
          id="person-search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setNewName('');
          }}
          placeholder="Type to search"
          autoComplete="off"
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
        />
        {!selected && lower && (
          <ul className="max-h-56 overflow-y-auto rounded border border-neutral-800">
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

      <label className="block space-y-1">
        <span className="text-sm text-neutral-400">New name</span>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={!selected}
          placeholder="Select a person first"
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 disabled:opacity-50"
        />
      </label>

      <button
        type="button"
        onClick={update}
        disabled={!selected || !newName.trim() || newName.trim() === selected.name || renamePerson.isPending}
        className="rounded bg-neutral-100 px-4 py-2 font-semibold text-neutral-900 disabled:opacity-40"
      >
        Update
      </button>

      {message && <p className={message.kind === 'ok' ? 'text-sm text-green-400' : 'text-sm text-red-400'}>{message.text}</p>}
      <Link to="/people" className="block text-sm text-neutral-400 hover:underline">← Back to People</Link>
    </section>
  );
}
