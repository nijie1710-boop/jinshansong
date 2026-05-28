-- AlterTable
ALTER TABLE "orders" ADD COLUMN "inventoryReservedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "order_action_logs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus",
    "operatorType" TEXT NOT NULL,
    "operatorId" TEXT,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_action_logs_orderId_idx" ON "order_action_logs"("orderId");

-- CreateIndex
CREATE INDEX "order_action_logs_action_idx" ON "order_action_logs"("action");

-- AddForeignKey
ALTER TABLE "order_action_logs" ADD CONSTRAINT "order_action_logs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
