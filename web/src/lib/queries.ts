import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, toQuery } from './api';
import { useIsAdmin } from './admin-store';
import type {
  AlbumDetail,
  ItunesSearchResponse,
  Language,
  PersonDetail,
  PersonRef,
  PersonRole,
  PlaylistDetail,
  PlaylistSummary,
  TrackPage,
  TrackSort,
  SortOrder,
  TrackView,
} from './types';

export interface TrackFilters {
  album?: string;
  albumYear?: string;
  trackName?: string;
  composer?: string;
  artist?: string;
  lyricist?: string;
  actor?: string;
  type?: string;
  languageId?: string;
  favorite?: boolean;
  hasAudio?: boolean;
  archivedOnly?: boolean;
  includeArchived?: boolean;
}

export interface TrackMetadata {
  type: 'movie' | 'indie';
  album: string;
  albumYear: number;
  trackName: string;
  languageId: number;
  year: number;
  composerIds: number[];
  artistIds: number[];
  lyricistIds: number[];
  actorIds: number[];
}

export interface ItunesQuery {
  trackName?: string;
  album?: string;
  artist?: string;
}

export const queryKeys = {
  tracks: (filters: TrackFilters) => ['tracks', filters] as const,
  track: (id: number) => ['track', id] as const,
  languages: ['languages'] as const,
  people: (role?: PersonRole, limit?: number, includeArchived?: boolean) =>
    ['people', role ?? 'all', limit ?? 'all', includeArchived ?? false] as const,
  person: (id: number) => ['person', id] as const,
  album: (id: number) => ['album', id] as const,
  playlists: ['playlists'] as const,
  playlist: (id: number) => ['playlist', id] as const,
};

// Admin mode shows archived tracks; normal mode leaves them out on the server.
function useIncludeArchived(): true | undefined {
  return useIsAdmin() || undefined;
}

export function useTracks(filters: TrackFilters, enabled = true) {
  const scoped = { ...filters, includeArchived: useIncludeArchived() };
  return useQuery({
    queryKey: queryKeys.tracks(scoped),
    queryFn: () => api.get<TrackView[]>(`/tracks${toQuery(scoped)}`),
    enabled,
  });
}

export function useTrackPage(filters: TrackFilters & { sort: TrackSort; order: SortOrder }, page: number, pageSize: number) {
  const scoped = { ...filters, includeArchived: useIncludeArchived() };
  return useQuery({
    queryKey: ['tracks-page', scoped, page, pageSize] as const,
    queryFn: () => api.get<TrackPage>(`/tracks${toQuery({ ...scoped, page, pageSize })}`),
    placeholderData: keepPreviousData,
  });
}

export function useTrack(id: number) {
  return useQuery({ queryKey: queryKeys.track(id), queryFn: () => api.get<TrackView>(`/tracks/${id}`) });
}

export function useLanguages() {
  return useQuery({ queryKey: queryKeys.languages, queryFn: () => api.get<Language[]>('/languages') });
}

export function usePeople(role?: PersonRole, limit?: number) {
  const includeArchived = useIncludeArchived();
  return useQuery({
    queryKey: queryKeys.people(role, limit, includeArchived),
    queryFn: () => api.get<PersonRef[]>(`/people${toQuery({ role, limit, includeArchived })}`),
  });
}

export function usePerson(id: number, forceIncludeArchived = false) {
  const toggled = useIncludeArchived();
  const includeArchived = forceIncludeArchived || toggled;

  return useQuery({
    queryKey: [...queryKeys.person(id), includeArchived] as const,
    queryFn: () => api.get<PersonDetail>(`/people/${id}${toQuery({ includeArchived })}`),
  });
}

export function useAlbum(id: number) {
  const includeArchived = useIncludeArchived();
  return useQuery({
    queryKey: [...queryKeys.album(id), includeArchived] as const,
    queryFn: () => api.get<AlbumDetail>(`/albums/${id}${toQuery({ includeArchived })}`),
  });
}

