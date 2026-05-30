import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  AccountStatus,
  AdminRole,
  FirstOrderStatus,
  StoreApplicationStatus,
  StoreStatus
} from "@prisma/client";
import { createSessionToken, verifySessionToken } from "../../infra/auth/session-token";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { UserService } from "../user/user.service";

const DEFAULT_STORE_CODE = "FZ-TAIJIANG-001";
type WechatAppKind = "user" | "merchant";
type WechatLoginMode = "mock" | "real";

interface WechatSession {
  openId: string;
  sessionKey?: string;
  unionId?: string;
  mode: WechatLoginMode;
}

interface WechatAccessTokenCacheItem {
  token: string;
  expiresAt: number;
}

interface WechatCode2SessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

interface WechatAccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface WechatPhoneResponse {
  errcode?: number;
  errmsg?: string;
  phone_info?: {
    phoneNumber?: string;
    purePhoneNumber?: string;
    countryCode?: string;
  };
}

function createPasswordHash(password: string, salt = randomBytes(16).toString("hex")) {
  return {
    passwordSalt: salt,
    passwordHash: scryptSync(password, salt, 64).toString("hex")
  };
}

function passwordMatches(password: string, salt: string, passwordHash: string) {
  const incoming = Buffer.from(scryptSync(password, salt, 64).toString("hex"));
  const stored = Buffer.from(passwordHash);
  return incoming.length === stored.length && timingSafeEqual(incoming, stored);
}

