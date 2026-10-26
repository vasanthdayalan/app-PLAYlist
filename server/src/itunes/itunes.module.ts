import { Module } from '@nestjs/common';
import { ItunesController } from './itunes.controller.js';
import { ItunesService } from './itunes.service.js';

@Module({
  controllers: [ItunesController],
  providers: [ItunesService],
})
export class ItunesModule {}
