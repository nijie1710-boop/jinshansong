import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrderModule } from "../order/order.module";
import { FinanceController } from "./finance.controller";

@Module({
  imports: [OrderModule, AuthModule],
  controllers: [FinanceController]
})
export class FinanceModule {}
