import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { unlink } from 'node:fs/promises';
import { audioMimeType } from '../audio/audio-formats.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { ArchiveDto, FavoriteDto, TrackFilterDto, TrackMetadataDto } from './track.dto.js';
import { TrackMetadataPipe } from './track-metadata.pipe.js';
import { trackUploadOptions } from './track-upload.js';
import { TracksService } from './track.service.js';

@Controller('tracks')
export class TracksController {
  private readonly logger = new Logger(TracksController.name);

  constructor(private readonly tracks: TracksService) {}

  @Get()
  list(@Query() filter: TrackFilterDto) {
    if (filter.page) return this.tracks.listPage(filter, filter.page, filter.pageSize ?? 50);
    return this.tracks.list(filter);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.tracks.get(id);
  }

  // Typed unknown: the global ValidationPipe would otherwise validate the raw body before TrackMetadataPipe.
  @Post()
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('file', trackUploadOptions))
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('metadata', TrackMetadataPipe) metadata: unknown,
  ) {
    try {
      return await this.tracks.create(metadata as TrackMetadataDto, file ?? null);
    } finally {
      await this.discardTemp(file);
    }
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('file', trackUploadOptions))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('metadata', TrackMetadataPipe) metadata: unknown,
    @Body('removeAudio') removeAudio: string | undefined,
  ) {
    try {
      return await this.tracks.update(id, metadata as TrackMetadataDto, file ?? null, removeAudio === 'true');
    } finally {
      await this.discardTemp(file);
    }
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tracks.remove(id);
  }

  @Patch(':id/favorite')
  setFavorite(@Param('id', ParseIntPipe) id: number, @Body() body: FavoriteDto) {
    return this.tracks.setFavorite(id, body.favorite);
  }

  @Patch(':id/archive')
  @UseGuards(AdminGuard)
  setArchived(@Param('id', ParseIntPipe) id: number, @Body() body: ArchiveDto) {
    return this.tracks.setArchived(id, body.archived);
  }

  @Get(':id/audio')
  async audio(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const absolute = await this.tracks.audioPathOf(id);
    const extension = absolute.split('.').pop()?.toLowerCase() ?? '';
    res.type(audioMimeType(extension));
    res.sendFile(absolute, { acceptRanges: true, cacheControl: false }, (err) => {
      if (err && !res.headersSent) res.status(500).end();
    });
  }

  @Get(':id/art')
  async art(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const artwork = await this.tracks.artworkOf(id);
    res.type(artwork.mimeType);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(artwork.data);
  }

  // Multer keeps the temp file after a rejected request, so remove it if the service did not move it.
  private async discardTemp(file: Express.Multer.File | undefined): Promise<void> {
    if (!file?.path) return;
    await unlink(file.path).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') this.logger.warn(`Could not remove temp file: ${error.message}`);
    });
  }
}
