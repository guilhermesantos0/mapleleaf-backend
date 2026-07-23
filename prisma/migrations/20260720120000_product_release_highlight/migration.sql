-- AlterTable
ALTER TABLE "products" ADD COLUMN     "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "releaseDate" TIMESTAMP(3);
