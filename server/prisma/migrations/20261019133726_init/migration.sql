-- CreateEnum
CREATE TYPE "track_type" AS ENUM ('movie', 'indie');

-- CreateEnum
CREATE TYPE "person_role" AS ENUM ('composer', 'artist', 'lyricist', 'actor');

-- CreateTable
CREATE TABLE "languages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "albums" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_roles" (
    "person_id" INTEGER NOT NULL,
    "role" "person_role" NOT NULL,

    CONSTRAINT "person_roles_pkey" PRIMARY KEY ("person_id","role")
);

-- CreateTable
CREATE TABLE "tracks" (
    "id" SERIAL NOT NULL,
    "type" "track_type" NOT NULL,
    "album_id" INTEGER NOT NULL,
    "language_id" INTEGER NOT NULL,
    "track_name" TEXT NOT NULL,
    "normalized_track_name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "duration_seconds" INTEGER,
    "audio_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "track_people" (
    "track_id" INTEGER NOT NULL,
    "person_id" INTEGER NOT NULL,
    "role" "person_role" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "track_people_pkey" PRIMARY KEY ("track_id","person_id","role")
);

-- CreateTable
CREATE TABLE "playlists" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlist_tracks" (
    "playlist_id" INTEGER NOT NULL,
    "track_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "playlist_tracks_pkey" PRIMARY KEY ("playlist_id","track_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "languages_name_key" ON "languages"("name");

-- CreateIndex
CREATE INDEX "albums_normalized_name_idx" ON "albums"("normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "people_normalized_name_key" ON "people"("normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_audio_path_key" ON "tracks"("audio_path");

-- CreateIndex
CREATE INDEX "tracks_normalized_track_name_idx" ON "tracks"("normalized_track_name");

-- CreateIndex
CREATE INDEX "tracks_favorite_idx" ON "tracks"("favorite");

-- CreateIndex
CREATE UNIQUE INDEX "playlist_tracks_playlist_id_position_key" ON "playlist_tracks"("playlist_id", "position");

-- AddForeignKey
ALTER TABLE "person_roles" ADD CONSTRAINT "person_roles_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_people" ADD CONSTRAINT "track_people_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_people" ADD CONSTRAINT "track_people_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
