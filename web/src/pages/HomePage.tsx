import { useEffect, useMemo, useRef, useState } from 'react';
import { usePlayerStore } from '../player/player-store';
import { toQueueItem } from '../player/queue-item';
import { shuffled, trackSubtitle } from '../lib/format';
import { useTracks } from '../lib/queries';
import { Artwork } from '../components/Artwork';

const TILE_MIN_WIDTH = 226;
const GRID_GAP = 12;
const TEXT_HEIGHT = 48; // title and artist lines below the square artwork
const CHROME_HEIGHT = 280; // header, player bar and page padding
const MIN_ROWS = 10;

function gridLayout(width: number, height: number): { columns: number; rows: number } {
  const columns = Math.max(2, Math.floor((width + GRID_GAP) / (TILE_MIN_WIDTH + GRID_GAP)));
  const tileSize = (width - GRID_GAP * (columns - 1)) / columns;
  const fitRows = Math.floor((height - CHROME_HEIGHT + GRID_GAP) / (tileSize + TEXT_HEIGHT + GRID_GAP));
  return { columns, rows: Math.max(MIN_ROWS, fitRows) };
}

// Random track tiles from the whole library (Home, shuffle-able).
export function HomePage() {
  const tracks = useTracks({});
  const playNow = usePlayerStore((s) => s.playNow);
  const [seed, setSeed] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ columns: 2, rows: MIN_ROWS });

  useEffect(() => {
    const update = () => {
      const width = gridRef.current?.clientWidth ?? window.innerWidth;
      setLayout(gridLayout(width, window.innerHeight));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const order = useMemo(
    () => shuffled(tracks.data ?? []),
    // seed changes on "Refresh"
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracks.data, seed],
  );
  const tiles = order.slice(0, layout.columns * layout.rows);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Home</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => setSeed((s) => s + 1)} className="rounded bg-neutral-800 px-3 py-1 text-sm">
            Refresh
          </button>
          <button
            type="button"
            disabled={!tiles.length}
            onClick={() => playNow(shuffled(tiles).map(toQueueItem), 0)}
            className="rounded bg-neutral-100 px-3 py-1 text-sm text-neutral-900 disabled:opacity-40"
          >
            Shuffle Play
          </button>
        </div>
      </div>
      {tracks.data?.length === 0 && <p className="text-neutral-500">No records</p>}
      <div ref={gridRef} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))` }}>
        {tiles.map((track) => (
          <button
            key={track.id}
            type="button"
            onClick={() => playNow([toQueueItem(track)], 0)}
            className="group flex flex-col text-left"
          >
            <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-neutral-700 bg-neutral-800/60 group-hover:border-neutral-500 group-hover:bg-neutral-800">
              <Artwork trackId={track.id} hasArt={track.hasArt} className="h-full w-full rounded-xl text-3xl" fallback="♪" />
            </div>
            <p className="mt-2 w-full truncate text-sm font-medium">{track.trackName}</p>
            <p className="w-full truncate text-xs text-neutral-400">{trackSubtitle(track)}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

