import { Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OrderService } from "../order/order.service";

@Controller("admin/finance")
export class FinanceController {
  constructor(
    private readonly orderService: OrderService,
    private readonly authService: AuthService
  ) {}

  @Get("summary")
  async summary(@Headers("x-admin-token") adminToken?: string) {
    await this.authService.assertAdmin(adminToken);
    return this.orderService.financeSummary();
  }

  @Get("settlements")
  async settlements(@Headers("x-admin-token") adminToken?: string) {
    await this.authService.assertAdmin(adminToken);
    return this.orderService.settlementPreview();
  }

  @Get("settlement-requests")
  async settlementRequests(@Headers("x-admin-token") adminToken?: string) {
    await this.authService.assertAdmin(adminToken);
    return this.orderService.adminSettlementRequests();
  }

  @Post("settlement-requests/:id/:action")
  async settlementAction(
    @Param("id") id: string,
    @Param("action") action: "confirm" | "cancel" | "mark-paid",
    @Headers("x-admin-token") adminToken?: string
  ) {
    const admin = await this.authService.assertAdmin(adminToken);
    return this.orderService.adminSettlementAction(id, action, { adminId: admin.id });
  }
}
