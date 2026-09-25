-- AlterEnum
ALTER TYPE "PaymentProviderType" ADD VALUE 'CASH';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'CASHIER';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "guestName" TEXT;
