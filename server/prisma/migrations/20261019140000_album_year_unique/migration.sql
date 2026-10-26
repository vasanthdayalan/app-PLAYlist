-- DropIndex
DROP INDEX "albums_normalized_name_idx";

-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "year" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "albums_normalized_name_year_key" ON "albums"("normalized_name", "year");
