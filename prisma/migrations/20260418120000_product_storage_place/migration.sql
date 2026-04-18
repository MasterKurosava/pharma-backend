-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "storagePlaceId" INTEGER;

-- CreateIndex
CREATE INDEX "Product_storagePlaceId_idx" ON "Product"("storagePlaceId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storagePlaceId_fkey" FOREIGN KEY ("storagePlaceId") REFERENCES "StoragePlace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
