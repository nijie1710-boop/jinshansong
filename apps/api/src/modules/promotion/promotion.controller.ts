import { Body, Controller, Get, Headers, Param, Patch } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuthService } from "../auth/auth.service";
import { PromotionService } from "./promotion.service";

@Controller("admin/promotions")
export class PromotionController {
  constructor(
    private readonly promotionService: PromotionService,
    private readonly authService: AuthService
  ) {}

  @Get()
  async listPromotionConfigs(@Headers("x-admin-token") adminToken?: string) {
    await this.authService.assertAdmin(adminToken);
    return this.promotionService.listPromotionConfigs();
  }

  @Patch(":code")
  async updatePromotionConfig(
    @Param("code") code: string,
    @Body()
    body: {
      enabled?: boolean;
      config?: Prisma.InputJsonValue;
      startsAt?: string | null;
      endsAt?: string | null;
    },
    @Headers("x-admin-token") adminToken?: string
  ) {
    await this.authService.assertAdmin(adminToken);
    return this.promotionService.updatePromotionConfig(code, body);
  }
}
