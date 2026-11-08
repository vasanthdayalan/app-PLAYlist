import { create } from 'zustand';

const STORAGE_KEY = 'playlist-admin-token';

interface AdminState {
  token: string | null;
  setToken: (token: string | null) => void;
}

// localStorage shares admin mode across all tabs of this origin, so new tabs stay in admin mode.
export const useAdminStore = create<AdminState>((set) => ({
  token: localStorage.getItem(STORAGE_KEY),
  setToken: (token) => {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
    set({ token });
  },
}));

export function useIsAdmin(): boolean {
  return useAdminStore((state) => state.token !== null);
}

export function currentAdminToken(): string | null {
  return useAdminStore.getState().token;
}

// Calls the server directly so the candidate token is not stored until it is accepted.
export async function verifyAdminToken(token: string): Promise<boolean> {
  const response = await fetch('/api/auth/check', { headers: { 'x-admin-token': token } });
  return response.ok;
}

// Rotates the server-side token. Requires the current admin token.
export async function changeAdminToken(next: string): Promise<void> {
  const current = currentAdminToken();
  const response = await fetch('/api/auth/token', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': current ?? '' },
    body: JSON.stringify({ token: next }),
  });
  if (!response.ok) throw new Error(response.status === 401 ? 'Current admin token is no longer valid' : 'Could not change token');
  useAdminStore.getState().setToken(next);
}
