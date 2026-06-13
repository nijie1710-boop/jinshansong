import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  StoreApplicationStatus,
  StoreStatus,
  type StoreDeliveryProviderConfig
} from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";

const deliveryProviderPresets = [
  {
    code: "MEITUAN",
    name: "美团配送",
    serviceCode: "4031",
    enabled: true,
    mode: "mock"
  },
  {
    code: "FENGNIAO",
    name: "蜂鸟即配",
    serviceCode: "即时配送",
    enabled: true,
    mode: "mock"
  },
  {
    code: "UU",
    name: "UU跑腿",
    serviceCode: "帮送",
    enabled: false,
    mode: "mock"
  },
  {
    code: "SF_INTRA_CITY",
    name: "顺丰同城",
    serviceCode: "同城急送",
    enabled: false,
    mode: "mock"
  }
] as const;

type DeliveryProviderRuntimeConfig = {
  code: string;
  name: string;
  serviceCode: string;
  enabled: boolean;
  mode: "mock" | "http";
  endpoint: string;
  appKey: string;
  token: string;
  secret: string;
  shopId: string;
};

type DeliveryReadinessContext = {
  enabled: boolean;
  providers: DeliveryProviderRuntimeConfig[];
};

function codePart(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(-4);
}

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  async getMerchantStore(storeCode?: string) {
    const store = await this.resolveMerchantStore(storeCode);
    const [deliveryConfigs, deliveryContext] = await Promise.all([
      this.storeDeliveryConfigs(store.id),
      this.deliveryReadinessContext()
    ]);
    return this.formatStore(store, deliveryConfigs, deliveryContext);
  }

  async updateMerchantStore(
    storeCode: string | undefined,
    dto: {
      acceptOrderSwitch?: boolean;
      autoTransferSwitch?: boolean;
      voiceReminderSwitch?: boolean;
    }
  ) {
    const store = await this.resolveMerchantStore(storeCode);
    const updated = await this.prisma.store.update({
      where: { id: store.id },
      data: {
        ...(dto.acceptOrderSwitch !== undefined
          ? { acceptOrderSwitch: Boolean(dto.acceptOrderSwitch) }
          : {}),
        ...(dto.autoTransferSwitch !== undefined
          ? { autoTransferSwitch: Boolean(dto.autoTransferSwitch) }
          : {}),
        ...(dto.voiceReminderSwitch !== undefined
          ? { voiceReminderSwitch: Boolean(dto.voiceReminderSwitch) }
          : {})
      }
    });

    const [deliveryConfigs, deliveryContext] = await Promise.all([
      this.storeDeliveryConfigs(updated.id),
      this.deliveryReadinessContext()
    ]);
    return this.formatStore(updated, deliveryConfigs, deliveryContext);
  }

  async listStores() {
    const [stores, deliveryContext] = await Promise.all([
      this.prisma.store.findMany({
        include: {
          deliveryConfigs: {
            orderBy: { provider: "asc" }
          },
          _count: {
            select: {
              currentOrders: true,
              fulfilledOrders: true,
              storeSkus: true
            }
          }
        },
        orderBy: [{ createdAt: "desc" }]
      }),
      this.deliveryReadinessContext()
    ]);

    return stores.map((store) => {
      const deliveryReadiness = this.deliveryReadiness(store.deliveryConfigs, deliveryContext);

      return {
        id: store.id,
        code: store.code,
        name: store.name,
        phone: store.phone ?? "",
        address: store.address,
        status: store.status,
        statusText:
          store.status === StoreStatus.OPEN
            ? "营业中"
            : store.status === StoreStatus.CLOSED
              ? "暂停营业"
              : "已禁用",
        acceptOrderSwitch: store.acceptOrderSwitch,
        autoTransferSwitch: store.autoTransferSwitch,
        voiceReminderSwitch: store.voiceReminderSwitch,
        weeklyOrderCount: store.weeklyOrderCount,
        weeklyCommission: Number(store.weeklyCommission),
        orderCount: store._count.currentOrders + store._count.fulfilledOrders,
        productCount: store._count.storeSkus,
        acceptRate: store.weeklyOrderCount > 0 ? "98%" : "待统计",
        deliverySummary: this.deliverySummary(deliveryReadiness),
        deliveryReadiness,
        deliveryConfigs: store.deliveryConfigs.map((config) => ({
          ...this.formatDeliveryConfig(config),
          readiness: deliveryReadiness.find((item) => item.provider === config.provider) ?? null
        })),
        createdAt: store.createdAt.toISOString()
      };
    });
  }

  async updateStoreDeliveryProvider(
    storeId: string,
    provider: string,
    dto: {
      providerShopId?: string;
      enabled?: boolean;
      serviceCode?: string;
      contactName?: string;
      contactPhone?: string;
      remark?: string;
    }
  ) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException("门店不存在");
    }

    const normalizedProvider = provider.trim().toUpperCase();
    const updated = await this.prisma.storeDeliveryProviderConfig.upsert({
      where: {
        storeId_provider: {
          storeId,
          provider: normalizedProvider
        }
      },
      update: {
        providerShopId: dto.providerShopId?.trim() || null,
        enabled: Boolean(dto.enabled),
        serviceCode: dto.serviceCode?.trim() || null,
        contactName: dto.contactName?.trim() || null,
        contactPhone: dto.contactPhone?.trim() || null,
        remark: dto.remark?.trim() || null
      },
      create: {
        storeId,
        provider: normalizedProvider,
        providerShopId: dto.providerShopId?.trim() || null,
        enabled: Boolean(dto.enabled),
        serviceCode: dto.serviceCode?.trim() || null,
        contactName: dto.contactName?.trim() || null,
        contactPhone: dto.contactPhone?.trim() || null,
        remark: dto.remark?.trim() || null
      }
    });

    return {
      id: updated.id,
      provider: updated.provider,
      providerName: this.providerName(updated.provider),
      providerShopId: updated.providerShopId ?? "",
      enabled: updated.enabled,
      serviceCode: updated.serviceCode ?? "",
      contactName: updated.contactName ?? "",
      contactPhone: updated.contactPhone ?? "",
      remark: updated.remark ?? ""
    };
  }

  async listApplications() {
    const applications = await this.prisma.storeApplication.findMany({
      include: { store: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    });

    return applications.map((application) => this.formatApplication(application));
  }

  async approveApplication(id: string, dto: { remark?: string }) {
    const application = await this.prisma.storeApplication.findUnique({
      where: { id },
      include: { store: true }
    });

    if (!application) {
      throw new NotFoundException("入驻申请不存在");
    }

    if (application.status === StoreApplicationStatus.APPROVED && application.store) {
      return this.formatApplication(application);
    }

    const store = application.store
      ? await this.prisma.store.update({
          where: { id: application.store.id },
          data: { status: StoreStatus.OPEN }
        })
      : await this.prisma.store.create({
          data: {
            code: await this.generateStoreCode(application.applicantPhone),
            name: application.storeName,
            phone: application.applicantPhone,
            address: `${application.city}${application.district}${application.address}`,
            status: StoreStatus.OPEN,
            acceptOrderSwitch: true,
            autoTransferSwitch: true,
            voiceReminderSwitch: true
          }
        });

    const approved = await this.prisma.storeApplication.update({
      where: { id },
      data: {
        status: StoreApplicationStatus.APPROVED,
        reviewRemark: dto.remark?.trim() || "审核通过，已生成门店账号",
        reviewedAt: new Date(),
        storeId: store.id
      },
      include: { store: true }
    });

    await this.prisma.merchantAccount.upsert({
      where: { phone: application.applicantPhone },
      update: {
        storeId: store.id,
        name: application.applicantName,
        status: "ACTIVE"
      },
      create: {
        storeId: store.id,
        phone: application.applicantPhone,
        name: application.applicantName,
        status: "ACTIVE"
      }
    });

    await this.ensureDefaultDeliveryProviderConfigs(store.id, {
      contactName: application.applicantName,
      contactPhone: application.applicantPhone
    });

    return this.formatApplication(approved);
  }

  async rejectApplication(id: string, dto: { remark?: string }) {
    const application = await this.prisma.storeApplication.findUnique({ where: { id } });

    if (!application) {
      throw new NotFoundException("入驻申请不存在");
    }
    if (application.status === StoreApplicationStatus.APPROVED) {
      throw new BadRequestException("已通过申请不能直接驳回");
    }

    const rejected = await this.prisma.storeApplication.update({
      where: { id },
      data: {
        status: StoreApplicationStatus.REJECTED,
        reviewRemark: dto.remark?.trim() || "资料不完整，请补充后重新提交",
        reviewedAt: new Date()
      },
      include: { store: true }
    });

    return this.formatApplication(rejected);
  }

  private async generateStoreCode(phone: string) {
    const suffix = codePart(phone) || String(Date.now()).slice(-4);

    for (let i = 0; i < 10; i += 1) {
      const code = `FZ-MERCHANT-${suffix}-${String(Date.now()).slice(-4)}${i > 0 ? i : ""}`;
      const existing = await this.prisma.store.findUnique({ where: { code } });
      if (!existing) {
        return code;
      }
    }

    return `FZ-MERCHANT-${Date.now()}`;
  }

  private async resolveMerchantStore(storeCode?: string) {
    const requestedCode = (storeCode || "").trim();

    if (!requestedCode) {
      throw new BadRequestException("请先登录已审核通过的商户门店");
    }

    const store = await this.prisma.store.findUnique({ where: { code: requestedCode } });
    if (!store) {
      throw new NotFoundException("商户门店不存在");
    }
    if (store.status === StoreStatus.DISABLED) {
      throw new BadRequestException("门店已禁用，暂不能操作");
    }

    return store;
  }

  private async ensureDefaultDeliveryProviderConfigs(
    storeId: string,
    contact: { contactName: string; contactPhone: string }
  ) {
    for (const provider of [
      { provider: "MEITUAN", serviceCode: "4031" },
      { provider: "FENGNIAO", serviceCode: "即时配送" }
    ]) {
      await this.prisma.storeDeliveryProviderConfig.upsert({
        where: {
          storeId_provider: {
            storeId,
            provider: provider.provider
          }
        },
        update: {
          contactName: contact.contactName,
          contactPhone: contact.contactPhone,
          serviceCode: provider.serviceCode
        },
        create: {
          storeId,
          provider: provider.provider,
          enabled: false,
          serviceCode: provider.serviceCode,
          contactName: contact.contactName,
          contactPhone: contact.contactPhone,
          remark: "审核通过后自动创建，需后台填写平台门店 ID 后启用"
        }
      });
    }
  }

  private storeDeliveryConfigs(storeId: string) {
    return this.prisma.storeDeliveryProviderConfig.findMany({
      where: { storeId },
      orderBy: { provider: "asc" }
    });
  }

  private async deliveryReadinessContext(): Promise<DeliveryReadinessContext> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: "delivery_aggregation" }
    });
    const value = jsonRecord(config?.value);
    const storedProviders = Array.isArray(value.providers) ? value.providers : [];

    return {
      enabled: boolFromConfig(value, "enabled", true),
      providers: deliveryProviderPresets.map((preset) => {
        const stored = storedProviders.find((item) => jsonRecord(item).code === preset.code);
        const provider = jsonRecord(stored);
        const mode = stringFromConfig(provider, "mode", preset.mode);

        return {
          code: preset.code,
          name: stringFromConfig(provider, "name", preset.name),
          serviceCode: stringFromConfig(provider, "serviceCode", preset.serviceCode),
          enabled: boolFromConfig(provider, "enabled", preset.enabled),
          mode: mode === "http" ? "http" : "mock",
          endpoint: stringFromConfig(provider, "endpoint"),
          appKey: stringFromConfig(provider, "appKey"),
          token: stringFromConfig(provider, "token"),
          secret: stringFromConfig(provider, "secret"),
          shopId: stringFromConfig(provider, "shopId")
        };
      })
    };
  }

  private deliveryReadiness(
    storeConfigs: Pick<
      StoreDeliveryProviderConfig,
      "provider" | "providerShopId" | "enabled" | "serviceCode" | "contactPhone"
    >[],
    context: DeliveryReadinessContext
  ) {
    const configs = new Map(storeConfigs.map((config) => [config.provider, config]));

    return context.providers.map((provider) => {
      const storeConfig = configs.get(provider.code);
      const storeEnabled = Boolean(storeConfig?.enabled);
      const providerShopId = storeConfig?.providerShopId?.trim() ?? "";
      const serviceCode = storeConfig?.serviceCode?.trim() || provider.serviceCode;
      const contactPhone = storeConfig?.contactPhone?.trim() ?? "";
      const missing: string[] = [];

      if (!context.enabled) missing.push("聚合配送总开关");
      if (!provider.enabled) missing.push("平台启用开关");
      if (!storeConfig) missing.push("门店配送绑定");
      if (storeConfig && !storeEnabled) missing.push("门店平台启用开关");

      if (provider.mode === "http") {
        if (!provider.appKey) missing.push("AppKey");
        if (!provider.secret && !provider.token) missing.push("Secret/Token");
        if (!providerShopId) missing.push("门店/商户ID");
        if (!contactPhone) missing.push("门店联系电话");
      }

      const readyForMock =
        context.enabled && provider.enabled && storeEnabled && provider.mode === "mock";
      const readyForHttp =
        context.enabled &&
        provider.enabled &&
        storeEnabled &&
        provider.mode === "http" &&
        missing.length === 0;
      const status = this.deliveryReadinessStatus({
        aggregationEnabled: context.enabled,
        providerEnabled: provider.enabled,
        hasStoreConfig: Boolean(storeConfig),
        storeEnabled,
        mode: provider.mode,
        readyForHttp
      });

      return {
        provider: provider.code,
        providerName: provider.name,
        mode: provider.mode,
        enabled: provider.enabled,
        storeEnabled,
        providerShopId,
        serviceCode,
        readyForMock,
        readyForHttp,
        readyForBusiness: readyForHttp,
        status,
        statusText: this.deliveryReadinessText(status),
        missing
      };
    });
  }

  private deliveryReadinessStatus(input: {
    aggregationEnabled: boolean;
    providerEnabled: boolean;
    hasStoreConfig: boolean;
    storeEnabled: boolean;
    mode: "mock" | "http";
    readyForHttp: boolean;
  }) {
    if (!input.aggregationEnabled) return "DISABLED";
    if (!input.providerEnabled) return "PROVIDER_DISABLED";
    if (!input.hasStoreConfig) return "STORE_NOT_CONFIGURED";
    if (!input.storeEnabled) return "STORE_DISABLED";
    if (input.mode === "mock") return "MOCK_READY";
    return input.readyForHttp ? "HTTP_READY" : "HTTP_INCOMPLETE";
  }

  private deliveryReadinessText(status: string) {
    const labels: Record<string, string> = {
      DISABLED: "聚合配送已关闭",
      PROVIDER_DISABLED: "平台未启用",
      STORE_NOT_CONFIGURED: "门店未绑定",
      STORE_DISABLED: "门店未启用",
      MOCK_READY: "演示配送可用",
      HTTP_READY: "正式发单可用",
      HTTP_INCOMPLETE: "正式配置不完整"
    };
    return labels[status] ?? "待检查";
  }

  private deliverySummary(readiness: ReturnType<StoreService["deliveryReadiness"]>) {
    const httpReadyCount = readiness.filter((item) => item.readyForHttp).length;
    const mockReadyCount = readiness.filter((item) => item.readyForMock).length;

    if (httpReadyCount > 0) {
      return {
        status: "READY",
        statusText: `正式配送可发单 · ${httpReadyCount} 个平台`,
        readyForBusiness: true
      };
    }

    if (mockReadyCount > 0) {
      return {
        status: "MOCK_ONLY",
        statusText: `演示配送可用 · 正式待配置`,
        readyForBusiness: false
      };
    }

    return {
      status: "NOT_READY",
      statusText: "配送未就绪",
      readyForBusiness: false
    };
  }

  private formatDeliveryConfig(config: StoreDeliveryProviderConfig) {
    return {
      id: config.id,
      provider: config.provider,
      providerName: this.providerName(config.provider),
      providerShopId: config.providerShopId ?? "",
      enabled: config.enabled,
      serviceCode: config.serviceCode ?? "",
      contactName: config.contactName ?? "",
      contactPhone: config.contactPhone ?? "",
      remark: config.remark ?? ""
    };
  }

  private formatStore(
    store: Awaited<ReturnType<StoreService["resolveMerchantStore"]>>,
    deliveryConfigs: StoreDeliveryProviderConfig[] = [],
    deliveryContext?: DeliveryReadinessContext
  ) {
    const deliveryReadiness = deliveryContext
      ? this.deliveryReadiness(deliveryConfigs, deliveryContext)
      : [];

    return {
      id: store.id,
      code: store.code,
      name: store.name,
      phone: store.phone ?? "",
      address: store.address,
      status: store.status,
      acceptOrderSwitch: store.acceptOrderSwitch,
      autoTransferSwitch: store.autoTransferSwitch,
      voiceReminderSwitch: store.voiceReminderSwitch,
      businessHours: "09:00 - 22:00",
      deliverySummary: this.deliverySummary(deliveryReadiness),
      deliveryReadiness
    };
  }

  private formatApplication(application: {
    id: string;
    applicantName: string;
    applicantPhone: string;
    storeName: string;
    city: string;
    district: string;
    address: string;
    businessLicenseNo: string | null;
    businessLicenseImageUrl?: string | null;
    storefrontImageUrl?: string | null;
    categoryNote: string | null;
    status: StoreApplicationStatus;
    reviewRemark: string | null;
    reviewedAt: Date | null;
    storeId: string | null;
    createdAt: Date;
    updatedAt: Date;
    store?: { code: string; name: string; status: StoreStatus } | null;
  }) {
    return {
      id: application.id,
      applicantName: application.applicantName,
      applicantPhone: application.applicantPhone,
      storeName: application.storeName,
      city: application.city,
      district: application.district,
      address: application.address,
      businessLicenseNo: application.businessLicenseNo ?? "",
      businessLicenseImageUrl: application.businessLicenseImageUrl ?? "",
      storefrontImageUrl: application.storefrontImageUrl ?? "",
      categoryNote: application.categoryNote ?? "",
      status: application.status,
      statusText:
        application.status === StoreApplicationStatus.APPROVED
          ? "已通过"
          : application.status === StoreApplicationStatus.REJECTED
            ? "已驳回"
            : "待审核",
      reviewRemark: application.reviewRemark ?? "",
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      storeId: application.storeId,
      storeCode: application.store?.code ?? "",
      storeStatus: application.store?.status ?? null,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString()
    };
  }

  private providerName(provider: string) {
    const labels: Record<string, string> = {
      MEITUAN: "美团配送",
      FENGNIAO: "蜂鸟即配",
      UU: "UU跑腿",
      SF_INTRA_CITY: "顺丰同城"
    };
    return labels[provider] ?? provider;
  }
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringFromConfig(config: Record<string, unknown>, key: string, fallback = "") {
  const value = config[key];
  return typeof value === "string" ? value : fallback;
}

function boolFromConfig(config: Record<string, unknown>, key: string, fallback: boolean) {
  const value = config[key];
  return typeof value === "boolean" ? value : fallback;
}
