-- CreateTable
CREATE TABLE "backpack_details" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "backpack_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "backpack_details_productId_key" ON "backpack_details"("productId");

-- AddForeignKey
ALTER TABLE "backpack_details" ADD CONSTRAINT "backpack_details_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
