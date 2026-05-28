import { Module } from "@nestjs/common";
import { OrderModule } from "../order/order.module";
import { JobController } from "./job.controller";
import { JobService } from "./job.service";

@Module({
  imports: [OrderModule],
  controllers: [JobController],
  providers: [JobService]
})
export class JobModule {}
