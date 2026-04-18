-- CreateTable
CREATE TABLE "ProductStoragePlace" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductStoragePlace_pkey" PRIMARY KEY ("id")
);

-- Copy order-storage rows referenced by products into the new table and re-link products
ALTER TABLE "Product" ADD COLUMN "productStoragePlaceId" INTEGER;

DO $$
DECLARE
  r RECORD;
  new_id INT;
BEGIN
  FOR r IN SELECT DISTINCT "storagePlaceId" AS sid FROM "Product" WHERE "storagePlaceId" IS NOT NULL
  LOOP
    INSERT INTO "ProductStoragePlace" ("name", "description", "isActive", "createdAt", "updatedAt")
    SELECT "name", "description", "isActive", "createdAt", "updatedAt"
    FROM "StoragePlace" WHERE id = r.sid
    RETURNING id INTO new_id;

    UPDATE "Product" SET "productStoragePlaceId" = new_id WHERE "storagePlaceId" = r.sid;
  END LOOP;
END $$;

DROP INDEX IF EXISTS "Product_storagePlaceId_idx";
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_storagePlaceId_fkey";
ALTER TABLE "Product" DROP COLUMN "storagePlaceId";

CREATE INDEX "Product_productStoragePlaceId_idx" ON "Product"("productStoragePlaceId");
ALTER TABLE "Product" ADD CONSTRAINT "Product_productStoragePlaceId_fkey" FOREIGN KEY ("productStoragePlaceId") REFERENCES "ProductStoragePlace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
