export type TrackType = 'movie' | 'indie';
export type PersonRole = 'composer' | 'artist' | 'lyricist' | 'actor';

export interface PersonRef {
  id: number;
  name: string;
  trackCount?: number;
}

export interface TrackView {
  id: number;
  type: TrackType;
  trackName: string;
  year: number;
  favorite: boolean;
  archived: boolean;
  inPlaylist: boolean;
  durationSeconds: number | null;
  hasAudio: boolean;
  hasArt: boolean;
  createdAt: string;
  album: { id: number; name: string; year: number };
  language: { id: number; name: string };
  people: {
    composers: PersonRef[];
    artists: PersonRef[];
    lyricists: PersonRef[];
    actors: PersonRef[];
  };
}

export interface Language {
  id: number;
  name: string;
}

export interface PlaylistSummary {
  id: number;
  name: string;
  trackCount: number;
  coverTrackId: number | null;
  createdAt: string;
}

export interface PlaylistDetail {
  id: number;
  name: string;
  createdAt: string;
  tracks: TrackView[];
}

export interface AlbumDetail {
  id: number;
  name: string;
  year: number;
  tracks: TrackView[];
}

export interface PersonDetail {
  id: number;
  name: string;
  groups: Record<PersonRole, TrackView[]>;
}

export interface ItunesSongMatch {
  trackName: string | null;
  collectionName: string | null;
  artistName: string | null;
  releaseDate: string | null;
  primaryGenreName: string | null;
}

export interface ItunesSearchResponse {
  resultCount: number;
  matches: ItunesSongMatch[];
}

export interface DuplicateTrackDetails {
  matches: TrackView[];
}

export type TrackSort = 'added' | 'year' | 'album';
export type SortOrder = 'asc' | 'desc';

export interface TrackPage {
  items: TrackView[];
  total: number;
  page: number;
  pageSize: number;
}
