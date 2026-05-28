import { Controller, Get, Headers } from "@nestjs/common";
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
}
