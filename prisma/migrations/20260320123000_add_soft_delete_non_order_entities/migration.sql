ALTER TABLE "ClientStatus" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "ProductStatus" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "ProductOrderSource" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "PaymentStatus" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "AssemblyStatus" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "OrderStatus" ADD COLUMN "deletedAt" TIMESTAMP(3);
