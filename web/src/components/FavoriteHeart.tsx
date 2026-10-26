import { useEffect, useRef, useState } from 'react';

interface FavoriteHeartProps {
  favorite: boolean;
  className?: string;
}

// Outline heart when off, filled red with a glow when on. The pop animation plays each time it is favorited.
export function FavoriteHeart({ favorite, className = '' }: FavoriteHeartProps) {
  const [pop, setPop] = useState(0);
  const wasFavorite = useRef(favorite);

  useEffect(() => {
    if (favorite && !wasFavorite.current) setPop((n) => n + 1);
    wasFavorite.current = favorite;
  }, [favorite]);

  return (
    <span
      key={pop}
      aria-hidden
      className={`inline-flex transition-all duration-300 ease-out ${favorite ? 'scale-110 text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]' : 'text-neutral-300'} ${pop > 0 ? 'animate-heart-pop' : ''} ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-full w-full" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
        <path d="M12 21s-7.5-4.6-9.6-9.1C.9 8.9 2.6 5 6.3 5c2.1 0 3.4 1.1 4.2 2.3h3C14.3 6.1 15.6 5 17.7 5c3.7 0 5.4 3.9 3.9 6.9C19.5 16.4 12 21 12 21z" />
      </svg>
    </span>
  );
}
