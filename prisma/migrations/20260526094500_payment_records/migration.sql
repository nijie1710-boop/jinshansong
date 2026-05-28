-- CreateEnum
CREATE TYPE "PaymentRecordType" AS ENUM ('PAYMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "PaymentRecordStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "payment_records" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "PaymentRecordType" NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'MOCK',
    "outTradeNo" TEXT NOT NULL,
    "transactionNo" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentRecordStatus" NOT NULL DEFAULT 'PENDING',
    "requestPayload" JSONB,
    "notifyPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_records_outTradeNo_key" ON "payment_records"("outTradeNo");

-- CreateIndex
CREATE INDEX "payment_records_orderId_idx" ON "payment_records"("orderId");

-- CreateIndex
CREATE INDEX "payment_records_type_status_idx" ON "payment_records"("type", "status");

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
