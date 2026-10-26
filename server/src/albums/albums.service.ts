import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { toTrackView, trackInclude } from '../tracks/track.view.js';
import { validateAlbumArtwork } from './album-artwork.js';

@Injectable()
export class AlbumsService {
  constructor(private readonly prisma: PrismaService) {}

  async replaceArtwork(id: number, buffer: Buffer): Promise<void> {
    const artwork = validateAlbumArtwork(buffer);
    const album = await this.prisma.album.findUnique({ where: { id }, select: { id: true } });
    if (!album) throw new NotFoundException('Album not found');
    await this.prisma.albumArtwork.upsert({
      where: { albumId: id },
      create: { albumId: id, ...artwork },
      update: artwork,
    });
  }

  async detail(id: number, includeArchived = false) {
    const album = await this.prisma.album.findUnique({ where: { id }, select: { id: true, name: true, year: true } });
    if (!album) throw new NotFoundException('Album not found');
    const rows = await this.prisma.track.findMany({
      where: { albumId: id, ...(includeArchived ? {} : { archived: false }) },
      include: trackInclude,
      orderBy: [{ year: 'asc' }, { normalizedTrackName: 'asc' }],
    });
    return { ...album, tracks: rows.map(toTrackView) };
  }
}
