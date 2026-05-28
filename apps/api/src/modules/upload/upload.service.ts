import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { PrismaService } from "../../infra/prisma/prisma.service";

const allowedMimeTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/webp", "webp"]
]);

function apiPublicBaseUrl() {
  return (process.env.API_PUBLIC_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
}

function uploadMaxBytes() {
  const configured = Number(process.env.UPLOAD_MAX_IMAGE_MB ?? 5);
  return Math.max(1, configured) * 1024 * 1024;
}

function safeScene(scene?: string) {
  return (
    (scene || "product")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "product"
  );
}

function safeOriginalName(name?: string) {
  return (
    name
      ?.trim()
      .replace(/[^\w.\-\u4e00-\u9fa5]+/g, "_")
      .slice(0, 96) || null
  );
}

@Injectable()
export class UploadService {
  constructor(private readonly prisma: PrismaService) {}

  async saveImageDataUrl(
    dto: { fileName?: string; dataUrl?: string; scene?: string },
    context: { ownerType: string; ownerId?: string | null }
  ) {
    const dataUrl = dto.dataUrl?.trim() ?? "";
    const matched = dataUrl.match(
      /^data:(image\/png|image\/jpe?g|image\/webp);base64,([a-zA-Z0-9+/=]+)$/
    );
    if (!matched) {
      throw new BadRequestException("图片格式不正确，请上传 PNG、JPG 或 WebP 图片");
    }

    return this.saveImageBuffer(Buffer.from(matched[2], "base64"), {
      mimeType: matched[1] === "image/jpg" ? "image/jpeg" : matched[1],
      originalName: dto.fileName,
      scene: dto.scene,
      ...context
    });
  }

  async saveImageFile(
    file:
      | {
          originalname?: string;
          mimetype?: string;
          buffer?: Buffer;
          size?: number;
        }
      | undefined,
    context: { ownerType: string; ownerId?: string | null; scene?: string }
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("请选择要上传的图片");
    }

    return this.saveImageBuffer(file.buffer, {
      mimeType: file.mimetype || this.mimeTypeFromName(file.originalname),
      originalName: file.originalname,
      scene: context.scene,
      ownerType: context.ownerType,
      ownerId: context.ownerId
    });
  }

  private async saveImageBuffer(
    buffer: Buffer,
    options: {
      mimeType?: string;
      originalName?: string | null;
      scene?: string;
      ownerType: string;
      ownerId?: string | null;
    }
  ) {
    const mimeType = options.mimeType || this.mimeTypeFromName(options.originalName ?? undefined);
    const extension = allowedMimeTypes.get(mimeType);

    if (!extension) {
      throw new BadRequestException("图片格式不正确，请上传 PNG、JPG 或 WebP 图片");
    }
    if (buffer.length <= 0 || buffer.length > uploadMaxBytes()) {
      throw new BadRequestException(
        `图片大小需小于 ${Math.floor(uploadMaxBytes() / 1024 / 1024)}MB`
      );
    }

    const scene = safeScene(options.scene);
    const uploadDir = join(process.cwd(), "uploads", scene);
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
    const objectKey = `/uploads/${scene}/${fileName}`;
    writeFileSync(join(uploadDir, fileName), buffer);

    const asset = await this.prisma.uploadAsset.create({
      data: {
        ownerType: options.ownerType,
        ownerId: options.ownerId ?? null,
        scene,
        storageDriver: process.env.UPLOAD_DRIVER || "LOCAL",
        bucket: process.env.UPLOAD_BUCKET || null,
        objectKey,
        originalName: safeOriginalName(options.originalName ?? undefined),
        mimeType,
        size: buffer.length,
        url: `${apiPublicBaseUrl()}${objectKey}`
      }
    });

    return {
      id: asset.id,
      url: asset.url,
      path: asset.objectKey,
      fileName: asset.originalName || fileName,
      size: asset.size,
      scene: asset.scene,
      storageDriver: asset.storageDriver
    };
  }

  private mimeTypeFromName(fileName?: string) {
    const extension = extname(fileName || "").toLowerCase();
    if (extension === ".png") return "image/png";
    if (extension === ".webp") return "image/webp";
    return "image/jpeg";
  }
}
