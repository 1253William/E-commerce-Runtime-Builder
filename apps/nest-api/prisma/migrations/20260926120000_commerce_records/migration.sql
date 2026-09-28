CREATE TYPE "CommerceRecordType" AS ENUM ('SERVICE', 'APPOINTMENT', 'ORDER', 'QUOTE', 'INVENTORY', 'CUSTOMER', 'FULFILLMENT', 'SERVICE_CASE', 'PRODUCTION', 'TABLE', 'MENU_ITEM', 'SUBSCRIPTION');

CREATE TABLE "CommerceRecord" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" "CommerceRecordType" NOT NULL,
    "status" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommerceRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommerceRecord_storeId_type_status_createdAt_idx" ON "CommerceRecord"("storeId", "type", "status", "createdAt");
CREATE INDEX "CommerceRecord_merchantId_type_createdAt_idx" ON "CommerceRecord"("merchantId", "type", "createdAt");
ALTER TABLE "CommerceRecord" ADD CONSTRAINT "CommerceRecord_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommerceRecord" ADD CONSTRAINT "CommerceRecord_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
