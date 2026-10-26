import { artUrl } from '../lib/api';

interface ArtworkProps {
  trackId: number;
  hasArt: boolean;
  className: string;
  fallback: string;
}

// Album art when the track has an embedded picture; otherwise a neutral glyph box.
export function Artwork({ trackId, hasArt, className, fallback }: ArtworkProps) {
  if (hasArt) {
    return <img src={artUrl(trackId)} alt="" loading="lazy" className={`object-cover ${className}`} />;
  }
  return (
    <div aria-hidden className={`flex items-center justify-center bg-neutral-800 text-neutral-500 ${className}`}>
      {fallback}
    </div>
  );
}
