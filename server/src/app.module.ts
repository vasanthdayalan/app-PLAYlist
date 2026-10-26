import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AlbumsModule } from './albums/albums.module.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health/health.controller.js';
import { ItunesModule } from './itunes/itunes.module.js';
import { LanguagesModule } from './languages/languages.module.js';
import { PeopleModule } from './people/people.module.js';
import { PlaylistsModule } from './playlists/playlists.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TracksModule } from './tracks/tracks.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    LanguagesModule,
    TracksModule,
    PeopleModule,
    AlbumsModule,
    PlaylistsModule,
    ItunesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
