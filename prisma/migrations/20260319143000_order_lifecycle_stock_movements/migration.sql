-- Add lifecycle codes to statuses
ALTER TABLE "PaymentStatus"
ADD COLUMN "code" TEXT,
ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "OrderStatus"
ADD COLUMN "code" TEXT,
ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "PaymentStatus_code_key" ON "PaymentStatus"("code");
CREATE UNIQUE INDEX "OrderStatus_code_key" ON "OrderStatus"("code");

-- Stock movements for reserve/release traceability
CREATE TABLE "ProductStockMovement" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "createdByUserId" INTEGER,
    "type" TEXT NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "beforeQuantity" INTEGER NOT NULL,
    "afterQuantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductStockMovement_productId_idx" ON "ProductStockMovement"("productId");
CREATE INDEX "ProductStockMovement_orderId_idx" ON "ProductStockMovement"("orderId");
CREATE INDEX "ProductStockMovement_createdByUserId_idx" ON "ProductStockMovement"("createdByUserId");
CREATE INDEX "ProductStockMovement_type_idx" ON "ProductStockMovement"("type");
CREATE INDEX "ProductStockMovement_createdAt_idx" ON "ProductStockMovement"("createdAt");

ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
