import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DeliveryModule } from "../delivery/delivery.module";
import { RiskModule } from "../risk/risk.module";
import { UserModule } from "../user/user.module";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";

@Module({
  imports: [UserModule, RiskModule, AuthModule, DeliveryModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService]
})
export class OrderModule {}
