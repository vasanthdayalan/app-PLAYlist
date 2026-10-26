import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminGuard } from '../auth/admin.guard.js';
import { ARTWORK_MAX_BYTES } from './album-artwork.js';
import { AlbumsService } from './albums.service.js';

@Controller('albums')
export class AlbumsController {
  constructor(private readonly albums: AlbumsService) {}

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number, @Query('includeArchived') includeArchived?: string) {
    return this.albums.detail(id, includeArchived === 'true');
  }

  @Post(':id/artwork')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: ARTWORK_MAX_BYTES } }))
  @HttpCode(204)
  async replaceArtwork(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<void> {
    if (!file) throw new BadRequestException('Choose an image to upload');
    await this.albums.replaceArtwork(id, file.buffer);
  }
}
