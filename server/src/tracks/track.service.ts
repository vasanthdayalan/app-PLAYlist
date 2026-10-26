import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { PersonRole, Prisma } from '@prisma/client';
import { extname } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { isAllowedAudioExtension } from '../audio/audio-formats.js';
import {
  absoluteAudioPath,
  fileExists,
  moveStoredFile,
  moveUploadedFile,
  readAudioInfo,
  removeStoredFile,
} from '../audio/audio-storage.js';
import { buildRelativeAudioPath } from '../common/audio-path.js';
import { normalizeName } from '../common/normalize.js';
import { TrackFilterDto, TrackMetadataDto } from './track.dto.js';
import { toTrackView, trackInclude, TrackView } from './track.view.js';

type SortKey = NonNullable<TrackFilterDto['sort']>;

// Ties break on id so that pages never repeat or skip a track.
// `order` overrides the default direction of the primary key (added/year default to desc, album to asc).
function normalizeOrder(
  sort: SortKey | undefined,
  fallback?: 'trackName',
  order?: 'asc' | 'desc',
): Prisma.TrackOrderByWithRelationInput[] {
  if (sort === 'added') return [{ createdAt: order ?? 'desc' }, { id: order ?? 'desc' }];
  if (sort === 'year') return [{ year: order ?? 'desc' }, { normalizedTrackName: 'asc' }, { id: 'asc' }];
  if (sort === 'album') return [{ album: { normalizedName: order ?? 'asc' } }, { normalizedTrackName: 'asc' }, { id: 'asc' }];
  if (fallback === 'trackName') return [{ normalizedTrackName: 'asc' }, { id: 'asc' }];
  return [{ createdAt: 'desc' }, { id: 'desc' }];
}

type Db = Prisma.TransactionClient;

interface PersonLink {
  personId: number;
  role: PersonRole;
  position: number;
}

