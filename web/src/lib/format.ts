import type { TrackView } from './types';

export function artistNames(track: TrackView): string {
  return track.people.artists.map((person) => person.name).join(', ');
}

// Track row line: artists, then album · year (4.8).
export function trackSubtitle(track: TrackView): string {
  const parts = [track.album.name, String(track.year)];
  const artists = artistNames(track);
  return artists ? `${artists} — ${parts.join(' · ')}` : parts.join(' · ');
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '--:--';
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}

export function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
