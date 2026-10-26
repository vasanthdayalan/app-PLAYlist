import { useState, type FormEvent } from 'react';
import { changeAdminToken, useAdminStore, useIsAdmin, verifyAdminToken } from '../lib/admin-store';

const MIN_TOKEN_LENGTH = 12;

type Mode = 'idle' | 'enter' | 'change';

// Used in the sidebar (desktop) and above the content (mobile).
export function AdminModeControl() {
  const isAdmin = useIsAdmin();
  const setToken = useAdminStore((state) => state.setToken);
  const [mode, setMode] = useState<Mode>('idle');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close() {
    setMode('idle');
    setValue('');
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const token = value.trim();
    if (token.length < MIN_TOKEN_LENGTH) {
      setError(`Use at least ${MIN_TOKEN_LENGTH} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === 'change') {
        await changeAdminToken(token);
      } else if (await verifyAdminToken(token)) {
        setToken(token);
      } else {
        setError('Wrong token, or admin mode is not configured on the server.');
        return;
      }
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin && mode === 'idle') {
    return (
      <button type="button" onClick={() => setMode('enter')} className="rounded-md px-3 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700">
        Enter admin mode
      </button>
    );
  }

  if (isAdmin && mode === 'idle') {
    return (
      <div className="flex flex-col gap-1 rounded-md bg-neutral-900 p-2 text-sm">
        <span className="px-1 font-semibold text-amber-300">Admin mode</span>
        <button type="button" onClick={() => setMode('change')} className="rounded px-2 py-1 text-left text-neutral-300 hover:bg-neutral-700">
          Change token
        </button>
        <button type="button" onClick={() => setToken(null)} className="rounded px-2 py-1 text-left text-neutral-300 hover:bg-neutral-700">
          Leave admin mode
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-md bg-neutral-900 p-2 text-sm">
      <label className="flex flex-col gap-1 text-neutral-300">
        {mode === 'change' ? 'New admin token' : 'Admin token'}
        <input
          type="password"
          autoFocus
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="rounded bg-neutral-800 px-2 py-1 text-neutral-100"
        />
      </label>
      {error && <p className="text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded bg-neutral-100 px-2 py-1 font-semibold text-neutral-900 disabled:opacity-50">
          {mode === 'change' ? 'Save' : 'Enter'}
        </button>
        <button type="button" onClick={close} className="rounded px-2 py-1 text-neutral-300 hover:bg-neutral-700">
          Cancel
        </button>
      </div>
    </form>
  );
}
