-- CreateTable
CREATE TABLE "track_artwork" (
    "track_id" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "track_artwork_pkey" PRIMARY KEY ("track_id")
);

-- AddForeignKey
ALTER TABLE "track_artwork" ADD CONSTRAINT "track_artwork_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