@Injectable()
export class TracksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: TrackFilterDto): Promise<TrackView[]> {
    const rows = await this.prisma.track.findMany({
      where: this.whereOf(filter),
      include: trackInclude,
      orderBy: normalizeOrder(filter.sort, 'trackName', filter.order),
    });
    return rows.map(toTrackView);
  }

  // One page of tracks plus the total, so the client can move through the whole library.
  async listPage(filter: TrackFilterDto, page: number, pageSize: number) {
    const where = this.whereOf(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.track.findMany({
        where,
        include: trackInclude,
        orderBy: normalizeOrder(filter.sort, undefined, filter.order),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.track.count({ where }),
    ]);
    return { items: rows.map(toTrackView), total, page, pageSize };
  }

  private whereOf(filter: TrackFilterDto): Prisma.TrackWhereInput {
    const where: Prisma.TrackWhereInput = {};
    if (filter.favorite !== undefined) where.favorite = filter.favorite;
    if (filter.archivedOnly) where.archived = true;
    else if (!filter.includeArchived) where.archived = false;
    if (filter.hasAudio) where.audioPath = { not: null };
    if (filter.type) where.type = filter.type;
    if (filter.languageId !== undefined) where.languageId = filter.languageId;
    if (filter.trackName) where.normalizedTrackName = { contains: normalizeName(filter.trackName) };
    if (filter.album || filter.albumYear !== undefined) {
      where.album = {
        ...(filter.album ? { normalizedName: { contains: normalizeName(filter.album) } } : {}),
        ...(filter.albumYear !== undefined ? { year: filter.albumYear } : {}),
      };
    }

    const roleFilters: [PersonRole, string | undefined][] = [
      ['composer', filter.composer],
      ['artist', filter.artist],
      ['lyricist', filter.lyricist],
      ['actor', filter.actor],
    ];
    const personFilters = roleFilters
      .filter((entry): entry is [PersonRole, string] => Boolean(entry[1]))
      .map(([role, name]) => ({
        people: { some: { role, person: { normalizedName: { contains: normalizeName(name) } } } },
      }));
    if (personFilters.length > 0) where.AND = personFilters;
    return where;
  }

  async get(id: number): Promise<TrackView> {
    const track = await this.prisma.track.findUnique({ where: { id }, include: trackInclude });
    if (!track) throw new NotFoundException('Track not found');
    return toTrackView(track);
  }

  async create(input: TrackMetadataDto, file: Express.Multer.File | null): Promise<TrackView> {
    const extension = file ? audioExtensionOf(file) : null;
    const audio = file ? await readAudioInfo(file.path) : null;

    return this.prisma.$transaction(async (tx) => {
      const language = await this.resolveReferences(tx, input);
      const normalizedAlbum = normalizeName(input.album);
      const normalizedTrack = normalizeName(input.trackName);

      await this.assertNoDuplicate(tx, input, normalizedAlbum, normalizedTrack, null);
      const album = await this.findOrCreateAlbum(tx, input.album, normalizedAlbum, input.albumYear);

      const audioPath = extension
        ? audioPathFor(input, language.name, album.name, extension)
        : null;
      if (audioPath) await this.assertPathAvailable(tx, audioPath, null);

      const track = await tx.track.create({
        data: {
          type: input.type,
          albumId: album.id,
          languageId: language.id,
          trackName: input.trackName,
          normalizedTrackName: normalizedTrack,
          year: input.year,
          durationSeconds: audio?.durationSeconds ?? null,
          audioPath,
          people: { create: personLinks(input) },
        },
        include: trackInclude,
      });
      await this.linkRoles(tx, input);

      if (audio?.artwork) await setAlbumArtwork(tx, album.id, audio.artwork);
      if (file && audioPath) await moveUploadedFile(file.path, audioPath);
      return toTrackView(track);
    });
  }

  async update(
    id: number,
    input: TrackMetadataDto,
    file: Express.Multer.File | null,
    removeAudio = false,
  ): Promise<TrackView> {
    const extension = file ? audioExtensionOf(file) : null;
    const audio = file ? await readAudioInfo(file.path) : null;
    // A new file always wins over the remove flag.
    const removing = removeAudio && !file;

    const { view, oldPath, newPath } = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.track.findUnique({
        where: { id },
        select: { audioPath: true, durationSeconds: true, albumId: true },
      });
      if (!existing) throw new NotFoundException('Track not found');

      const language = await this.resolveReferences(tx, input);
      const normalizedAlbum = normalizeName(input.album);
      const normalizedTrack = normalizeName(input.trackName);
      await this.assertNoDuplicate(tx, input, normalizedAlbum, normalizedTrack, id);
      const album = await this.findOrCreateAlbum(tx, input.album, normalizedAlbum, input.albumYear);

      const oldPath = existing.audioPath;
      const newExtension = extension ?? (oldPath ? extname(oldPath).slice(1).toLowerCase() : null);
      const newPath = removing || !newExtension ? null : audioPathFor(input, language.name, album.name, newExtension);
      if (newPath && newPath !== oldPath) await this.assertPathAvailable(tx, newPath, id);

      const track = await tx.track.update({
        where: { id },
        data: {
          type: input.type,
          albumId: album.id,
          languageId: language.id,
          trackName: input.trackName,
          normalizedTrackName: normalizedTrack,
          year: input.year,
          durationSeconds: removing ? null : (audio?.durationSeconds ?? existing.durationSeconds),
          audioPath: newPath,
          people: { deleteMany: {}, create: personLinks(input) },
        },
        include: trackInclude,
      });
      await this.linkRoles(tx, input);

      // Album art is kept while the album has tracks. A new audio file that embeds art replaces it.
      if (file && audio?.artwork) await setAlbumArtwork(tx, album.id, audio.artwork);
      // A track that moved to another album may have left the old one empty.
      if (existing.albumId !== album.id) {
        await moveAlbumArtworkIfEmptied(tx, existing.albumId, album.id);
        await deleteAlbumIfEmpty(tx, existing.albumId);
      }

      // Audio work runs last inside the transaction, so a failed move rolls back the metadata.
      if (file && newPath) {
        await moveUploadedFile(file.path, newPath);
      } else if (oldPath && newPath && oldPath !== newPath && (await fileExists(absoluteAudioPath(oldPath)))) {
        await moveStoredFile(oldPath, newPath);
      }
      return { view: toTrackView(track), oldPath, newPath };
    });

    // The replaced file is removed only after the new metadata is committed.
    if (oldPath && oldPath !== newPath) {
      await removeStoredFile(oldPath);
    }
    return view;
  }

  async remove(id: number): Promise<{ id: number; deleted: true }> {
    const existing = await this.prisma.track.findUnique({ where: { id }, select: { audioPath: true, albumId: true } });
    if (!existing) throw new NotFoundException('Track not found');

    // Playlist links and person links are removed by the database cascade.
    await this.prisma.$transaction(async (tx) => {
      await tx.track.delete({ where: { id } });
      await deleteAlbumIfEmpty(tx, existing.albumId);
    });
    if (existing.audioPath) await removeStoredFile(existing.audioPath);
    return { id, deleted: true };
  }

  // Art belongs to the album, so every track in it shows the same cover.
  async artworkOf(id: number): Promise<{ mimeType: string; data: Buffer }> {
    const track = await this.prisma.track.findUnique({ where: { id }, select: { albumId: true } });
    if (!track) throw new NotFoundException('Track not found');
    const artwork = await this.prisma.albumArtwork.findUnique({ where: { albumId: track.albumId } });
    if (!artwork) throw new NotFoundException('Artwork not found');
    return { mimeType: artwork.mimeType, data: Buffer.from(artwork.data) };
  }

  async setFavorite(id: number, favorite: boolean): Promise<TrackView> {
    const existing = await this.prisma.track.findUnique({ where: { id }, select: { id: true, archived: true } });
    if (!existing) throw new NotFoundException('Track not found');
    if (favorite && existing.archived) {
      throw new ConflictException({ code: 'TRACK_ARCHIVED', message: 'An archived track cannot be favorited' });
    }
    const track = await this.prisma.track.update({
      where: { id },
      data: { favorite },
      include: trackInclude,
    });
    return toTrackView(track);
  }

  // Archiving is refused while the track is favorited or in a playlist. The conditional update
  // checks both in the same statement, so a concurrent favorite or playlist add cannot slip past.
  async setArchived(id: number, archived: boolean): Promise<TrackView> {
    const existing = await this.prisma.track.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Track not found');
    if (archived) {
      const result = await this.prisma.track.updateMany({
        where: { id, favorite: false, playlistLinks: { none: {} } },
        data: { archived: true },
      });
      if (result.count === 0) {
        throw new ConflictException({
          code: 'TRACK_IN_USE',
          message: 'A track that is favorited or in a playlist cannot be archived',
        });
      }
    } else {
      await this.prisma.track.update({ where: { id }, data: { archived: false } });
    }
    return this.get(id);
  }

  async audioPathOf(id: number): Promise<string> {
    const track = await this.prisma.track.findUnique({ where: { id }, select: { audioPath: true } });
    if (!track) throw new NotFoundException('Track not found');
    if (!track.audioPath) throw new NotFoundException('This track has no audio file');
    const absolute = absoluteAudioPath(track.audioPath);
    if (!(await fileExists(absolute))) {
      throw new NotFoundException({ code: 'AUDIO_MISSING', message: 'The audio file is missing' });
    }
    return absolute;
  }

  private async resolveReferences(db: Db, input: TrackMetadataDto) {
    const personIds = [
      ...new Set([...input.composerIds, ...input.artistIds, ...(input.lyricistIds ?? []), ...(input.actorIds ?? [])]),
    ];
    const language = await db.language.findUnique({ where: { id: input.languageId } });
    if (!language) throw new UnprocessableEntityException('Unknown language');
    const found = await db.person.findMany({ where: { id: { in: personIds } }, select: { id: true } });
    if (found.length !== personIds.length) {
      throw new UnprocessableEntityException('One or more selected people do not exist');
    }
    return language;
  }

  private async assertNoDuplicate(
    db: Db,
    input: TrackMetadataDto,
    normalizedAlbum: string,
    normalizedTrack: string,
    excludeId: number | null,
  ): Promise<void> {
    const matches = await db.track.findMany({
      where: {
        year: input.year,
        normalizedTrackName: normalizedTrack,
        album: { normalizedName: normalizedAlbum },
        ...(excludeId !== null ? { id: { not: excludeId } } : {}),
      },
      include: trackInclude,
      orderBy: { id: 'asc' },
    });
    if (matches.length > 0) {
      throw new ConflictException({
        code: 'DUPLICATE_TRACK',
        message:
          'A track with the same year, album, and track name already exists. Change the track name so it is unique, or cancel.',
        details: { matches: matches.map(toTrackView) },
      });
    }
  }

  private async assertPathAvailable(db: Db, audioPath: string, excludeId: number | null): Promise<void> {
    const clash = await db.track.findFirst({
      where: { audioPath, ...(excludeId !== null ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (clash || (await fileExists(absoluteAudioPath(audioPath)))) {
      throw new ConflictException({
        code: 'DUPLICATE_PATH',
        message:
          'This audio file path is already used by another track. Change the track name so the file is unique, or cancel.',
      });
    }
  }

  private async findOrCreateAlbum(db: Db, name: string, normalizedName: string, year: number) {
    return db.album.upsert({
      where: { normalizedName_year: { normalizedName, year } },
      update: {},
      create: { name, normalizedName, year },
    });
  }

  private async linkRoles(db: Db, input: TrackMetadataDto): Promise<void> {
    await db.personRoleLink.createMany({
      data: personLinks(input).map(({ personId, role }) => ({ personId, role })),
      skipDuplicates: true,
    });
  }
}

async function setAlbumArtwork(
  db: Db,
  albumId: number,
  artwork: { mimeType: string; data: Buffer<ArrayBuffer> },
): Promise<void> {
  await db.albumArtwork.upsert({
    where: { albumId },
    create: { albumId, ...artwork },
    update: artwork,
  });
}

// Art follows the last track when its album is emptied by a move.
async function moveAlbumArtworkIfEmptied(db: Db, fromAlbumId: number, toAlbumId: number): Promise<void> {
  const remaining = await db.track.count({ where: { albumId: fromAlbumId } });
  if (remaining > 0) return;
  const source = await db.albumArtwork.findUnique({ where: { albumId: fromAlbumId } });
  if (!source) return;
  const target = await db.albumArtwork.findUnique({ where: { albumId: toAlbumId }, select: { albumId: true } });
  if (!target) {
    await db.albumArtwork.create({ data: { albumId: toAlbumId, mimeType: source.mimeType, data: source.data } });
  }
}

// An album with no tracks has no use for its art, and the track relation would otherwise keep it.
async function deleteAlbumIfEmpty(db: Db, albumId: number): Promise<void> {
  const remaining = await db.track.count({ where: { albumId } });
  if (remaining === 0) await db.album.delete({ where: { id: albumId } });
}

function audioExtensionOf(file: Express.Multer.File): string {
  const extension = extname(file.originalname).slice(1).toLowerCase();
  if (!isAllowedAudioExtension(extension)) {
    throw new UnprocessableEntityException('Unsupported audio format. Allowed: mp3, m4a, opus');
  }
  return extension;
}

function audioPathFor(
  input: TrackMetadataDto,
  languageName: string,
  albumName: string,
  extension: string,
): string {
  try {
    return buildRelativeAudioPath({
      type: input.type,
      language: languageName,
      year: input.year,
      album: albumName,
      trackName: input.trackName,
      extension,
    });
  } catch {
    throw new UnprocessableEntityException('Album and track name must contain letters or numbers');
  }
}

function personLinks(input: TrackMetadataDto): PersonLink[] {
  const groups: [PersonRole, number[]][] = [
    ['composer', input.composerIds],
    ['artist', input.artistIds],
    ['lyricist', input.lyricistIds ?? []],
    ['actor', input.actorIds ?? []],
  ];
  return groups.flatMap(([role, ids]) =>
    [...new Set(ids)].map((personId, position) => ({ personId, role, position })),
  );
}
