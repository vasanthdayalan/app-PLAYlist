import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrackList } from '../components/TrackList';
import { useIsAdmin } from '../lib/admin-store';
import { useLanguages, useTrackPage } from '../lib/queries';
import type { SortOrder, TrackSort } from '../lib/types';

const PAGE_SIZE = 50;

const SORT_OPTIONS: { value: string; label: string; sort: TrackSort; order: SortOrder }[] = [
  { value: 'added-desc', label: 'Last added (newest first)', sort: 'added', order: 'desc' },
  { value: 'added-asc', label: 'Last added (oldest first)', sort: 'added', order: 'asc' },
  { value: 'year-desc', label: 'Year (newest first)', sort: 'year', order: 'desc' },
  { value: 'year-asc', label: 'Year (oldest first)', sort: 'year', order: 'asc' },
  { value: 'album-asc', label: 'Album (A→Z)', sort: 'album', order: 'asc' },
  { value: 'album-desc', label: 'Album (Z→A)', sort: 'album', order: 'desc' },
];

// Paged library list; sorting and language filtering happen on the server so every page is consistent. "+" opens Add Track (4.8).
export function TracksPage() {
  const isAdmin = useIsAdmin();
  const languages = useLanguages();
  const [sortValue, setSortValue] = useState('added-desc');
  const [languageId, setLanguageId] = useState<string | undefined>(undefined);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [page, setPage] = useState(1);
  const sortOption = SORT_OPTIONS.find((option) => option.value === sortValue) ?? SORT_OPTIONS[0];
  const tracks = useTrackPage({ sort: sortOption.sort, order: sortOption.order, languageId }, page, PAGE_SIZE);
  const total = tracks.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedLanguage = languages.data?.find((language) => String(language.id) === languageId);

  const changeSort = (value: string) => {
    setSortValue(value);
    setPage(1);
  };

  const changeLanguage = (value: string | undefined) => {
    setLanguageId(value);
    setLanguageOpen(false);
    setPage(1);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Tracks</h1>
        <div className="flex items-center gap-2">
          <select value={sortValue} onChange={(e) => changeSort(e.target.value)} aria-label="Sort tracks" className="rounded bg-neutral-800 px-2 py-1 text-sm">
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="relative">
            <button
              type="button"
              onClick={() => setLanguageOpen((open) => !open)}
              aria-label="Filter by language"
              aria-expanded={languageOpen}
              title={selectedLanguage ? `Language: ${selectedLanguage.name}` : 'Filter by language'}
              className={`flex items-center gap-1 rounded px-2 py-1 text-sm ${languageId ? 'bg-neutral-100 text-neutral-900' : 'bg-neutral-800'}`}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
              </svg>
              {selectedLanguage && <span>{selectedLanguage.name}</span>}
            </button>
            {languageOpen && (
              <ul
                role="listbox"
                aria-label="Languages"
                className="absolute right-0 z-40 mt-1 max-h-64 w-48 overflow-y-auto rounded-md border border-neutral-700 bg-neutral-900 py-1 text-sm shadow-lg"
              >
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={!languageId}
                    onClick={() => changeLanguage(undefined)}
                    className={`w-full px-3 py-1 text-left hover:bg-neutral-800 ${!languageId ? 'font-semibold' : ''}`}
                  >
                    All languages
                  </button>
                </li>
                {[...(languages.data ?? [])]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((language) => (
                    <li key={language.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={String(language.id) === languageId}
                        onClick={() => changeLanguage(String(language.id))}
                        className={`w-full px-3 py-1 text-left hover:bg-neutral-800 ${String(language.id) === languageId ? 'font-semibold' : ''}`}
                      >
                        {language.name}
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          {isAdmin && (
            <Link to="/tracks/new" aria-label="Add track" className="rounded bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-900">
              +
            </Link>
          )}
        </div>
      </div>
      {tracks.isLoading ? <p className="text-neutral-500">Loading…</p> : <TrackList tracks={tracks.data?.items ?? []} />}
      {tracks.data && total > 0 && (
        <nav className="flex items-center justify-between gap-2 text-sm" aria-label="Pagination">
          <button
            type="button"
            aria-label="First page"
            title="First page"
            onClick={() => setPage(1)}
            disabled={page <= 1}
            className="hidden rounded border border-neutral-700 px-3 py-1 text-neutral-100 disabled:opacity-40 sm:inline-block"
          >
            «
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border border-neutral-700 px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="flex-1 text-center text-neutral-400">
            Page {page} of {lastPage} · {total} tracks
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage}
            className="rounded border border-neutral-700 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
          <button
            type="button"
            aria-label="Last page"
            title="Last page"
            onClick={() => setPage(lastPage)}
            disabled={page >= lastPage}
            className="hidden rounded border border-neutral-700 px-3 py-1 text-neutral-100 disabled:opacity-40 sm:inline-block"
          >
            »
          </button>
        </nav>
      )}
    </section>
  );
}

