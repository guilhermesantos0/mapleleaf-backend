/*
  Warnings:

  - The `paymentStatus` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED', 'CANCELLED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "externalPaymentId" TEXT,
ADD COLUMN     "shippingLabel" TEXT,
ADD COLUMN     "shippingServiceId" TEXT,
DROP COLUMN "paymentStatus",
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "defaultBoxHeight" DECIMAL(10,2) NOT NULL DEFAULT 20,
ADD COLUMN     "defaultBoxLength" DECIMAL(10,2) NOT NULL DEFAULT 30,
ADD COLUMN     "defaultBoxWeight" DECIMAL(10,2) NOT NULL DEFAULT 0.5,
ADD COLUMN     "defaultBoxWidth" DECIMAL(10,2) NOT NULL DEFAULT 20;
