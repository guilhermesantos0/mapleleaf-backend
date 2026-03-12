/*
  Warnings:

  - You are about to drop the column `stockQuantity` on the `bags` table. All the data in the column will be lost.
  - You are about to alter the column `price` on the `bags` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `promotionPrice` on the `bags` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to drop the column `selectedColor` on the `cart_items` table. All the data in the column will be lost.
  - You are about to drop the column `totalItems` on the `carts` table. All the data in the column will be lost.
  - You are about to alter the column `unitPrice` on the `order_items` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `subtotal` on the `order_items` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to drop the column `completedBy` on the `orders` table. All the data in the column will be lost.
  - You are about to alter the column `subtotal` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `shippingCost` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `discount` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `totalAmount` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - A unique constraint covering the columns `[cartId,bagId,bagColorId]` on the table `cart_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[trackingCode]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bagColorId` to the `cart_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "cart_items_cartId_bagId_selectedColor_key";

-- DropIndex
DROP INDEX "carts_userId_key";

-- AlterTable
ALTER TABLE "bag_colors" ADD COLUMN     "stockQuantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "bags" DROP COLUMN "stockQuantity",
ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "promotionPrice" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "cart_items" DROP COLUMN "selectedColor",
ADD COLUMN     "bagColorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "carts" DROP COLUMN "totalItems";

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "completedBy",
ADD COLUMN     "completedById" TEXT,
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "shippingCost" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "trackingCode" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_bagId_bagColorId_key" ON "cart_items"("cartId", "bagId", "bagColorId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_trackingCode_key" ON "orders"("trackingCode");

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_bagColorId_fkey" FOREIGN KEY ("bagColorId") REFERENCES "bag_colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
