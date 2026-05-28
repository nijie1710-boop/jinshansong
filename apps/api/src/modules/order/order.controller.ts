import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OrderService } from "./order.service";

@Controller()
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly authService: AuthService
  ) {}

  @Post("orders/quote")
  quote(
    @Body()
    body: {
      addressId?: string;
      items: { skuId: string; quantity?: number }[];
      riderNo?: string;
      promoterCode?: string;
    },
    @Headers("x-user-token") userToken?: string
  ) {
    return this.orderService.quote(body, userToken);
  }

  @Post("orders")
  createOrder(
    @Body()
    body: {
      addressId?: string;
      items: { skuId: string; quantity?: number }[];
      riderNo?: string;
      promoterCode?: string;
    },
    @Headers("x-user-token") userToken?: string
  ) {
    return this.orderService.createOrder(body, userToken);
  }

  @Get("orders/my")
  listUserOrders(@Headers("x-user-token") userToken?: string) {
    return this.orderService.listUserOrders(userToken);
  }

  @Get("admin/orders/:id")
  async getAdminOrder(@Param("id") id: string, @Headers("x-admin-token") adminToken?: string) {
    await this.authService.assertAdmin(adminToken);
    return this.orderService.getOrder(id);
  }

  @Get("orders/:id")
  getOrder(@Param("id") id: string, @Headers("x-user-token") userToken?: string) {
    return this.orderService.getUserOrder(id, userToken);
  }

  @Get("merchant/orders/pending")
  async listMerchantPendingOrders(
    @Headers("x-merchant-token") merchantToken?: string,
    @Headers("x-store-code") storeCode?: string
  ) {
    const resolvedStoreCode = await this.authService.resolveMerchantStoreCode(
      merchantToken,
      storeCode
    );
    return this.orderService.listMerchantPendingOrders(resolvedStoreCode);
  }

  @Get("merchant/orders")
  async listMerchantOrders(
    @Headers("x-merchant-token") merchantToken?: string,
    @Headers("x-store-code") storeCode?: string
  ) {
    const resolvedStoreCode = await this.authService.resolveMerchantStoreCode(
      merchantToken,
      storeCode
    );
    return this.orderService.listMerchantOrders(resolvedStoreCode);
  }

  @Get("merchant/stats")
  async merchantStats(
    @Headers("x-merchant-token") merchantToken?: string,
    @Headers("x-store-code") storeCode?: string
  ) {
    const resolvedStoreCode = await this.authService.resolveMerchantStoreCode(
      merchantToken,
      storeCode
    );
    return this.orderService.merchantStats(resolvedStoreCode);
  }

  @Get("merchant/reconciliation")
  async merchantReconciliation(
    @Headers("x-merchant-token") merchantToken?: string,
    @Headers("x-store-code") storeCode?: string
  ) {
    const resolvedStoreCode = await this.authService.resolveMerchantStoreCode(
      merchantToken,
      storeCode
    );
    return this.orderService.merchantReconciliation(resolvedStoreCode);
  }

  @Get("merchant/orders/:id")
  async getMerchantOrder(
    @Param("id") id: string,
    @Headers("x-merchant-token") merchantToken?: string,
    @Headers("x-store-code") storeCode?: string
  ) {
    const resolvedStoreCode = await this.authService.resolveMerchantStoreCode(
      merchantToken,
      storeCode
    );
    return this.orderService.getMerchantOrder(id, resolvedStoreCode);
  }

  @Post("merchant/orders/:id/actions/:action")
  async merchantAction(
    @Param("id") id: string,
    @Param("action") action: "accept" | "reject" | "ready" | "pickup" | "complete",
    @Headers("x-merchant-token") merchantToken?: string,
    @Headers("x-store-code") storeCode?: string
  ) {
    const resolvedStoreCode = await this.authService.resolveMerchantStoreCode(
      merchantToken,
      storeCode
    );
    return this.orderService.merchantAction(id, action, resolvedStoreCode);
  }

  @Post("merchant/orders/:id/delivery/retry")
  async retryMerchantDelivery(
    @Param("id") id: string,
    @Headers("x-merchant-token") merchantToken?: string,
    @Headers("x-store-code") storeCode?: string
  ) {
    const resolvedStoreCode = await this.authService.resolveMerchantStoreCode(
      merchantToken,
      storeCode
    );
    return this.orderService.retryMerchantDelivery(id, resolvedStoreCode);
  }

  @Get("admin/orders")
  async listAdminOrders(@Headers("x-admin-token") adminToken?: string) {
    await this.authService.assertAdmin(adminToken);
    return this.orderService.listAdminOrders();
  }

  @Get("admin/dashboard")
  async dashboard(@Headers("x-admin-token") adminToken?: string) {
    await this.authService.assertAdmin(adminToken);
    return this.orderService.dashboard();
  }
}
