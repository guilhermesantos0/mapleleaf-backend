/*
  Warnings:

  - The `status` column on the `carts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `trackingCode` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CHECKED_OUT');

-- AlterTable
ALTER TABLE "addresses" ALTER COLUMN "country" SET DEFAULT 'BR';

-- AlterTable
ALTER TABLE "carts" DROP COLUMN "status",
ADD COLUMN     "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "trackingCode" TEXT NOT NULL;
