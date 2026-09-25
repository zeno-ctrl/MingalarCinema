-- Merge Movie's separate English/Myanmar title & synopsis into single
-- fields: the site should show exactly what the admin typed, not switch
-- between two translations based on the visitor's language toggle.
-- Existing rows are backfilled from the English columns, since all current
-- (seeded) movies had their canonical title/synopsis entered there.
ALTER TABLE "Movie" ADD COLUMN "title" TEXT;
ALTER TABLE "Movie" ADD COLUMN "synopsis" TEXT;

UPDATE "Movie" SET "title" = "titleEn", "synopsis" = "synopsisEn";

ALTER TABLE "Movie" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "Movie" ALTER COLUMN "synopsis" SET NOT NULL;

ALTER TABLE "Movie" DROP COLUMN "titleEn";
ALTER TABLE "Movie" DROP COLUMN "titleMm";
ALTER TABLE "Movie" DROP COLUMN "synopsisEn";
ALTER TABLE "Movie" DROP COLUMN "synopsisMm";