export function usePlaylists() {
  return useQuery({ queryKey: queryKeys.playlists, queryFn: () => api.get<PlaylistSummary[]>('/playlists') });
}

export function usePlaylist(id: number) {
  return useQuery({
    queryKey: queryKeys.playlist(id),
    queryFn: () => api.get<PlaylistDetail>(`/playlists/${id}`),
  });
}

export function useItunesSearch(query: ItunesQuery, enabled: boolean) {
  return useQuery({
    queryKey: ['itunes', query],
    queryFn: () => api.get<ItunesSearchResponse>(`/itunes/search${toQuery(query)}`),
    enabled,
    retry: false,
  });
}

// Mutations invalidate everything. The library is small and single-user, so this is simpler than tracking exact keys.
export function useInvalidateAll() {
  const client = useQueryClient();
  return () => client.invalidateQueries();
}

export function useToggleFavorite() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, favorite }: { id: number; favorite: boolean }) =>
      api.patch<TrackView>(`/tracks/${id}/favorite`, { favorite }),
    onSuccess: invalidate,
  });
}

export function useSetArchived() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      api.patch<TrackView>(`/tracks/${id}/archive`, { archived }),
    onSuccess: invalidate,
  });
}

export function useSaveTrack(trackId?: number) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ metadata, file, removeAudio }: { metadata: TrackMetadata; file: File | null; removeAudio?: boolean }) => {
      const form = new FormData();
      form.append('metadata', JSON.stringify(metadata));
      if (file) form.append('file', file);
      if (removeAudio) form.append('removeAudio', 'true');
      return trackId === undefined
        ? api.post<TrackView>('/tracks', form)
        : api.put<TrackView>(`/tracks/${trackId}`, form);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTrack() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/tracks/${id}`),
    onSuccess: invalidate,
  });
}

export function useCreatePerson() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ name, role }: { name: string; role: PersonRole }) => api.post<PersonRef>('/people', { name, role }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['people'] }),
  });
}

export function useChangeAlbumArtwork() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ albumId, file }: { albumId: number; file: Blob }) => {
      const form = new FormData();
      form.append('file', file, 'artwork');
      return api.post<void>(`/albums/${albumId}/artwork`, form);
    },
    onSuccess: invalidate,
  });
}

export function useDeletePerson() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/people/${id}`),
    onSuccess: invalidate,
  });
}

export function useRenamePerson() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => api.patch<PersonRef>(`/people/${id}`, { name }),
    onSuccess: invalidate,
  });
}

export function useCreatePlaylist() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (name: string) => api.post<PlaylistSummary>('/playlists', { name }),
    onSuccess: invalidate,
  });
}

export function useRenamePlaylist(id: number) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (name: string) => api.patch<PlaylistSummary>(`/playlists/${id}`, { name }),
    onSuccess: invalidate,
  });
}

export function useDeletePlaylist() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/playlists/${id}`),
    onSuccess: invalidate,
  });
}

export function useAddToPlaylist() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ playlistId, trackId }: { playlistId: number; trackId: number }) =>
      api.post(`/playlists/${playlistId}/tracks`, { trackId }),
    onSuccess: invalidate,
  });
}

export function useAddTracksToPlaylist() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ playlistId, trackIds }: { playlistId: number; trackIds: number[] }) =>
      api.post(`/playlists/${playlistId}/tracks/bulk`, { trackIds }),
    onSuccess: invalidate,
  });
}

export function useRemoveFromPlaylist() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ playlistId, trackId }: { playlistId: number; trackId: number }) =>
      api.delete(`/playlists/${playlistId}/tracks/${trackId}`),
    onSuccess: invalidate,
  });
}

export function useReorderPlaylist(playlistId: number) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (trackIds: number[]) => api.put(`/playlists/${playlistId}/order`, { trackIds }),
    onSuccess: invalidate,
  });
}
