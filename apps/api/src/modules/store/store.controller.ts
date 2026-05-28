import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { StoreService } from "./store.service";

@Controller()
export class StoreController {
  constructor(
    private readonly storeService: StoreService,
    private readonly authService: AuthService
  ) {}

  @Get("admin/stores")
  async listStores(@Headers("x-admin-token") adminToken?: string) {
    await this.authService.assertAdmin(adminToken);
    return this.storeService.listStores();
  }

  @Post("admin/stores/:id/delivery-providers/:provider")
  async updateStoreDeliveryProvider(
    @Param("id") id: string,
    @Param("provider") provider: string,
    @Body()
    body: {
      providerShopId?: string;
      enabled?: boolean;
      serviceCode?: string;
      contactName?: string;
      contactPhone?: string;
      remark?: string;
    },
    @Headers("x-admin-token") adminToken?: string
  ) {
    await this.authService.assertAdmin(adminToken);
    return this.storeService.updateStoreDeliveryProvider(id, provider, body);
  }

  @Get("merchant/store/settings")
  async getMerchantStore(
    @Headers("x-merchant-token") merchantToken?: string,
    @Headers("x-store-code") storeCode?: string
  ) {
    const resolvedStoreCode = await this.authService.resolveMerchantStoreCode(
      merchantToken,
      storeCode
    );
    return this.storeService.getMerchantStore(resolvedStoreCode);
  }

  @Post("merchant/store/settings")
  async updateMerchantStore(
    @Headers("x-merchant-token") merchantToken: string | undefined,
    @Headers("x-store-code") storeCode: string | undefined,
    @Body()
    body: {
      acceptOrderSwitch?: boolean;
      autoTransferSwitch?: boolean;
      voiceReminderSwitch?: boolean;
    }
  ) {
    const resolvedStoreCode = await this.authService.resolveMerchantStoreCode(
      merchantToken,
      storeCode
    );
    return this.storeService.updateMerchantStore(resolvedStoreCode, body);
  }

  @Get("admin/store-applications")
  async listApplications(@Headers("x-admin-token") adminToken?: string) {
    await this.authService.assertAdmin(adminToken);
    return this.storeService.listApplications();
  }

  @Post("admin/store-applications/:id/approve")
  async approveApplication(
    @Param("id") id: string,
    @Body() body: { remark?: string },
    @Headers("x-admin-token") adminToken?: string
  ) {
    await this.authService.assertAdmin(adminToken);
    return this.storeService.approveApplication(id, body);
  }

  @Post("admin/store-applications/:id/reject")
  async rejectApplication(
    @Param("id") id: string,
    @Body() body: { remark?: string },
    @Headers("x-admin-token") adminToken?: string
  ) {
    await this.authService.assertAdmin(adminToken);
    return this.storeService.rejectApplication(id, body);
  }
}
