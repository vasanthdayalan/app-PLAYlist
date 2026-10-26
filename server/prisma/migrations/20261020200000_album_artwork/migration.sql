-- CreateTable
CREATE TABLE "album_artwork" (
    "album_id" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "album_artwork_pkey" PRIMARY KEY ("album_id")
);

-- AddForeignKey
ALTER TABLE "album_artwork" ADD CONSTRAINT "album_artwork_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry existing covers over: each album keeps the art of its lowest-ID track that had art.
INSERT INTO "album_artwork" ("album_id", "mime_type", "data")
SELECT DISTINCT ON (t."album_id") t."album_id", a."mime_type", a."data"
FROM "track_artwork" a
JOIN "tracks" t ON t."id" = a."track_id"
ORDER BY t."album_id", t."id";

-- DropTable
DROP TABLE "track_artwork";
