import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AlbumsController } from './albums.controller.js';
import { AlbumsService } from './albums.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AlbumsController],
  providers: [AlbumsService],
})
export class AlbumsModule {}
