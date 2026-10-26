import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { toTrackView, trackInclude, type TrackView } from '../tracks/track.view.js';

export interface PlaylistSummary {
  id: number;
  name: string;
  trackCount: number;
  coverTrackId: number | null;
  createdAt: Date;
}

export interface PlaylistDetail {
  id: number;
  name: string;
  createdAt: Date;
  tracks: TrackView[];
}

@Injectable()
export class PlaylistsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<PlaylistSummary[]> {
    const playlists = await this.prisma.playlist.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { tracks: true } },
        tracks: {
          where: {
            track: {
              album: { artwork: { isNot: null } },
            },
          },
          orderBy: { position: 'asc' },
          take: 1,
          select: { trackId: true },
        },
      },
    });
    return playlists.map((p) => ({
      id: p.id,
      name: p.name,
      trackCount: p._count.tracks,
      coverTrackId: p.tracks[0]?.trackId ?? null,
      createdAt: p.createdAt,
    }));
  }

  async create(name: string): Promise<PlaylistDetail> {
    const playlist = await this.prisma.playlist.create({ data: { name } });
    return this.detail(playlist.id);
  }

  async detail(id: number): Promise<PlaylistDetail> {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        tracks: {
          orderBy: { position: 'asc' },
          include: { track: { include: trackInclude } },
        },
      },
    });
    if (!playlist) throw new NotFoundException('Playlist not found');
    return {
      id: playlist.id,
      name: playlist.name,
      createdAt: playlist.createdAt,
      tracks: playlist.tracks.map((link) => toTrackView(link.track)),
    };
  }

  async rename(id: number, name: string): Promise<PlaylistDetail> {
    await this.ensureExists(id);
    await this.prisma.playlist.update({ where: { id }, data: { name } });
    return this.detail(id);
  }

  async remove(id: number): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.playlist.delete({ where: { id } });
  }

  async addTrack(playlistId: number, trackId: number): Promise<PlaylistDetail> {
    await this.ensureExists(playlistId);
    const track = await this.prisma.track.findUnique({ where: { id: trackId }, select: { id: true, archived: true } });
    if (!track) throw new NotFoundException('Track not found');
    if (track.archived) {
      throw new ConflictException({ code: 'TRACK_ARCHIVED', message: 'An archived track cannot be added to a playlist' });
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.playlistTrack.findUnique({
        where: { playlistId_trackId: { playlistId, trackId } },
        select: { trackId: true },
      });
      if (existing) {
        throw new ConflictException({
          code: 'DUPLICATE_PLAYLIST_TRACK',
          message: 'This track is already in the playlist',
        });
      }
      const last = await tx.playlistTrack.findFirst({
        where: { playlistId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      await tx.playlistTrack.create({
        data: { playlistId, trackId, position: (last?.position ?? 0) + 1 },
      });
    });
    return this.detail(playlistId);
  }

  // Adds several tracks in order, skipping any already in the playlist, archived tracks, and unknown ids.
  async addTracks(playlistId: number, trackIds: number[]): Promise<PlaylistDetail> {
    await this.ensureExists(playlistId);

    await this.prisma.$transaction(async (tx) => {
      const known = await tx.track.findMany({
        where: { id: { in: trackIds }, archived: false },
        select: { id: true },
      });
      const knownIds = new Set(known.map((t) => t.id));
      const existing = await tx.playlistTrack.findMany({ where: { playlistId }, select: { trackId: true } });
      const existingIds = new Set(existing.map((t) => t.trackId));

      const toAdd = trackIds.filter((id) => knownIds.has(id) && !existingIds.has(id));
      if (toAdd.length === 0) return;

      const last = await tx.playlistTrack.findFirst({
        where: { playlistId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const start = last?.position ?? 0;
      await tx.playlistTrack.createMany({
        data: toAdd.map((trackId, index) => ({ playlistId, trackId, position: start + index + 1 })),
      });
    });
    return this.detail(playlistId);
  }

  async removeTrack(playlistId: number, trackId: number): Promise<PlaylistDetail> {
    await this.ensureExists(playlistId);
    const result = await this.prisma.playlistTrack.deleteMany({ where: { playlistId, trackId } });
    if (result.count === 0) throw new NotFoundException('Track is not in this playlist');
    return this.detail(playlistId);
  }

  // Reorder must list exactly the tracks currently in the playlist. Two passes avoid
  // hitting the unique (playlist_id, position) constraint while rows are moving.
  async reorder(playlistId: number, trackIds: number[]): Promise<PlaylistDetail> {
    await this.ensureExists(playlistId);

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.playlistTrack.findMany({
        where: { playlistId },
        select: { trackId: true },
      });
      const currentIds = new Set(current.map((c) => c.trackId));
      const sameSet = trackIds.length === currentIds.size && trackIds.every((id) => currentIds.has(id));
      if (!sameSet) {
        throw new BadRequestException('trackIds must list exactly the tracks in this playlist');
      }

      const offset = 1_000_000;
      for (const [index, trackId] of trackIds.entries()) {
        await tx.playlistTrack.update({
          where: { playlistId_trackId: { playlistId, trackId } },
          data: { position: offset + index + 1 },
        });
      }
      for (const [index, trackId] of trackIds.entries()) {
        await tx.playlistTrack.update({
          where: { playlistId_trackId: { playlistId, trackId } },
          data: { position: index + 1 },
        });
      }
    });
    return this.detail(playlistId);
  }

  private async ensureExists(id: number): Promise<void> {
    const exists = await this.prisma.playlist.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Playlist not found');
  }
}
