import { Body, Controller, Get, Headers, Param, Patch } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuthService } from "../auth/auth.service";
import { ConfigService } from "./config.service";

@Controller("admin/configs")
export class ConfigController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {}

  @Get()
  async listSystemConfigs(@Headers("x-admin-token") adminToken?: string) {
    await this.authService.assertAdmin(adminToken);
    return this.configService.listSystemConfigs();
  }

  @Patch(":key")
  async updateSystemConfig(
    @Param("key") key: string,
    @Body() body: { value: Prisma.InputJsonValue; remark?: string },
    @Headers("x-admin-token") adminToken?: string
  ) {
    await this.authService.assertAdmin(adminToken);
    return this.configService.upsertSystemConfig(key, body);
  }
}
