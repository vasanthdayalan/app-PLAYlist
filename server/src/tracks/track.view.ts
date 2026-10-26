import type { Prisma, PersonRole } from '@prisma/client';

export const trackInclude = {
  album: { include: { artwork: { select: { albumId: true } } } },
  language: true,
  people: { include: { person: true }, orderBy: { position: 'asc' } },
  playlistLinks: { select: { trackId: true }, take: 1 },
} satisfies Prisma.TrackInclude;

export type TrackWithRelations = Prisma.TrackGetPayload<{ include: typeof trackInclude }>;

export interface PersonRef {
  id: number;
  name: string;
}

export interface TrackView {
  id: number;
  type: string;
  trackName: string;
  year: number;
  favorite: boolean;
  archived: boolean;
  inPlaylist: boolean;
  createdAt: Date;
  durationSeconds: number | null;
  hasAudio: boolean;
  hasArt: boolean;
  album: { id: number; name: string; year: number };
  language: { id: number; name: string };
  people: { composers: PersonRef[]; artists: PersonRef[]; lyricists: PersonRef[]; actors: PersonRef[] };
}

const ROLE_KEY: Record<PersonRole, keyof TrackView['people']> = {
  composer: 'composers',
  artist: 'artists',
  lyricist: 'lyricists',
  actor: 'actors',
};

export function toTrackView(track: TrackWithRelations): TrackView {
  const people: TrackView['people'] = { composers: [], artists: [], lyricists: [], actors: [] };
  for (const link of track.people) {
    people[ROLE_KEY[link.role]].push({ id: link.person.id, name: link.person.name });
  }
  return {
    id: track.id,
    type: track.type,
    trackName: track.trackName,
    year: track.year,
    favorite: track.favorite,
    archived: track.archived,
    inPlaylist: track.playlistLinks.length > 0,
    createdAt: track.createdAt,
    durationSeconds: track.durationSeconds,
    hasAudio: track.audioPath !== null,
    hasArt: track.album.artwork !== null,
    album: { id: track.album.id, name: track.album.name, year: track.album.year },
    language: { id: track.language.id, name: track.language.name },
    people,
  };
}
