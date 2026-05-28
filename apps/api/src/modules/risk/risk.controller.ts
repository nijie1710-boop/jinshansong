import { Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { RiskService } from "./risk.service";

@Controller("admin/risk")
export class RiskController {
  constructor(
    private readonly riskService: RiskService,
    private readonly authService: AuthService
  ) {}

  @Get()
  async listAdminRiskGroups(@Headers("x-admin-token") adminToken?: string) {
    await this.authService.assertAdmin(adminToken);
    return this.riskService.listAdminRiskGroups();
  }

  @Post(":id/resolve")
  async resolveRisk(@Param("id") id: string, @Headers("x-admin-token") adminToken?: string) {
    await this.authService.assertAdmin(adminToken);
    return this.riskService.updateRiskEventStatus(id, "RESOLVED");
  }

  @Post(":id/ignore")
  async ignoreRisk(@Param("id") id: string, @Headers("x-admin-token") adminToken?: string) {
    await this.authService.assertAdmin(adminToken);
    return this.riskService.updateRiskEventStatus(id, "IGNORED");
  }
}
