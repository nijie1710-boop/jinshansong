import { Module } from "@nestjs/common";
import { UserModule } from "../user/user.module";
import { CouponController } from "./coupon.controller";
import { CouponService } from "./coupon.service";

@Module({
  imports: [UserModule],
  controllers: [CouponController],
  providers: [CouponService],
  exports: [CouponService]
})
export class CouponModule {}
