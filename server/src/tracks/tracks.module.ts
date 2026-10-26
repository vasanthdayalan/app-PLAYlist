import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TracksController } from './tracks.controller.js';
import { TracksService } from './track.service.js';

@Module({
  imports: [AuthModule],
  controllers: [TracksController],
  providers: [TracksService],
})
export class TracksModule {}
