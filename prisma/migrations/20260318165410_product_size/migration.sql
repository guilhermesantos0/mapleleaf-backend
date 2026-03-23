/*
  Warnings:

  - You are about to drop the column `size` on the `bag_details` table. All the data in the column will be lost.
  - Added the required column `size` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProductSize" AS ENUM ('MINI', 'SMALL', 'MEDIUM', 'LARGE');

-- AlterTable
ALTER TABLE "bag_details" DROP COLUMN "size";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "size" "ProductSize" NOT NULL;

-- DropEnum
DROP TYPE "BagSize";
