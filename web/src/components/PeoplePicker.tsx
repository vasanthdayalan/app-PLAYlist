import { useState, type KeyboardEvent } from 'react';
import type { PersonRef, PersonRole } from '../lib/types';
import { useCreatePerson, usePeople } from '../lib/queries';
import { useIsAdmin } from '../lib/admin-store';

interface PeoplePickerProps {
  label: string;
  role: PersonRole;
  selected: PersonRef[];
  onChange: (people: PersonRef[]) => void;
}

// Type-to-filter picker: suggestions appear as the user types; Enter or Add creates a new person when no match exists (4.11, ACT-6).
export function PeoplePicker({ label, role, selected, onChange }: PeoplePickerProps) {
  const people = usePeople(role);
  const createPerson = useCreatePerson();
  const isAdmin = useIsAdmin();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();
  const isSelected = (id: number) => selected.some((p) => p.id === id);
  const suggestions = (people.data ?? []).filter((p) => !isSelected(p.id) && p.name.toLowerCase().includes(lower)).slice(0, 8);
  const exactExists = (people.data ?? []).some((p) => p.name.toLowerCase() === lower);

  const add = (person: PersonRef) => {
    onChange([...selected, person]);
    setQuery('');
    setError(null);
  };

  const remove = (id: number) => onChange(selected.filter((p) => p.id !== id));

  const createOrAdd = () => {
    if (!trimmed) return;
    const existing = (people.data ?? []).find((p) => p.name.toLowerCase() === lower);
    if (existing) {
      if (!isSelected(existing.id)) add(existing);
      return;
    }
    setError(null);
    if (!isAdmin) {
      setError('Only an admin can add a new person.');
      return;
    }
    createPerson.mutate({ name: trimmed, role }, {
      onSuccess: (person) => add(person),
      onError: () => setError('Could not create person.'),
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      createOrAdd();
    }
  };

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium text-neutral-300">{label}</legend>
      <div className="relative">
        <div className="flex min-h-9 flex-wrap items-center gap-1 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 focus-within:border-neutral-400">
          {selected.map((p) => (
            <span key={p.id} className="flex items-center gap-1 rounded bg-neutral-700 px-2 py-0.5 text-sm">
              {p.name}
              <button type="button" aria-label={`Remove ${p.name}`} onClick={() => remove(p.id)} className="text-neutral-400 hover:text-neutral-100">
                ×
              </button>
            </span>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={selected.length === 0 ? `Type to search or add ${label.toLowerCase()}` : ''}
            className="min-w-32 flex-1 bg-transparent py-0.5 text-sm outline-none"
          />
        </div>
        {trimmed && (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded border border-neutral-700 bg-neutral-900 text-sm shadow-lg">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => add(p)} className="block w-full px-2 py-1 text-left hover:bg-neutral-800">
                  {p.name}
                </button>
              </li>
            ))}
            {!exactExists && isAdmin && (
              <li>
                <button type="button" onClick={createOrAdd} className="block w-full px-2 py-1 text-left text-emerald-400 hover:bg-neutral-800">
                  Create “{trimmed}”
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </fieldset>
  );
}
