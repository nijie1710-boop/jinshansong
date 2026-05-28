import { Controller, Get, Headers, Post } from "@nestjs/common";
import { CouponService } from "./coupon.service";

@Controller("coupons")
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Get()
  listCoupons(@Headers("x-user-token") userToken?: string) {
    return this.couponService.listCoupons(userToken);
  }

  @Post("referral/mock-claim")
  claimReferralCoupon(@Headers("x-user-token") userToken?: string) {
    return this.couponService.claimReferralCoupon(userToken);
  }
}
