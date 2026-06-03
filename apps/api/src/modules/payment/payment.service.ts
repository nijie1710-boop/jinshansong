import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { createDecipheriv, createSign, createVerify, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { OrderService } from "../order/order.service";

type HeaderMap = Record<string, string | string[] | undefined>;

interface WechatConfig {
  appId: string;
  mchId: string;
  apiV3Key: string;
  serialNo: string;
  privateKeyPath: string;
  notifyUrl: string;
  privateKey: string;
}

interface WechatPrepayResponse {
  prepay_id?: string;
}

interface WechatErrorResponse {
  code?: string;
  message?: string;
}

interface WechatEncryptedResource {
  algorithm?: string;
  associated_data?: string;
  ciphertext?: string;
  nonce?: string;
  original_type?: string;
}

interface WechatNotifyBody {
  event_type?: string;
  resource?: WechatEncryptedResource;
}

interface WechatTransaction {
  out_trade_no?: string;
  transaction_id?: string;
  trade_state?: string;
  amount?: {
    total?: number;
  };
}

interface WechatCertificateResponse {
  data?: {
    serial_no?: string;
    expire_time?: string;
    encrypt_certificate?: WechatEncryptedResource;
  }[];
}

interface CachedPlatformCertificate {
  certificate: string;
  expiresAt: number;
}

function isPresent(value?: string) {
  return Boolean(value?.trim());
}

function headerValue(headers: HeaderMap, key: string) {
  const lowerKey = key.toLowerCase();
  const direct = headers[key] ?? headers[lowerKey];
  const value =
    direct ??
    Object.entries(headers).find(([headerKey]) => headerKey.toLowerCase() === lowerKey)?.[1];

  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

@Injectable()
export class PaymentService {
  private readonly platformCertificates = new Map<string, CachedPlatformCertificate>();

  constructor(private readonly orderService: OrderService) {}

  runtimeStatus() {
    const mode = (process.env.PAYMENT_MODE || "mock").toLowerCase();
    const appId = this.resolveWechatAppId();
    const privateKeyPath = process.env.WECHAT_PAY_PRIVATE_KEY_PATH || "";
    const apiV3Key = process.env.WECHAT_PAY_API_V3_KEY || "";
    const wechatReady = this.wechatConfigReady();

    return {
      mode,
      mockPayEnabled: mode !== "wechat",
      wechatReady,
      channel: mode === "wechat" ? "WECHAT_MINIPROGRAM" : "MOCK",
      notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || "",
      required: {
        appId: isPresent(appId),
        mchId: isPresent(process.env.WECHAT_PAY_MCH_ID),
        apiV3Key: isPresent(apiV3Key),
        apiV3KeyLengthOk: Buffer.byteLength(apiV3Key, "utf8") === 32,
        serialNo: isPresent(process.env.WECHAT_PAY_SERIAL_NO),
        privateKeyPath: isPresent(privateKeyPath),
        privateKeyFile: isPresent(privateKeyPath) && existsSync(privateKeyPath),
        notifyUrl: isPresent(process.env.WECHAT_PAY_NOTIFY_URL)
      }
    };
  }

  async createWechatJsapiPayment(orderId: string, userToken?: string) {
    const status = this.runtimeStatus();

    if (status.mode !== "wechat") {
      const order = await this.orderService.mockPay(orderId, userToken);
      return {
        mode: "mock" as const,
        order
      };
    }

    const config = this.getWechatConfig();
    const prepared = await this.orderService.prepareWechatPayment(orderId, userToken);

    if (prepared.alreadyPaid) {
      return {
        mode: "paid" as const,
        order: prepared.formattedOrder
      };
    }

    const requestBody = {
      appid: config.appId,
      mchid: config.mchId,
      description: prepared.description,
      out_trade_no: prepared.outTradeNo,
      notify_url: config.notifyUrl,
      amount: {
        total: prepared.amountCents,
        currency: "CNY"
      },
      payer: {
        openid: prepared.openId
      }
    };

    const response = await this.callWechatApi<WechatPrepayResponse>(
      "POST",
      "/v3/pay/transactions/jsapi",
      requestBody,
      config
    );

    if (!response.prepay_id) {
      throw new ServiceUnavailableException("微信支付下单失败：未返回 prepay_id");
    }

    const payment = this.buildMiniProgramPaymentParams(config, response.prepay_id);
    return {
      mode: "wechat" as const,
      order: prepared.formattedOrder,
      outTradeNo: prepared.outTradeNo,
      payment
    };
  }

  async handleWechatNotify(body: unknown, headers: HeaderMap, rawBody?: Buffer) {
    const status = this.runtimeStatus();

    if (status.mode !== "wechat") {
      return {
        code: "SUCCESS",
        message: "mock payment mode ignored",
        ignored: true
      };
    }

    const config = this.getWechatConfig();
    const rawBodyText = rawBody?.toString("utf8") ?? JSON.stringify(body ?? {});
    await this.verifyWechatNotifySignature(rawBodyText, headers, config);

    const notifyBody = this.asNotifyBody(body);
    if (!notifyBody.resource) {
      throw new BadRequestException("微信支付回调缺少 resource");
    }

    const transaction = this.decryptWechatResource<WechatTransaction>(
      notifyBody.resource,
      config.apiV3Key
    );

    if (notifyBody.event_type !== "TRANSACTION.SUCCESS" || transaction.trade_state !== "SUCCESS") {
      return {
        code: "SUCCESS",
        message: "非支付成功通知，已忽略"
      };
    }

    if (!transaction.out_trade_no || !transaction.transaction_id) {
      throw new BadRequestException("微信支付成功通知缺少订单号或交易号");
    }
    if (typeof transaction.amount?.total !== "number") {
      throw new BadRequestException("微信支付成功通知缺少支付金额");
    }

    await this.orderService.markWechatPaymentSuccess({
      outTradeNo: transaction.out_trade_no,
      transactionNo: transaction.transaction_id,
      amountCents: transaction.amount.total,
      notifyPayload: transaction as Prisma.InputJsonObject
    });

    return {
      code: "SUCCESS",
      message: "成功"
    };
  }

  private getWechatConfig(): WechatConfig {
    const appId = this.resolveWechatAppId();
    const mchId = process.env.WECHAT_PAY_MCH_ID || "";
    const apiV3Key = process.env.WECHAT_PAY_API_V3_KEY || "";
    const serialNo = process.env.WECHAT_PAY_SERIAL_NO || "";
    const privateKeyPath = process.env.WECHAT_PAY_PRIVATE_KEY_PATH || "";
    const notifyUrl = process.env.WECHAT_PAY_NOTIFY_URL || "";

    if (![appId, mchId, apiV3Key, serialNo, privateKeyPath, notifyUrl].every(isPresent)) {
      throw new ServiceUnavailableException("微信支付配置未完整，暂不能发起真实支付");
    }
    if (Buffer.byteLength(apiV3Key, "utf8") !== 32) {
      throw new ServiceUnavailableException("微信支付 APIv3 密钥必须是 32 位字符");
    }
    if (!existsSync(privateKeyPath)) {
      throw new ServiceUnavailableException("微信支付商户私钥文件不存在");
    }

    return {
      appId,
      mchId,
      apiV3Key,
      serialNo,
      privateKeyPath,
      notifyUrl,
      privateKey: readFileSync(privateKeyPath, "utf8")
    };
  }

  private resolveWechatAppId() {
    return (
      process.env.WECHAT_USER_APP_ID ||
      process.env.MP_WEIXIN_USER_APP_ID ||
      process.env.VITE_MP_WEIXIN_USER_APP_ID ||
      ""
    );
  }

  private wechatConfigReady() {
    const privateKeyPath = process.env.WECHAT_PAY_PRIVATE_KEY_PATH || "";
    return [
      this.resolveWechatAppId(),
      process.env.WECHAT_PAY_MCH_ID,
      process.env.WECHAT_PAY_API_V3_KEY,
      process.env.WECHAT_PAY_SERIAL_NO,
      privateKeyPath,
      process.env.WECHAT_PAY_NOTIFY_URL
    ].every(isPresent);
  }

  private buildMiniProgramPaymentParams(config: WechatConfig, prepayId: string) {
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = randomBytes(16).toString("hex");
    const packageValue = `prepay_id=${prepayId}`;
    const paySign = this.signMessage(
      `${config.appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`,
      config.privateKey
    );

    return {
      timeStamp,
      nonceStr,
      package: packageValue,
      signType: "RSA" as const,
      paySign
    };
  }

  private async callWechatApi<T>(
    method: "GET" | "POST",
    path: string,
    payload: unknown,
    config: WechatConfig
  ) {
    const url = new URL(path, "https://api.mch.weixin.qq.com");
    const body = method === "GET" ? "" : JSON.stringify(payload);
    const authorization = this.buildWechatAuthorization(method, url, body, config);
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: authorization,
        "Content-Type": "application/json"
      },
      body: method === "GET" ? undefined : body
    });

    const text = await response.text();
    if (!response.ok) {
      throw new ServiceUnavailableException(`微信支付接口调用失败：${this.wechatError(text)}`);
    }
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  private buildWechatAuthorization(method: string, url: URL, body: string, config: WechatConfig) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(16).toString("hex");
    const message = `${method}\n${url.pathname}${url.search}\n${timestamp}\n${nonce}\n${body}\n`;
    const signature = this.signMessage(message, config.privateKey);

    return [
      "WECHATPAY2-SHA256-RSA2048",
      `mchid="${config.mchId}"`,
      `nonce_str="${nonce}"`,
      `signature="${signature}"`,
      `timestamp="${timestamp}"`,
      `serial_no="${config.serialNo}"`
    ].join(",");
  }

  private signMessage(message: string, privateKey: string) {
    return createSign("RSA-SHA256").update(message).end().sign(privateKey, "base64");
  }

  private async verifyWechatNotifySignature(
    rawBodyText: string,
    headers: HeaderMap,
    config: WechatConfig
  ) {
    const timestamp = headerValue(headers, "wechatpay-timestamp");
    const nonce = headerValue(headers, "wechatpay-nonce");
    const signature = headerValue(headers, "wechatpay-signature");
    const serial = headerValue(headers, "wechatpay-serial");

    if (!timestamp || !nonce || !signature || !serial) {
      throw new UnauthorizedException("微信支付回调签名头缺失");
    }

    const certificate = await this.platformCertificate(serial, config);
    const message = `${timestamp}\n${nonce}\n${rawBodyText}\n`;
    const verified = createVerify("RSA-SHA256")
      .update(message)
      .end()
      .verify(certificate, signature, "base64");

    if (!verified) {
      throw new UnauthorizedException("微信支付回调签名校验失败");
    }
  }

  private async platformCertificate(serial: string, config: WechatConfig) {
    const cached = this.platformCertificates.get(serial);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.certificate;
    }

    await this.refreshPlatformCertificates(config);
    const refreshed = this.platformCertificates.get(serial);
    if (!refreshed) {
      throw new ServiceUnavailableException("未找到匹配的微信支付平台证书");
    }

    return refreshed.certificate;
  }

  private async refreshPlatformCertificates(config: WechatConfig) {
    const response = await this.callWechatApi<WechatCertificateResponse>(
      "GET",
      "/v3/certificates",
      undefined,
      config
    );

    for (const item of response.data ?? []) {
      if (!item.serial_no || !item.encrypt_certificate) {
        continue;
      }

      const certificate = this.decryptWechatResource<string>(
        item.encrypt_certificate,
        config.apiV3Key
      );
      const expiresAt = item.expire_time
        ? Date.parse(item.expire_time)
        : Date.now() + 24 * 60 * 60 * 1000;
      this.platformCertificates.set(item.serial_no, {
        certificate,
        expiresAt
      });
    }
  }

  private decryptWechatResource<T>(resource: WechatEncryptedResource, apiV3Key: string) {
    if (resource.algorithm !== "AEAD_AES_256_GCM") {
      throw new BadRequestException("暂不支持的微信支付加密算法");
    }
    if (!resource.ciphertext || !resource.nonce) {
      throw new BadRequestException("微信支付加密资源字段不完整");
    }

    const plaintext = this.decryptAes256Gcm({
      apiV3Key,
      ciphertext: resource.ciphertext,
      nonce: resource.nonce,
      associatedData: resource.associated_data
    });

    if (resource.original_type === "transaction") {
      return JSON.parse(plaintext) as T;
    }

    return plaintext as T;
  }

  private decryptAes256Gcm(input: {
    apiV3Key: string;
    ciphertext: string;
    nonce: string;
    associatedData?: string;
  }) {
    const encrypted = Buffer.from(input.ciphertext, "base64");
    const authTag = encrypted.subarray(encrypted.length - 16);
    const data = encrypted.subarray(0, encrypted.length - 16);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(input.apiV3Key, "utf8"),
      Buffer.from(input.nonce, "utf8")
    );

    if (input.associatedData) {
      decipher.setAAD(Buffer.from(input.associatedData, "utf8"));
    }
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  }

  private asNotifyBody(body: unknown): WechatNotifyBody {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("微信支付回调内容为空");
    }

    return body as WechatNotifyBody;
  }

  private wechatError(text: string) {
    if (!text) {
      return "无错误详情";
    }

    try {
      const error = JSON.parse(text) as WechatErrorResponse;
      return [error.code, error.message].filter(Boolean).join("：") || text;
    } catch {
      return text;
    }
  }
}
