import { Body, Controller, Headers, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthService } from "../auth/auth.service";
import { UploadService } from "./upload.service";

type ImageFile = {
  originalname?: string;
  mimetype?: string;
  buffer?: Buffer;
  size?: number;
};

@Controller()
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly authService: AuthService
  ) {}

  @Post("auth/merchant/uploads/images")
  uploadApplicationImage(
    @Body() body: { fileName?: string; dataUrl?: string; scene?: string; ownerPhone?: string }
  ) {
    return this.uploadService.saveImageDataUrl(body, {
      ownerType: "STORE_APPLICATION",
      ownerId: body.ownerPhone?.trim() || null
    });
  }

  @Post("auth/merchant/uploads/images/file")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 8 * 1024 * 1024 } }))
  uploadApplicationImageFile(
    @UploadedFile() file: ImageFile | undefined,
    @Body() body: { scene?: string; ownerPhone?: string }
  ) {
    return this.uploadService.saveImageFile(file, {
      ownerType: "STORE_APPLICATION",
      ownerId: body.ownerPhone?.trim() || null,
      scene: body.scene
    });
  }

  @Post("merchant/uploads/images")
  async uploadMerchantImage(
    @Headers("x-merchant-token") merchantToken: string | undefined,
    @Headers("x-store-code") storeCode: string | undefined,
    @Body() body: { fileName?: string; dataUrl?: string; scene?: string }
  ) {
    const resolvedStoreCode = await this.authService.resolveMerchantStoreCode(
      merchantToken,
      storeCode
    );
    return this.uploadService.saveImageDataUrl(body, {
      ownerType: "STORE",
      ownerId: resolvedStoreCode
    });
  }

  @Post("merchant/uploads/images/file")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 8 * 1024 * 1024 } }))
  async uploadMerchantImageFile(
    @Headers("x-merchant-token") merchantToken: string | undefined,
    @Headers("x-store-code") storeCode: string | undefined,
    @UploadedFile() file: ImageFile | undefined,
    @Body() body: { scene?: string }
  ) {
    const resolvedStoreCode = await this.authService.resolveMerchantStoreCode(
      merchantToken,
      storeCode
    );
    return this.uploadService.saveImageFile(file, {
      ownerType: "STORE",
      ownerId: resolvedStoreCode,
      scene: body.scene
    });
  }
}
