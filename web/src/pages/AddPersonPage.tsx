import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useCreatePerson } from '../lib/queries';
import type { PersonRole } from '../lib/types';

const ROLE_OPTIONS: { value: PersonRole; label: string }[] = [
  { value: 'composer', label: 'Composer' },
  { value: 'artist', label: 'Artist' },
  { value: 'lyricist', label: 'Lyricist' },
  { value: 'actor', label: 'Actor' },
];

// Person creation only. Renaming is on the Manage People page.
export function AddPersonPage() {
  const createPerson = useCreatePerson();
  const [name, setName] = useState('');
  const [role, setRole] = useState<PersonRole>('artist');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setMessage(null);
    createPerson.mutate(
      { name: trimmed, role },
      {
        onSuccess: (person) => {
          setName('');
          setMessage({ kind: 'ok', text: `Added ${person.name} as ${role}.` });
        },
        onError: (err) =>
          setMessage({
            kind: 'error',
            text: err instanceof ApiError && err.code === 'VALIDATION_ERROR' ? 'Enter a valid name.' : 'Could not add person.',
          }),
      },
    );
  };

  return (
    <section className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Add Person</h1>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          aria-label="Person name"
          className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as PersonRole)}
          aria-label="Role"
          className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded bg-neutral-100 px-4 py-2 font-semibold text-neutral-900">Add</button>
      </form>
      {message && <p className={message.kind === 'ok' ? 'text-sm text-green-400' : 'text-sm text-red-400'}>{message.text}</p>}
      <Link to="/people" className="text-sm text-neutral-400 hover:underline">← Back to People</Link>
    </section>
  );
}
