-- CreateEnum
CREATE TYPE "DeliveryTaskStatus" AS ENUM ('PENDING', 'DISPATCHING', 'ACCEPTED', 'READY_FOR_PICKUP', 'PICKED_UP', 'DELIVERING', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "delivery_tasks" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerOrderNo" TEXT,
    "status" "DeliveryTaskStatus" NOT NULL DEFAULT 'PENDING',
    "riderNo" TEXT,
    "riderName" TEXT,
    "riderPhone" TEXT,
    "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "distanceKm" DECIMAL(10,2),
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "callbackPayload" JSONB,
    "failReason" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "readyNotifiedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_tasks_orderId_key" ON "delivery_tasks"("orderId");

-- CreateIndex
CREATE INDEX "delivery_tasks_provider_idx" ON "delivery_tasks"("provider");

-- CreateIndex
CREATE INDEX "delivery_tasks_providerOrderNo_idx" ON "delivery_tasks"("providerOrderNo");

-- CreateIndex
CREATE INDEX "delivery_tasks_status_idx" ON "delivery_tasks"("status");

-- AddForeignKey
ALTER TABLE "delivery_tasks" ADD CONSTRAINT "delivery_tasks_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
