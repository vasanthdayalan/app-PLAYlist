import { useState } from 'react';
import { useItunesSearch } from '../lib/queries';
import type { ItunesSongMatch } from '../lib/types';
import { ApiError } from '../lib/api';

export interface ItunesFill {
  trackName?: string;
  album?: string;
  year?: number;
}

interface ItunesPanelProps {
  defaults: { trackName: string; album: string; artist: string };
  onUse: (fill: ItunesFill) => void;
}

// Copy-only iTunes lookup (REQ: iTunes is a reference, nothing is saved from it).
export function ItunesPanel({ defaults, onUse }: ItunesPanelProps) {
  const [query, setQuery] = useState(defaults);
  const [submitted, setSubmitted] = useState<typeof defaults | null>(null);
  const result = useItunesSearch(submitted ?? {}, submitted !== null);

  const search = () => {
    setSubmitted({ trackName: query.trackName.trim(), album: query.album.trim(), artist: query.artist.trim() });
  };

  const matches: ItunesSongMatch[] | undefined = result.data?.matches;
  const errorMessage =
    result.error instanceof ApiError && result.error.code === 'ITUNES_UNAVAILABLE'
      ? 'iTunes is unavailable right now.'
      : result.error
        ? 'Search failed.'
        : null;

  return (
    <aside className="space-y-3 rounded-lg border border-neutral-800 p-3">
      <h2 className="font-semibold">iTunes lookup</h2>
      <p className="text-xs text-neutral-500">Copy-only. Nothing is saved until you press Save on the form.</p>
      {(['trackName', 'album', 'artist'] as const).map((key) => (
        <input
          key={key}
          value={query[key]}
          onChange={(e) => setQuery((q) => ({ ...q, [key]: e.target.value }))}
          placeholder={key === 'trackName' ? 'Track name' : key === 'album' ? 'Album' : 'Artist'}
          aria-label={`iTunes ${key}`}
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm"
        />
      ))}
      <button type="button" onClick={search} className="rounded bg-neutral-700 px-3 py-1 text-sm">
        Search iTunes
      </button>

      {result.isFetching && <p className="text-sm text-neutral-500">Searching…</p>}
      {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
      {submitted && matches && matches.length === 0 && <p className="text-sm text-neutral-500">No match found.</p>}
      {matches?.map((match, index) => (
        <div key={index} className="space-y-2 rounded border border-neutral-800 p-2 text-sm">
          <p><span className="text-neutral-500">Title:</span> {match.trackName}</p>
          <p><span className="text-neutral-500">Album:</span> {match.collectionName}</p>
          <p><span className="text-neutral-500">Artist:</span> {match.artistName}</p>
          <p><span className="text-neutral-500">Released:</span> {match.releaseDate?.slice(0, 4)}</p>
          <button
            type="button"
            onClick={() =>
              onUse({
                trackName: match.trackName ?? undefined,
                album: match.collectionName ?? undefined,
                year: match.releaseDate ? Number(match.releaseDate.slice(0, 4)) : undefined,
              })
            }
            className="rounded bg-neutral-700 px-3 py-1"
          >
            Use these values
          </button>
        </div>
      ))}
    </aside>
  );
}

