import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { AddressModule } from "./modules/address/address.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CategoryModule } from "./modules/category/category.module";
import { CommissionModule } from "./modules/commission/commission.module";
import { ConfigModule as BusinessConfigModule } from "./modules/config/config.module";
import { CouponModule } from "./modules/coupon/coupon.module";
import { DeliveryModule } from "./modules/delivery/delivery.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { HealthModule } from "./modules/health/health.module";
import { JobModule } from "./modules/job/job.module";
import { OrderModule } from "./modules/order/order.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { ProductModule } from "./modules/product/product.module";
import { PromotionModule } from "./modules/promotion/promotion.module";
import { RiskModule } from "./modules/risk/risk.module";
import { SettlementModule } from "./modules/settlement/settlement.module";
import { StoreModule } from "./modules/store/store.module";
import { UploadModule } from "./modules/upload/upload.module";
import { UserModule } from "./modules/user/user.module";
import { PrismaModule } from "./infra/prisma/prisma.module";
import { RedisModule } from "./infra/redis/redis.module";

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"]
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    AddressModule,
    CouponModule,
    DeliveryModule,
    CategoryModule,
    ProductModule,
    StoreModule,
    OrderModule,
    PaymentModule,
    PromotionModule,
    UploadModule,
    CommissionModule,
    SettlementModule,
    FinanceModule,
    HealthModule,
    RiskModule,
    BusinessConfigModule,
    JobModule
  ]
})
export class AppModule {}
