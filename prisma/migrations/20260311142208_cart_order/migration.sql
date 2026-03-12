/*
  Warnings:

  - Added the required column `status` to the `carts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalItems` to the `carts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "totalItems" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cartId" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
