import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Put } from '@nestjs/common';
import { AddPlaylistTrackDto, AddPlaylistTracksDto, PlaylistNameDto, ReorderPlaylistDto } from './playlists.dto.js';
import { PlaylistsService } from './playlists.service.js';

@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlists: PlaylistsService) {}

  @Get()
  list() {
    return this.playlists.list();
  }

  @Post()
  create(@Body() body: PlaylistNameDto) {
    return this.playlists.create(body.name);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.playlists.detail(id);
  }

  @Patch(':id')
  rename(@Param('id', ParseIntPipe) id: number, @Body() body: PlaylistNameDto) {
    return this.playlists.rename(id, body.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.playlists.remove(id);
  }

  @Post(':id/tracks')
  addTrack(@Param('id', ParseIntPipe) id: number, @Body() body: AddPlaylistTrackDto) {
    return this.playlists.addTrack(id, body.trackId);
  }

  @Post(':id/tracks/bulk')
  addTracks(@Param('id', ParseIntPipe) id: number, @Body() body: AddPlaylistTracksDto) {
    return this.playlists.addTracks(id, body.trackIds);
  }

  @Delete(':id/tracks/:trackId')
  removeTrack(@Param('id', ParseIntPipe) id: number, @Param('trackId', ParseIntPipe) trackId: number) {
    return this.playlists.removeTrack(id, trackId);
  }

  @Put(':id/order')
  reorder(@Param('id', ParseIntPipe) id: number, @Body() body: ReorderPlaylistDto) {
    return this.playlists.reorder(id, body.trackIds);
  }
}
