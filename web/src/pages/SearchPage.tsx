import { useState } from 'react';
import { SaveToPlaylistDialog } from '../components/SaveToPlaylistDialog';
import { TrackList } from '../components/TrackList';
import { useIsAdmin } from '../lib/admin-store';
import { useLanguages, useTracks, type TrackFilters } from '../lib/queries';

const ADVANCED_FIELDS: { key: keyof TrackFilters; label: string }[] = [
  { key: 'album', label: 'Album' },
  { key: 'albumYear', label: 'Album year' },

  { key: 'composer', label: 'Composer' },
  { key: 'artist', label: 'Artist' },
  { key: 'lyricist', label: 'Lyricist' },
  { key: 'actor', label: 'Actor' },
];

const TYPE_OPTIONS = [
  { value: 'movie', label: 'Movie' },
  { value: 'indie', label: 'Indie' },
];

// Track name search with optional advanced filters. Empty search shows "No records" (4.11).
export function SearchPage() {
  const [filters, setFilters] = useState<TrackFilters>({});
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const isAdmin = useIsAdmin();
  const languages = useLanguages();
  const hasFilter = Object.values(filters).some((value) => typeof value === 'string' && value.trim() !== '');
  const results = useTracks(cleanFilters(filters, isAdmin), hasFilter);
  const resultIds = results.data?.map((track) => track.id) ?? [];

  const update = (key: keyof TrackFilters, value: string) => setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Search</h1>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={filters.trackName ?? ''}
            onChange={(e) => update('trackName', e.target.value)}
            placeholder="Track name"
            aria-label="Track name"
            className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
          />
          {isAdmin && (
            <>
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={filters.hasAudio ?? false}
                  onChange={(e) => setFilters((prev) => ({ ...prev, hasAudio: e.target.checked }))}
                />
                With Audio
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={filters.archivedOnly ?? false}
                  onChange={(e) => setFilters((prev) => ({ ...prev, archivedOnly: e.target.checked }))}
                />
                Archived
              </label>
            </>
          )}
        </div>
        <button type="button" onClick={() => setAdvanced((v) => !v)} className="text-sm text-neutral-400 hover:text-neutral-200">
          {advanced ? 'Hide advanced filters' : 'Advanced filters'}
        </button>
        {advanced && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ADVANCED_FIELDS.map((field) => (
              <input
                key={field.key}
                value={(filters[field.key] as string | undefined) ?? ''}
                onChange={(e) =>
                  update(field.key, field.key === 'albumYear' ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value)
                }
                placeholder={field.label}
                aria-label={field.label}
                inputMode={field.key === 'albumYear' ? 'numeric' : undefined}
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
              />
            ))}
            <select
              value={filters.type ?? ''}
              onChange={(e) => update('type', e.target.value)}
              aria-label="Type"
              className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
            >
              <option value="">Any type</option>
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={filters.languageId ?? ''}
              onChange={(e) => update('languageId', e.target.value)}
              aria-label="Language"
              className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
            >
              <option value="">Any language</option>
              {languages.data?.map((language) => (
                <option key={language.id} value={String(language.id)}>
                  {language.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {hasFilter && resultIds.length > 0 && (
        <button
          type="button"
          onClick={() => setSaving(true)}
          className="rounded bg-neutral-700 px-3 py-1 text-sm hover:bg-neutral-600"
        >
          Add {resultIds.length} {resultIds.length === 1 ? 'track' : 'tracks'} to playlist
        </button>
      )}
      {hasFilter ? (
        results.isLoading ? <p className="text-neutral-500">Loading…</p> : <TrackList tracks={results.data ?? []} />
      ) : (
        <TrackList tracks={[]} />
      )}
      {saving && (
        <SaveToPlaylistDialog
          trackIds={resultIds}
          label={`${resultIds.length} search results`}
          onClose={() => setSaving(false)}
        />
      )}
    </section>
  );
}

// Admin-only filters are dropped outside admin mode so they never reach the server.
function cleanFilters(filters: TrackFilters, isAdmin: boolean): TrackFilters {
  const result: TrackFilters = {};
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string' && value.trim() !== '') result[key as keyof TrackFilters] = value.trim() as never;
  }
  if (isAdmin && filters.hasAudio) result.hasAudio = true;
  if (isAdmin && filters.archivedOnly) result.archivedOnly = true;
  return result;
}

