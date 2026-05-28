-- CreateEnum
CREATE TYPE "StoreApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "store_applications" (
    "id" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicantPhone" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '福州市',
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "businessLicenseNo" TEXT,
    "categoryNote" TEXT,
    "status" "StoreApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewRemark" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "storeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_applications_applicantPhone_idx" ON "store_applications"("applicantPhone");

-- CreateIndex
CREATE INDEX "store_applications_status_idx" ON "store_applications"("status");

-- CreateIndex
CREATE INDEX "store_applications_storeId_idx" ON "store_applications"("storeId");

-- AddForeignKey
ALTER TABLE "store_applications" ADD CONSTRAINT "store_applications_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
