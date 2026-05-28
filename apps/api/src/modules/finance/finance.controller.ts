import { Controller, Get, Headers } from "@nestjs/common";
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
}
