-- Drop the VIP seat tier entirely -- this cinema only sells Standard and
-- Couple seats. Any existing VIP seats are downgraded to Standard before
-- the enum value is removed (Postgres can't drop an enum value while rows
-- still reference it).
UPDATE "Seat" SET "type" = 'STANDARD' WHERE "type" = 'VIP';

CREATE TYPE "SeatType_new" AS ENUM ('STANDARD', 'COUPLE');
ALTER TABLE "Seat" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Seat" ALTER COLUMN "type" TYPE "SeatType_new" USING ("type"::text::"SeatType_new");
ALTER TABLE "Seat" ALTER COLUMN "type" SET DEFAULT 'STANDARD';
DROP TYPE "SeatType";
ALTER TYPE "SeatType_new" RENAME TO "SeatType";

-- AlterTable
ALTER TABLE "Showtime" DROP COLUMN "priceVip";
