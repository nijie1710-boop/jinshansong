import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const envPath = resolve(root, readArg("env") || ".env.production");
const env = parseEnvFile(envPath);
const checks = [];

addCheck(existsSync(envPath), "error", ".env.production 文件存在");
addRequired("API_DOMAIN");
addRequired("ADMIN_DOMAIN");
addRequired("DATABASE_URL");
addRequired("REDIS_URL");
addRequired("JWT_SECRET");
addRequired("ADMIN_DEFAULT_ACCOUNT");
addRequired("ADMIN_DEFAULT_PASSWORD");
addRequired("NEXT_PUBLIC_API_BASE_URL");
addRequired("VITE_MP_API_BASE_URL");
addRequired("API_PUBLIC_BASE_URL");

addCheck((env.JWT_SECRET || "").length >= 32, "error", "JWT_SECRET 长度至少 32 位");
addCheck(env.ADMIN_DEFAULT_ACCOUNT !== "admin", "warning", "生产后台账号不再使用默认 admin");
addCheck(
  env.ADMIN_DEFAULT_PASSWORD !== "admin123456",
  "error",
  "生产后台密码不能使用默认 admin123456"
);
addCheck(isHttpsUrl(env.NEXT_PUBLIC_API_BASE_URL), "error", "后台 API 地址必须是 HTTPS");
addCheck(isHttpsUrl(env.VITE_MP_API_BASE_URL), "error", "小程序 API 地址必须是 HTTPS");
addCheck(isHttpsUrl(env.API_PUBLIC_BASE_URL), "error", "图片公开访问地址必须是 HTTPS");
addCheck(
  sameOrigin(env.NEXT_PUBLIC_API_BASE_URL, env.VITE_MP_API_BASE_URL),
  "warning",
  "后台和小程序当前使用同一个 API 域名"
);
addCheck(env.WECHAT_LOGIN_MODE === "real", "warning", "生产环境建议使用 WECHAT_LOGIN_MODE=real");
addCheck(Boolean(env.UPLOAD_DRIVER), "error", "UPLOAD_DRIVER 已配置");
if ((env.UPLOAD_DRIVER || "LOCAL").toUpperCase() === "LOCAL") {
  addCheck(false, "warning", "UPLOAD_DRIVER=LOCAL 可试运营；正式大量图片建议切 COS/OSS/CDN");
}

if ((env.PAYMENT_MODE || "mock").toLowerCase() === "wechat") {
  addRequired("WECHAT_PAY_MCH_ID");
  addRequired("WECHAT_PAY_API_V3_KEY");
  addRequired("WECHAT_PAY_SERIAL_NO");
  addRequired("WECHAT_PAY_PRIVATE_KEY_PATH");
  addRequired("WECHAT_PAY_NOTIFY_URL");
  addCheck(isHttpsUrl(env.WECHAT_PAY_NOTIFY_URL), "error", "微信支付回调地址必须是 HTTPS");
} else {
  addCheck(false, "warning", "PAYMENT_MODE=mock 仅适合测试，正式交易需切微信支付");
}

if (env.WECHAT_LOGIN_MODE === "real") {
  addRequired("WECHAT_USER_APP_ID");
  addRequired("WECHAT_USER_APP_SECRET");
  addRequired("WECHAT_MERCHANT_APP_ID");
  addRequired("WECHAT_MERCHANT_APP_SECRET");
  addCheck(
    env.WECHAT_USER_APP_ID === env.MP_WEIXIN_USER_APP_ID,
    "error",
    "用户端微信登录 AppID 与小程序 AppID 一致"
  );
  addCheck(
    env.WECHAT_MERCHANT_APP_ID === env.MP_WEIXIN_MERCHANT_APP_ID,
    "error",
    "商家端微信登录 AppID 与小程序 AppID 一致"
  );
}

addCheck(existsSync(resolve(root, "docker-compose.prod.yml")), "error", "生产 compose 文件存在");
addCheck(existsSync(resolve(root, "infra/api.Dockerfile")), "error", "API Dockerfile 存在");
addCheck(existsSync(resolve(root, "infra/admin.Dockerfile")), "error", "后台 Dockerfile 存在");
addCheck(
  existsSync(resolve(root, "infra/nginx/jinshansong.conf.template")),
  "error",
  "Nginx 配置模板存在"
);

for (const check of checks) {
  const status = check.ok ? "PASS" : check.level.toUpperCase();
  console.log(`[${status}] ${check.message}`);
}

if (checks.some((check) => !check.ok && check.level === "error")) {
  process.exitCode = 1;
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .reduce((result, line) => {
      const index = line.indexOf("=");
      const key = line.slice(0, index).trim();
      const value = line
        .slice(index + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      result[key] = value;
      return result;
    }, {});
}

function addRequired(key) {
  addCheck(Boolean(env[key]) && !env[key].startsWith("CHANGE_ME"), "error", `${key} 已配置`);
}

function addCheck(ok, level, message) {
  checks.push({ ok, level, message });
}

function isHttpsUrl(value) {
  return /^https:\/\//i.test(value || "");
}

function sameOrigin(left, right) {
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}

function readArg(name) {
  const inline = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
