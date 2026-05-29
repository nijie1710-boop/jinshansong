import { Controller, Get } from "@nestjs/common";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { RedisService } from "../../infra/redis/redis.service";
import { PaymentService } from "../payment/payment.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly paymentService: PaymentService
  ) {}

  @Get()
  async health() {
    const database = await this.checkDatabase();
    const cache = await this.checkRedis();

    return {
      ok: database.ok && cache.ok,
      service: "jinshansong-api",
      environment: process.env.NODE_ENV || "development",
      uptimeSeconds: Math.round(process.uptime()),
      runtime: {
        node: process.version
      },
      config: this.safeConfig(),
      payment: this.paymentService.runtimeStatus(),
      database,
      cache,
      upload: this.uploadStatus(),
      checkedAt: new Date().toISOString()
    };
  }

  private safeConfig() {
    return {
      wechatLoginMode: process.env.WECHAT_LOGIN_MODE || "mock",
      paymentMode: this.paymentService.runtimeStatus().mode,
      uploadDriver: process.env.UPLOAD_DRIVER || "LOCAL",
      jobStoreTimeoutIntervalMs: Number(process.env.JOB_STORE_TIMEOUT_INTERVAL_MS ?? 30000),
      apiPublicBaseUrl: this.publicUrlSummary(process.env.API_PUBLIC_BASE_URL)
    };
  }

  private uploadStatus() {
    const uploadDir = join(process.cwd(), "uploads");
    return {
      driver: process.env.UPLOAD_DRIVER || "LOCAL",
      localDirectoryExists: existsSync(uploadDir)
    };
  }

  private publicUrlSummary(value?: string) {
    if (!value) {
      return { configured: false, protocol: null, https: false };
    }

    try {
      const url = new URL(value);
      return {
        configured: true,
        protocol: url.protocol.replace(":", ""),
        https: url.protocol === "https:"
      };
    } catch {
      return { configured: true, protocol: "invalid", https: false };
    }
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "database error" };
    }
  }

  private async checkRedis() {
    try {
      const result = await this.redis.client.ping();
      return { ok: result === "PONG" };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "redis error" };
    }
  }
}