@Injectable()
export class AuthService {
  private readonly wechatAccessTokenCache: Partial<
    Record<WechatAppKind, WechatAccessTokenCacheItem>
  > = {};

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService
  ) {}

  async userMockLogin() {
    const user = await this.userService.ensureDemoUser();

    return {
      token: createSessionToken({ type: "user", sub: user.id }),
      user: this.formatUser(user)
    };
  }

  async userMe(userToken?: string) {
    const user = await this.userService.resolveUser(userToken);
    return this.formatUser(user);
  }

  async userWechatLogin(dto: {
    code?: string;
    phoneCode?: string;
    phone?: string;
    nickname?: string;
  }) {
    const wechat = await this.resolveWechatSession("user", dto.code);

    const phone =
      (await this.resolveWechatPhone("user", dto.phoneCode)) || dto.phone?.trim() || undefined;
    const nickname = dto.nickname?.trim() || "金闪送用户";
    const user = await this.upsertWechatUser(wechat.openId, {
      phone,
      nickname
    });

    return {
      token: createSessionToken({ type: "user", sub: user.id }),
      loginMode: wechat.mode,
      openId: wechat.openId,
      user: this.formatUser(user)
    };
  }

  async merchantMockLogin(storeCode?: string) {
    const store = await this.resolveStore(storeCode);
    const account = await this.upsertMerchantAccount({
      phone: store.phone ?? store.code,
      name: `${store.name}管理员`,
      storeId: store.id
    });

    return {
      token: createSessionToken({
        type: "merchant",
        sub: account.id,
        storeId: store.id,
        storeCode: store.code
      }),
      store: this.formatStore(store),
      stores: (await this.ownedMerchantStoresForAccount(account)).map((item) =>
        this.formatStore(item)
      )
    };
  }

  async merchantWechatLogin(dto: { code?: string; phoneCode?: string; phone?: string }) {
    const wechat = await this.resolveWechatSession("merchant", dto.code);
    const phone =
      (await this.resolveWechatPhone("merchant", dto.phoneCode)) || dto.phone?.trim() || undefined;

    if (!phone) {
      const existingLogin = await this.merchantLoginByOpenId(wechat.openId);
      if (existingLogin) {
        return {
          ...existingLogin,
          loginMode: wechat.mode,
          openId: wechat.openId
        };
      }

      return {
        canLogin: false,
        loginMode: wechat.mode,
        openId: wechat.openId,
        message: "请授权微信手机号，或填写已提交入驻申请的手机号",
        application: null
      };
    }

    const result = await this.merchantLogin({ phone, openId: wechat.openId });

    return {
      ...result,
      loginMode: wechat.mode,
      openId: wechat.openId
    };
  }

  async merchantMe(merchantToken?: string, storeCode?: string) {
    const resolvedStoreCode = await this.resolveMerchantStoreCode(merchantToken, storeCode);
    const store = await this.resolveStore(resolvedStoreCode);
    return this.formatStore(store);
  }

  async merchantStores(merchantToken?: string) {
    const { account } = await this.resolveMerchantAccountSession(merchantToken);
    return (await this.ownedMerchantStoresForAccount(account)).map((store) =>
      this.formatStore(store)
    );
  }

  async merchantSwitchStore(merchantToken: string | undefined, storeCode?: string) {
    const { account } = await this.resolveMerchantAccountSession(merchantToken);
    const store = await this.resolveOwnedMerchantStore(account, storeCode);

    await this.prisma.merchantAccount.update({
      where: { id: account.id },
      data: {
        storeId: store.id,
        lastLoginAt: new Date()
      }
    });

    const refreshedAccount = {
      ...account,
      storeId: store.id,
      store
    };

    return {
      token: createSessionToken({
        type: "merchant",
        sub: account.id,
        storeId: store.id,
        storeCode: store.code
      }),
      store: this.formatStore(store),
      stores: (await this.ownedMerchantStoresForAccount(refreshedAccount)).map((item) =>
        this.formatStore(item)
      )
    };
  }

  async merchantApply(dto: {
    applicantName?: string;
    applicantPhone?: string;
    storeName?: string;
    city?: string;
    district?: string;
    address?: string;
    businessLicenseNo?: string;
    businessLicenseImageUrl?: string;
    storefrontImageUrl?: string;
    categoryNote?: string;
  }) {
    const applicantName = dto.applicantName?.trim();
    const applicantPhone = dto.applicantPhone?.trim();
    const storeName = dto.storeName?.trim();
    const district = dto.district?.trim();
    const address = dto.address?.trim();

    if (!applicantName || !applicantPhone || !storeName || !district || !address) {
      throw new BadRequestException("请完整填写联系人、手机号、门店名称、区域和地址");
    }

    const pending = await this.prisma.storeApplication.findFirst({
      where: {
        applicantPhone,
        status: StoreApplicationStatus.PENDING
      },
      orderBy: { createdAt: "desc" }
    });

    const data = {
      applicantName,
      applicantPhone,
      storeName,
      city: dto.city?.trim() || "福州市",
      district,
      address,
      businessLicenseNo: dto.businessLicenseNo?.trim() || null,
      businessLicenseImageUrl: dto.businessLicenseImageUrl?.trim() || null,
      storefrontImageUrl: dto.storefrontImageUrl?.trim() || null,
      categoryNote: dto.categoryNote?.trim() || "数码配件门店",
      reviewRemark: null
    };

    const application = pending
      ? await this.prisma.storeApplication.update({
          where: { id: pending.id },
          data
        })
      : await this.prisma.storeApplication.create({ data });

    return this.formatApplication(application);
  }

  async merchantLogin(dto: { phone?: string; openId?: string }) {
    const phone = dto.phone?.trim();

    if (!phone) {
      throw new BadRequestException("请输入入驻申请手机号");
    }

    const applications = await this.prisma.storeApplication.findMany({
      where: { applicantPhone: { in: this.phoneCandidates(phone) } },
      include: { store: true },
      orderBy: { createdAt: "desc" }
    });
    const application =
      applications.find(
        (item) =>
          item.status === StoreApplicationStatus.APPROVED &&
          item.store &&
          item.store.status === StoreStatus.OPEN
      ) ?? applications[0];

    if (!application) {
      return {
        canLogin: false,
        message: "未找到入驻申请，请先提交入驻申请",
        application: null
      };
    }

    if (
      application.status !== StoreApplicationStatus.APPROVED ||
      !application.store ||
      application.store.status !== StoreStatus.OPEN
    ) {
      return {
        canLogin: false,
        message: this.applicationMessage(application.status),
        application: this.formatApplication(application)
      };
    }

    const account = await this.upsertMerchantAccount({
      phone,
      name: application.applicantName,
      storeId: application.store.id,
      openId: dto.openId?.trim() || null
    });

    await this.prisma.merchantAccount.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() }
    });

    return {
      canLogin: true,
      token: createSessionToken({
        type: "merchant",
        sub: account.id,
        storeId: application.store.id,
        storeCode: application.store.code
      }),
      store: this.formatStore(application.store),
      stores: (await this.ownedMerchantStoresForAccount(account)).map((store) =>
        this.formatStore(store)
      ),
      application: this.formatApplication(application)
    };
  }

  async merchantApplicationStatus(phone?: string) {
    const applicantPhone = phone?.trim();

    if (!applicantPhone) {
      throw new BadRequestException("请输入手机号");
    }

    const application = await this.prisma.storeApplication.findFirst({
      where: { applicantPhone: { in: this.phoneCandidates(applicantPhone) } },
      include: { store: true },
      orderBy: { createdAt: "desc" }
    });

    return application ? this.formatApplication(application) : null;
  }

  private async merchantLoginByOpenId(openId: string) {
    const account = await this.prisma.merchantAccount.findUnique({
      where: { openId },
      include: { store: true }
    });

    if (!account || account.status !== AccountStatus.ACTIVE) {
      return null;
    }

    const stores = await this.ownedMerchantStoresForAccount(account);
    const activeStore = stores.find((store) => store.id === account.storeId) ?? stores[0];
    if (!activeStore) {
      return null;
    }

    await this.prisma.merchantAccount.update({
      where: { id: account.id },
      data: { storeId: activeStore.id, lastLoginAt: new Date() }
    });

    return {
      canLogin: true,
      token: createSessionToken({
        type: "merchant",
        sub: account.id,
        storeId: activeStore.id,
        storeCode: activeStore.code
      }),
      store: this.formatStore(activeStore),
      stores: stores.map((store) => this.formatStore(store)),
      application: await this.merchantApplicationStatus(account.phone)
    };
  }

  async adminLogin(dto: { account?: string; password?: string }) {
    await this.ensureDefaultAdmin();

    const account = (dto.account ?? "").trim();
    const password = dto.password ?? "";
    const admin = await this.prisma.adminUser.findUnique({ where: { account } });

    if (
      !admin ||
      admin.status !== AccountStatus.ACTIVE ||
      !passwordMatches(password, admin.passwordSalt, admin.passwordHash)
    ) {
      throw new UnauthorizedException("管理员账号或密码错误");
    }

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() }
    });

    return {
      token: createSessionToken({
        type: "admin",
        sub: admin.id,
        account: admin.account,
        role: admin.role
      }),
      account: admin.account,
      role: admin.role,
      name: admin.name
    };
  }

  async assertAdmin(adminToken?: string, roles?: AdminRole[]) {
    if (!adminToken?.trim()) {
      throw new UnauthorizedException("请先登录后台管理系统");
    }

    const payload = verifySessionToken(adminToken, "admin");
    const admin = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });

    if (!admin || admin.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("管理员账号已失效，请重新登录");
    }

    if (roles?.length && !roles.includes(admin.role)) {
      throw new UnauthorizedException("当前账号无权执行该操作");
    }

    return admin;
  }

  async resolveMerchantStoreCode(merchantToken?: string, requestedStoreCode?: string) {
    if (!merchantToken?.trim()) {
      throw new UnauthorizedException("请先登录商家端");
    }

    const requestedCode = requestedStoreCode?.trim();

    if (merchantToken.startsWith("demo-store:")) {
      const tokenStoreCode = merchantToken.replace("demo-store:", "");
      if (requestedCode && requestedCode !== tokenStoreCode) {
        throw new UnauthorizedException("当前账号无权操作其他门店");
      }
      return tokenStoreCode;
    }

    if (merchantToken.startsWith("merchant-phone:")) {
      const phone = merchantToken.replace("merchant-phone:", "");
      const store = requestedCode
        ? await this.resolveOwnedStoreByPhone(phone, requestedCode)
        : await this.resolveLatestStoreByPhone(phone);
      return store.code;
    }

    const { account, payload } = await this.resolveMerchantAccountSession(merchantToken);
    const stores = await this.ownedMerchantStoresForAccount(account);

    if (requestedCode) {
      const store = stores.find((item) => item.code === requestedCode);
      if (!store) {
        throw new UnauthorizedException("当前账号无权操作其他门店");
      }
      return store.code;
    }

    const payloadStore = payload.storeCode
      ? stores.find((item) => item.code === payload.storeCode)
      : null;
    if (payloadStore) {
      return payloadStore.code;
    }

    const accountStore = stores.find((item) => item.id === account.storeId) ?? stores[0];
    if (!accountStore) {
      throw new UnauthorizedException("商家账号暂未绑定可用门店");
    }

    return accountStore.code;
  }

  private async upsertWechatUser(openId: string, data: { phone?: string; nickname: string }) {
    const byOpenId = await this.prisma.user.findUnique({ where: { openId } });
    const phoneOwner = data.phone
      ? await this.prisma.user.findUnique({ where: { phone: data.phone } })
      : null;

    if (byOpenId) {
      return this.prisma.user.update({
        where: { id: byOpenId.id },
        data: {
          nickname: data.nickname,
          ...(data.phone && (!phoneOwner || phoneOwner.id === byOpenId.id)
            ? { phone: data.phone }
            : {})
        }
      });
    }

    if (phoneOwner) {
      if (
        phoneOwner.openId &&
        phoneOwner.openId !== openId &&
        !phoneOwner.openId.startsWith("mock-")
      ) {
        throw new UnauthorizedException("该手机号已绑定其他微信账号，请联系客服处理");
      }

      return this.prisma.user.update({
        where: { id: phoneOwner.id },
        data: {
          openId,
          nickname: phoneOwner.nickname ?? data.nickname
        }
      });
    }

    return this.prisma.user.create({
      data: {
        openId,
        phone: data.phone,
        nickname: data.nickname
      }
    });
  }

  private async resolveWechatSession(kind: WechatAppKind, code?: string): Promise<WechatSession> {
    const config = this.getWechatConfig(kind);

    if (config.mode === "mock") {
      return {
        mode: "mock",
        openId: `mock-${kind}-${(code || "local").slice(0, 16)}`
      };
    }

    if (!code?.trim()) {
      throw new BadRequestException("缺少微信登录 code");
    }

    const url = `${config.apiBaseUrl}/sns/jscode2session?appid=${encodeURIComponent(
      config.appId
    )}&secret=${encodeURIComponent(config.appSecret)}&js_code=${encodeURIComponent(
      code.trim()
    )}&grant_type=authorization_code`;
    const result = await this.fetchWechatJson<WechatCode2SessionResponse>(url);

    if (result.errcode || !result.openid) {
      throw new UnauthorizedException(
        `微信登录失败：${result.errmsg || result.errcode || "未知错误"}`
      );
    }

    return {
      mode: "real",
      openId: result.openid,
      sessionKey: result.session_key,
      unionId: result.unionid
    };
  }

  private async resolveWechatPhone(kind: WechatAppKind, phoneCode?: string) {
    const code = phoneCode?.trim();
    if (!code) {
      return undefined;
    }

    const config = this.getWechatConfig(kind);
    if (config.mode === "mock") {
      return undefined;
    }

    const accessToken = await this.getWechatAccessToken(kind);
    const result = await this.fetchWechatJson<WechatPhoneResponse>(
      `${config.apiBaseUrl}/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(
        accessToken
      )}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code })
      }
    );

    if (result.errcode || !result.phone_info?.purePhoneNumber) {
      throw new UnauthorizedException(
        `微信手机号授权失败：${result.errmsg || result.errcode || "未知错误"}`
      );
    }

    return result.phone_info.purePhoneNumber;
  }

  private async getWechatAccessToken(kind: WechatAppKind) {
    const cached = this.wechatAccessTokenCache[kind];
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.token;
    }

    const config = this.getWechatConfig(kind);
    const url = `${config.apiBaseUrl}/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(
      config.appId
    )}&secret=${encodeURIComponent(config.appSecret)}`;
    const result = await this.fetchWechatJson<WechatAccessTokenResponse>(url);

    if (result.errcode || !result.access_token) {
      throw new UnauthorizedException(
        `微信 access_token 获取失败：${result.errmsg || result.errcode || "未知错误"}`
      );
    }

    this.wechatAccessTokenCache[kind] = {
      token: result.access_token,
      expiresAt: Date.now() + Math.max((result.expires_in ?? 7200) - 120, 300) * 1000
    };

    return result.access_token;
  }

  private getWechatConfig(kind: WechatAppKind) {
    const mode = (process.env.WECHAT_LOGIN_MODE || "mock").toLowerCase();
    const appId =
      kind === "user" ? process.env.WECHAT_USER_APP_ID : process.env.WECHAT_MERCHANT_APP_ID;
    const appSecret =
      kind === "user" ? process.env.WECHAT_USER_APP_SECRET : process.env.WECHAT_MERCHANT_APP_SECRET;

    if (mode !== "real") {
      return {
        mode: "mock" as const,
        appId: "",
        appSecret: "",
        apiBaseUrl: "https://api.weixin.qq.com"
      };
    }

    if (!appId || !appSecret) {
      throw new BadRequestException("微信登录已切换为 real，但 AppID 或 AppSecret 未配置");
    }

    return {
      mode: "real" as const,
      appId,
      appSecret,
      apiBaseUrl: (process.env.WECHAT_API_BASE_URL || "https://api.weixin.qq.com").replace(
        /\/$/,
        ""
      )
    };
  }

  private async fetchWechatJson<T>(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new UnauthorizedException(`微信接口请求失败：HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  }

  private phoneCandidates(phone: string) {
    const normalized = phone.replace(/\D/g, "");
    const candidates = [phone];

    if (normalized && normalized !== phone) {
      candidates.push(normalized);
    }

    if (/^0591\d{8}$/.test(normalized)) {
      candidates.push(`0591-${normalized.slice(4)}`);
    }

    return [...new Set(candidates)];
  }

  private async resolveMerchantAccountSession(token?: string) {
    if (!token?.trim()) {
      throw new UnauthorizedException("请先登录商家端");
    }

    const payload = verifySessionToken(token.trim(), "merchant");
    const account = await this.prisma.merchantAccount.findUnique({
      where: { id: payload.sub },
      include: { store: true }
    });

    if (!account || account.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("商家账号或门店状态异常，请重新登录");
    }

    return { account, payload };
  }

  private async ownedMerchantStoresForAccount(account: {
    id: string;
    phone: string;
    storeId: string;
    store?: Awaited<ReturnType<AuthService["resolveStore"]>>;
  }) {
    const applications = await this.prisma.storeApplication.findMany({
      where: {
        applicantPhone: { in: this.phoneCandidates(account.phone) },
        status: StoreApplicationStatus.APPROVED,
        storeId: { not: null }
      },
      include: { store: true },
      orderBy: { createdAt: "desc" }
    });

    const stores = applications
      .map((application) => application.store)
      .filter((store): store is Awaited<ReturnType<AuthService["resolveStore"]>> =>
        Boolean(store && store.status === StoreStatus.OPEN)
      );

    const directStore =
      account.store && account.store.status === StoreStatus.OPEN
        ? account.store
        : await this.prisma.store.findFirst({
            where: {
              id: account.storeId,
              status: StoreStatus.OPEN
            }
          });

    if (directStore) {
      stores.unshift(directStore);
    }

    const uniqueStores = new Map(
      stores.map((store) => [store.id, store as Awaited<ReturnType<AuthService["resolveStore"]>>])
    );

    return [...uniqueStores.values()];
  }

  private async resolveOwnedMerchantStore(
    account: {
      id: string;
      phone: string;
      storeId: string;
      store?: Awaited<ReturnType<AuthService["resolveStore"]>>;
    },
    storeCode?: string
  ) {
    const requestedCode = storeCode?.trim();
    if (!requestedCode) {
      throw new BadRequestException("请选择要切换的门店");
    }

    const store = (await this.ownedMerchantStoresForAccount(account)).find(
      (item) => item.code === requestedCode
    );
    if (!store) {
      throw new UnauthorizedException("当前账号无权切换到该门店");
    }

    return store;
  }

  private async resolveOwnedStoreByPhone(phone: string, storeCode: string) {
    const application = await this.prisma.storeApplication.findFirst({
      where: {
        applicantPhone: { in: this.phoneCandidates(phone) },
        status: StoreApplicationStatus.APPROVED,
        store: {
          code: storeCode,
          status: StoreStatus.OPEN
        }
      },
      include: { store: true }
    });

    if (!application?.store) {
      throw new UnauthorizedException("当前账号无权操作其他门店");
    }

    return application.store;
  }

  private async resolveLatestStoreByPhone(phone: string) {
    const application = await this.prisma.storeApplication.findFirst({
      where: {
        applicantPhone: { in: this.phoneCandidates(phone) },
        status: StoreApplicationStatus.APPROVED,
        store: { status: StoreStatus.OPEN }
      },
      include: { store: true },
      orderBy: { createdAt: "desc" }
    });

    if (!application?.store) {
      throw new UnauthorizedException("商家登录状态已失效，请重新登录");
    }

    return application.store;
  }

  private async upsertMerchantAccount(data: {
    phone: string;
    name?: string | null;
    storeId: string;
    openId?: string | null;
  }) {
    const phone = data.phone.trim();
    const existing = await this.prisma.merchantAccount.findUnique({ where: { phone } });
    const existingByOpenId = data.openId
      ? await this.prisma.merchantAccount.findUnique({ where: { openId: data.openId } })
      : null;

    if (existingByOpenId && existingByOpenId.phone !== phone) {
      await this.prisma.merchantAccount.update({
        where: { id: existingByOpenId.id },
        data: { openId: null }
      });
    }

    if (existing) {
      return this.prisma.merchantAccount.update({
        where: { id: existing.id },
        data: {
          storeId: data.storeId,
          name: data.name?.trim() || existing.name,
          status: AccountStatus.ACTIVE,
          ...(data.openId ? { openId: data.openId } : {})
        }
      });
    }

    return this.prisma.merchantAccount.create({
      data: {
        phone,
        storeId: data.storeId,
        name: data.name?.trim() || "门店管理员",
        status: AccountStatus.ACTIVE,
        ...(data.openId ? { openId: data.openId } : {})
      }
    });
  }

  private async ensureDefaultAdmin() {
    const account = process.env.ADMIN_ACCOUNT ?? process.env.ADMIN_DEFAULT_ACCOUNT ?? "admin";
    const password =
      process.env.ADMIN_PASSWORD ?? process.env.ADMIN_DEFAULT_PASSWORD ?? "admin123456";
    const existing = await this.prisma.adminUser.findUnique({ where: { account } });

    if (existing) {
      return existing;
    }

    return this.prisma.adminUser.create({
      data: {
        account,
        name: "金闪送管理员",
        role: AdminRole.SUPER_ADMIN,
        status: AccountStatus.ACTIVE,
        ...createPasswordHash(password)
      }
    });
  }

  private async resolveStore(storeCode?: string) {
    const code = (storeCode || DEFAULT_STORE_CODE).trim();
    const store = await this.prisma.store.findUnique({ where: { code } });

    if (store) {
      if (store.status !== StoreStatus.OPEN) {
        throw new UnauthorizedException("门店未营业或未通过审核");
      }
      return store;
    }

    const fallback = await this.prisma.store.findFirst({
      where: { status: StoreStatus.OPEN },
      orderBy: { code: "desc" }
    });

    if (!fallback) {
      throw new BadRequestException("暂无可用商家门店");
    }

    return fallback;
  }

  private formatStore(store: Awaited<ReturnType<AuthService["resolveStore"]>>) {
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
      businessHours: "09:00 - 22:00"
    };
  }

  private formatUser(user: {
    id: string;
    nickname: string | null;
    phone: string | null;
    isNewUser: boolean;
    firstOrderStatus: FirstOrderStatus;
  }) {
    return {
      id: user.id,
      nickname: user.nickname ?? "金闪送用户",
      phone: user.phone ?? "",
      isNewUser: user.isNewUser,
      firstOrderStatus: user.firstOrderStatus
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
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString()
    };
  }

  private applicationMessage(status: StoreApplicationStatus) {
    if (status === StoreApplicationStatus.APPROVED) {
      return "门店状态异常，请联系平台";
    }
    if (status === StoreApplicationStatus.REJECTED) {
      return "入驻申请已驳回，可修改资料后重新提交";
    }
    return "入驻申请待后台审核";
  }
}
