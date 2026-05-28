-- Add merchant onboarding qualification images.
ALTER TABLE "store_applications"
ADD COLUMN "businessLicenseImageUrl" TEXT,
ADD COLUMN "storefrontImageUrl" TEXT;

-- Track uploaded files so local storage can later be replaced with COS/OSS
-- without changing product and application records.
CREATE TABLE "upload_assets" (
    "id" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT,
    "scene" TEXT NOT NULL,
    "storageDriver" TEXT NOT NULL DEFAULT 'LOCAL',
    "bucket" TEXT,
    "objectKey" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_assets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "upload_assets_ownerType_ownerId_idx" ON "upload_assets"("ownerType", "ownerId");
CREATE INDEX "upload_assets_scene_idx" ON "upload_assets"("scene");
CREATE INDEX "upload_assets_status_idx" ON "upload_assets"("status");
