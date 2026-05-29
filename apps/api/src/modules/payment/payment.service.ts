import { Injectable, ServiceUnavailableException } from "@nestjs/common";

function isPresent(value?: string) {
  return Boolean(value?.trim());
}

@Injectable()
export class PaymentService {
  runtimeStatus() {
    const mode = (process.env.PAYMENT_MODE || "mock").toLowerCase();
    const wechatReady = this.wechatConfigReady();

    return {
      mode,
      mockPayEnabled: mode !== "wechat",
      wechatReady,
      channel: mode === "wechat" ? "WECHAT_MINIPROGRAM" : "MOCK",
      notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || "",
      required: {
        mchId: isPresent(process.env.WECHAT_PAY_MCH_ID),
        apiV3Key: isPresent(process.env.WECHAT_PAY_API_V3_KEY),
        serialNo: isPresent(process.env.WECHAT_PAY_SERIAL_NO),
        privateKeyPath: isPresent(process.env.WECHAT_PAY_PRIVATE_KEY_PATH),
        notifyUrl: isPresent(process.env.WECHAT_PAY_NOTIFY_URL)
      }
    };
  }

  handleWechatNotify(body: unknown, headers: Record<string, string | string[] | undefined>) {
    const status = this.runtimeStatus();

    if (status.mode !== "wechat") {
      return {
        code: "SUCCESS",
        message: "mock payment mode ignored",
        ignored: true
      };
    }

    if (!status.wechatReady) {
      throw new ServiceUnavailableException("微信支付配置未完整，暂不能处理支付回调");
    }

    return {
      code: "FAIL",
      message: "微信支付回调验签和解密尚未启用",
      received: Boolean(body),
      headerKeys: Object.keys(headers).filter((key) => key.startsWith("wechatpay-"))
    };
  }

  private wechatConfigReady() {
    return [
      process.env.WECHAT_PAY_MCH_ID,
      process.env.WECHAT_PAY_API_V3_KEY,
      process.env.WECHAT_PAY_SERIAL_NO,
      process.env.WECHAT_PAY_PRIVATE_KEY_PATH,
      process.env.WECHAT_PAY_NOTIFY_URL
    ].every(isPresent);
  }
}
