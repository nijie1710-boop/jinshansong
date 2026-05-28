-- CreateTable
CREATE TABLE "store_delivery_provider_configs" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerShopId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "serviceCode" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_delivery_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_delivery_provider_configs_provider_idx" ON "store_delivery_provider_configs"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "store_delivery_provider_configs_storeId_provider_key" ON "store_delivery_provider_configs"("storeId", "provider");

-- AddForeignKey
ALTER TABLE "store_delivery_provider_configs" ADD CONSTRAINT "store_delivery_provider_configs_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
