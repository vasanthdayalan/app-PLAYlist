-- AlterTable
ALTER TABLE "tracks" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "tracks_archived_idx" ON "tracks"("archived");
