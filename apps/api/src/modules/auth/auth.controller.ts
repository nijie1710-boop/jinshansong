import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("auth/user/mock-login")
  userMockLogin() {
    return this.authService.userMockLogin();
  }

  @Post("auth/user/wechat-login")
  userWechatLogin(
    @Body() body: { code?: string; phoneCode?: string; phone?: string; nickname?: string }
  ) {
    return this.authService.userWechatLogin(body);
  }

  @Get("auth/user/me")
  userMe(@Headers("x-user-token") userToken?: string) {
    return this.authService.userMe(userToken);
  }

  @Post("auth/merchant/mock-login")
  merchantMockLogin(@Body() body: { storeCode?: string }) {
    return this.authService.merchantMockLogin(body.storeCode);
  }

  @Post("auth/merchant/wechat-login")
  merchantWechatLogin(@Body() body: { code?: string; phoneCode?: string; phone?: string }) {
    return this.authService.merchantWechatLogin(body);
  }

  @Post("auth/merchant/apply")
  merchantApply(
    @Body()
    body: {
      applicantName?: string;
      applicantPhone?: string;
      storeName?: string;
      city?: string;
      district?: string;
      address?: string;
      businessLicenseNo?: string;
      businessLicenseImageUrl?: string;
      storefrontImageUrl?: string;
      categoryNote?: string;
    }
  ) {
    return this.authService.merchantApply(body);
  }

  @Post("auth/merchant/login")
  merchantLogin(@Body() body: { phone?: string }) {
    return this.authService.merchantLogin(body);
  }

  @Get("auth/merchant/stores")
  merchantStores(@Headers("x-merchant-token") merchantToken?: string) {
    return this.authService.merchantStores(merchantToken);
  }

  @Post("auth/merchant/switch-store")
  merchantSwitchStore(
    @Headers("x-merchant-token") merchantToken: string | undefined,
    @Body() body: { storeCode?: string }
  ) {
    return this.authService.merchantSwitchStore(merchantToken, body.storeCode);
  }

  @Post("auth/merchant/application-status")
  merchantApplicationStatus(@Body() body: { phone?: string }) {
    return this.authService.merchantApplicationStatus(body.phone);
  }

  @Get("auth/merchant/me")
  merchantMe(
    @Headers("x-merchant-token") merchantToken?: string,
    @Headers("x-store-code") storeCode?: string
  ) {
    return this.authService.merchantMe(merchantToken, storeCode);
  }

  @Post("admin/auth/login")
  adminLogin(@Body() body: { account?: string; password?: string }) {
    return this.authService.adminLogin(body);
  }
}
