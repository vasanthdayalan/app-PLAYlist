import { currentAdminToken, useAdminStore } from './admin-store';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorBody {
  error?: { code: string; message: string; details?: unknown };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';
  const token = currentAdminToken();
  if (token) headers['x-admin-token'] = token;

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    // A rejected token ends admin mode so the UI stops offering admin actions.
    if (response.status === 401 && token) useAdminStore.getState().setToken(null);
    const payload = (await response.json().catch(() => null)) as ErrorBody | null;

    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'HTTP_ERROR',
      payload?.error?.message ?? response.statusText,
      payload?.error?.details,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
};

// Builds a query string, skipping empty values.
export function toQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [string, string | boolean | undefined][]) {
    if (value === undefined || value === '' || value === false) continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function artUrl(trackId: number): string {
  return `/api/tracks/${trackId}/art`;
}

export function audioUrl(trackId: number): string {
  return `/api/tracks/${trackId}/audio`;
}
