import { Controller, Get, Query } from '@nestjs/common';
import { ItunesQueryDto } from './itunes.dto.js';
import { ItunesService } from './itunes.service.js';

@Controller('itunes')
export class ItunesController {
  constructor(private readonly itunes: ItunesService) {}

  @Get('search')
  search(@Query() query: ItunesQueryDto) {
    return this.itunes.searchTop(query);
  }
}
