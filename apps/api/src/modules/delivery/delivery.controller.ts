import { Body, Controller, Headers, Param, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { DeliveryService } from "./delivery.service";

@Controller()
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly authService: AuthService
  ) {}

  @Post("admin/delivery/:orderId/dispatch")
  async dispatchOrder(
    @Param("orderId") orderId: string,
    @Headers("x-admin-token") adminToken?: string
  ) {
    const admin = await this.authService.assertAdmin(adminToken);
    return this.deliveryService.dispatchOrder(orderId, admin.id);
  }

  @Post("admin/delivery/:orderId/retry")
  async retryDispatch(
    @Param("orderId") orderId: string,
    @Headers("x-admin-token") adminToken?: string
  ) {
    const admin = await this.authService.assertAdmin(adminToken);
    return this.deliveryService.retryDispatch(orderId, admin.id);
  }

  @Post("delivery/providers/:provider/callback")
  providerCallback(
    @Param("provider") provider: string,
    @Body()
    body: {
      [key: string]: unknown;
      providerOrderNo?: string;
      orderNo?: string;
      status?: string;
      riderNo?: string;
      riderName?: string;
      riderPhone?: string;
      fee?: number;
      distanceKm?: number;
      message?: string;
    }
  ) {
    return this.deliveryService.handleProviderCallback(provider, body).then((result) => {
      if (provider.trim().toUpperCase() === "MEITUAN") {
        return { code: 0, message: "success" };
      }
      return result;
    });
  }
}
