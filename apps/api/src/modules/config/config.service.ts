import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class ConfigService {
  constructor(private readonly prisma: PrismaService) {}

  listSystemConfigs() {
    return this.prisma.systemConfig.findMany({
      orderBy: { key: "asc" }
    });
  }

  upsertSystemConfig(key: string, data: { value: Prisma.InputJsonValue; remark?: string }) {
    return this.prisma.systemConfig.upsert({
      where: { key },
      update: {
        value: data.value,
        remark: data.remark
      },
      create: {
        key,
        value: data.value,
        remark: data.remark
      }
    });
  }
}
