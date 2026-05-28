import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { OrderService } from "../order/order.service";

@Injectable()
export class JobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly intervalMs = Math.max(
    0,
    Number(process.env.JOB_STORE_TIMEOUT_INTERVAL_MS ?? 30_000)
  );

  constructor(private readonly orderService: OrderService) {}

  onModuleInit() {
    if (this.intervalMs <= 0) {
      this.logger.log("门店超时转单轮询已关闭");
      return;
    }

    this.logger.log(`门店超时转单轮询已启动，间隔 ${this.intervalMs}ms`);
    this.timer = setInterval(() => {
      void this.processStoreTimeouts();
    }, this.intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async processStoreTimeouts() {
    if (this.running) {
      return { skipped: true, processed: 0, orders: [] };
    }

    this.running = true;
    try {
      const result = await this.orderService.processStoreAcceptTimeouts();
      if (result.processed > 0) {
        this.logger.log(`已处理 ${result.processed} 笔门店超时订单`);
      }
      return result;
    } catch (error) {
      this.logger.error("处理门店超时转单失败", error instanceof Error ? error.stack : undefined);
      throw error;
    } finally {
      this.running = false;
    }
  }
}
