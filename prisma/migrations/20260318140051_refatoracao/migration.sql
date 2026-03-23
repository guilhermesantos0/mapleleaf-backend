/*
  Warnings:

  - You are about to drop the column `bagColorId` on the `cart_items` table. All the data in the column will be lost.
  - You are about to drop the column `bagId` on the `cart_items` table. All the data in the column will be lost.
  - You are about to drop the column `bagColorId` on the `images` table. All the data in the column will be lost.
  - You are about to drop the column `bagId` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the `bag_colors` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bags` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[cartId,productId,productColorId]` on the table `cart_items` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productColorId` to the `cart_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `cart_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productColorId` to the `images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `order_items` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('BAG', 'WALLET', 'BACKPACK');

-- DropForeignKey
ALTER TABLE "bag_colors" DROP CONSTRAINT "bag_colors_bagId_fkey";

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_bagColorId_fkey";

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_bagId_fkey";

-- DropForeignKey
ALTER TABLE "images" DROP CONSTRAINT "images_bagColorId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_bagId_fkey";

-- DropIndex
DROP INDEX "cart_items_cartId_bagId_bagColorId_key";

-- AlterTable
ALTER TABLE "cart_items" DROP COLUMN "bagColorId",
DROP COLUMN "bagId",
ADD COLUMN     "productColorId" TEXT NOT NULL,
ADD COLUMN     "productId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "images" DROP COLUMN "bagColorId",
ADD COLUMN     "productColorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "bagId",
ADD COLUMN     "productId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerificationToken" TEXT,
ADD COLUMN     "emailVerificationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailVerificationTokenSentAt" TIMESTAMP(3),
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "bag_colors";

-- DropTable
DROP TABLE "bags";

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "modelCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "isPromotion" BOOLEAN NOT NULL DEFAULT false,
    "price" DECIMAL(10,2) NOT NULL,
    "promotionPrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bag_details" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "size" "BagSize" NOT NULL,

    CONSTRAINT "bag_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_colors" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "hexCode" TEXT,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_colors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_modelCode_key" ON "products"("modelCode");

-- CreateIndex
CREATE UNIQUE INDEX "bag_details_productId_key" ON "bag_details"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_colors_productId_colorName_key" ON "product_colors"("productId", "colorName");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_productId_productColorId_key" ON "cart_items"("cartId", "productId", "productColorId");

-- AddForeignKey
ALTER TABLE "bag_details" ADD CONSTRAINT "bag_details_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_colors" ADD CONSTRAINT "product_colors_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_productColorId_fkey" FOREIGN KEY ("productColorId") REFERENCES "product_colors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productColorId_fkey" FOREIGN KEY ("productColorId") REFERENCES "product_colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
