import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";

function jsonRecord(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

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

  async publicConfig() {
    const serviceArea = await this.prisma.systemConfig.findUnique({
      where: { key: "service_area" }
    });
    const serviceAreaValue = jsonRecord(serviceArea?.value);

    return {
      serviceArea: {
        city: typeof serviceAreaValue.city === "string" ? serviceAreaValue.city : "福州市",
        enabledDistricts: Array.isArray(serviceAreaValue.enabledDistricts)
          ? serviceAreaValue.enabledDistricts.filter(
              (item): item is string => typeof item === "string"
            )
          : ["鼓楼区", "台江区", "仓山区", "晋安区", "马尾区", "长乐区"],
        note:
          typeof serviceAreaValue.note === "string"
            ? serviceAreaValue.note
            : "第一阶段 MVP 服务范围，超出范围的地址不允许下单"
      }
    };
  }
}
