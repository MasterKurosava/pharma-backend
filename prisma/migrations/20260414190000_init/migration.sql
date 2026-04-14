-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PaymentStatusCode" AS ENUM ('UNPAID', 'PREPAID_50', 'PAID');

-- CreateEnum
CREATE TYPE "ProductAvailabilityStatus" AS ENUM ('OUT_OF_STOCK', 'ON_REQUEST', 'IN_STOCK');

-- CreateEnum
CREATE TYPE "OrderStatusType" AS ENUM ('ACTION', 'STATE', 'ASSEMBLY');

-- CreateEnum
CREATE TYPE "OrderTableGroup" AS ENUM ('REQUESTS', 'PICKUP', 'ALMATY_DELIVERY', 'RK_DELIVERY', 'ARCHIVE');

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "allowedRoutes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedOrderTableGroups" "OrderTableGroup"[] DEFAULT ARRAY[]::"OrderTableGroup"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "login" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "name" TEXT,
    "roleId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manufacturer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveSubstance" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActiveSubstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOrderSource" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOrderSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "manufacturerId" INTEGER NOT NULL,
    "activeSubstanceId" INTEGER NOT NULL,
    "availabilityStatus" "ProductAvailabilityStatus" NOT NULL DEFAULT 'IN_STOCK',
    "productOrderSourceId" INTEGER,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "StoragePlace" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoragePlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusConfig" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "type" "OrderStatusType" NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "tableGroup" "OrderTableGroup",
    "reserveOnSet" BOOLEAN NOT NULL DEFAULT false,
    "writeOffOnSet" BOOLEAN NOT NULL DEFAULT false,
    "setAssemblyDateOnSet" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderStatusConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssemblyStatus" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssemblyStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientPhone" TEXT NOT NULL,
    "clientFullName" TEXT,
    "city" TEXT,
    "address" TEXT,
    "deliveryPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "itemsTotalPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatusCode" NOT NULL DEFAULT 'UNPAID',
    "prepaymentDate" TIMESTAMP(3),
    "paymentDate" TIMESTAMP(3),
    "assemblyDate" TIMESTAMP(3),
    "actionStatusCode" TEXT NOT NULL,
    "stateStatusCode" TEXT NOT NULL,
    "assemblyStatusCode" TEXT,
    "storagePlaceId" INTEGER,
    "orderStorage" TEXT,
    "description" TEXT,
    "productId" INTEGER NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "productStatusNameSnapshot" TEXT NOT NULL,
    "orderSourceNameSnapshot" TEXT,
    "manufacturerNameSnapshot" TEXT NOT NULL,
    "activeSubstanceNameSnapshot" TEXT NOT NULL,
    "productPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "Product_manufacturerId_idx" ON "Product"("manufacturerId");

-- CreateIndex
CREATE INDEX "Product_activeSubstanceId_idx" ON "Product"("activeSubstanceId");

-- CreateIndex
CREATE INDEX "Product_productOrderSourceId_idx" ON "Product"("productOrderSourceId");

-- CreateIndex
CREATE INDEX "ProductStockMovement_productId_idx" ON "ProductStockMovement"("productId");

-- CreateIndex
CREATE INDEX "ProductStockMovement_orderId_idx" ON "ProductStockMovement"("orderId");

-- CreateIndex
CREATE INDEX "ProductStockMovement_createdByUserId_idx" ON "ProductStockMovement"("createdByUserId");

-- CreateIndex
CREATE INDEX "ProductStockMovement_type_idx" ON "ProductStockMovement"("type");

-- CreateIndex
CREATE INDEX "ProductStockMovement_createdAt_idx" ON "ProductStockMovement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderStatusConfig_code_key" ON "OrderStatusConfig"("code");

-- CreateIndex
CREATE INDEX "OrderStatusConfig_type_isActive_idx" ON "OrderStatusConfig"("type", "isActive");

-- CreateIndex
CREATE INDEX "OrderStatusConfig_tableGroup_isActive_idx" ON "OrderStatusConfig"("tableGroup", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AssemblyStatus_code_key" ON "AssemblyStatus"("code");

-- CreateIndex
CREATE INDEX "AssemblyStatus_isActive_sortOrder_idx" ON "AssemblyStatus"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "Order_city_idx" ON "Order"("city");

-- CreateIndex
CREATE INDEX "Order_storagePlaceId_idx" ON "Order"("storagePlaceId");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_actionStatusCode_idx" ON "Order"("actionStatusCode");

-- CreateIndex
CREATE INDEX "Order_stateStatusCode_idx" ON "Order"("stateStatusCode");

-- CreateIndex
CREATE INDEX "Order_assemblyStatusCode_idx" ON "Order"("assemblyStatusCode");

-- CreateIndex
CREATE INDEX "Order_productId_idx" ON "Order"("productId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_activeSubstanceId_fkey" FOREIGN KEY ("activeSubstanceId") REFERENCES "ActiveSubstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_productOrderSourceId_fkey" FOREIGN KEY ("productOrderSourceId") REFERENCES "ProductOrderSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_actionStatusCode_fkey" FOREIGN KEY ("actionStatusCode") REFERENCES "OrderStatusConfig"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_stateStatusCode_fkey" FOREIGN KEY ("stateStatusCode") REFERENCES "OrderStatusConfig"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assemblyStatusCode_fkey" FOREIGN KEY ("assemblyStatusCode") REFERENCES "AssemblyStatus"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storagePlaceId_fkey" FOREIGN KEY ("storagePlaceId") REFERENCES "StoragePlace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

