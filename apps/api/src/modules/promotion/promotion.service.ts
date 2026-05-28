import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class PromotionService {
  constructor(private readonly prisma: PrismaService) {}

  listPromotionConfigs() {
    return this.prisma.promotionConfig.findMany({
      orderBy: [{ type: "asc" }, { code: "asc" }]
    });
  }

  updatePromotionConfig(
    code: string,
    data: { enabled?: boolean; config?: Prisma.InputJsonValue; startsAt?: string | null; endsAt?: string | null }
  ) {
    return this.prisma.promotionConfig.update({
      where: { code },
      data: {
        enabled: data.enabled,
        config: data.config,
        startsAt: data.startsAt ? new Date(data.startsAt) : data.startsAt,
        endsAt: data.endsAt ? new Date(data.endsAt) : data.endsAt
      }
    });
  }
}
