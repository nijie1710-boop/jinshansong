import { Module } from "@nestjs/common";
import { PaymentModule } from "../payment/payment.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [PaymentModule],
  controllers: [HealthController]
})
export class HealthModule {}
