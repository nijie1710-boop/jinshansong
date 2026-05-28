import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const env = {
  ...parseEnvFile(join(root, ".env.example")),
  ...parseEnvFile(join(root, ".env")),
  ...process.env
};

const checks = [];

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

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function addCheck(ok, level, message) {
  checks.push({ ok, level, message });
}

function isHttpsUrl(value) {
  return /^https:\/\//i.test(value || "");
}

function isWechatAppId(value) {
  return /^wx[0-9A-Za-z]{16}$/.test(value || "");
}

function inspectMiniapp(name, appDir, appIdEnvKey) {
  const manifestPath = join(root, appDir, "src/manifest.json");
  const buildAppJsonPath = join(root, appDir, "dist/build/mp-weixin/app.json");
  const manifest = readJson(manifestPath);
  const appId = manifest["mp-weixin"]?.appid || "";
  const expectedAppId = env[appIdEnvKey] || "";

  addCheck(Boolean(appId), "error", `${name} manifest 已配置 AppID：${appId || "未配置"}`);
  if (env.MP_WEIXIN_MODE === "real") {
    addCheck(appId === expectedAppId, "error", `${name} AppID 与 ${appIdEnvKey} 保持一致`);
  }
  addCheck(
    Boolean(manifest["mp-weixin"]?.permission?.["scope.userLocation"]),
    "warning",
    `${name} 已声明定位权限`
  );
  addCheck(existsSync(buildAppJsonPath), "warning", `${name} 微信构建产物存在`);
}

inspectMiniapp("用户端", "apps/user-miniapp", "MP_WEIXIN_USER_APP_ID");
inspectMiniapp("商家端", "apps/merchant-miniapp", "MP_WEIXIN_MERCHANT_APP_ID");

addCheck(Boolean(env.VITE_MP_API_BASE_URL), "error", "VITE_MP_API_BASE_URL 已配置");
if (env.WECHAT_LOGIN_MODE === "real") {
  addCheck(isWechatAppId(env.WECHAT_USER_APP_ID), "error", "用户端 WECHAT_USER_APP_ID 格式正确");
  addCheck(Boolean(env.WECHAT_USER_APP_SECRET), "error", "用户端 WECHAT_USER_APP_SECRET 已配置");
  addCheck(
    env.WECHAT_USER_APP_ID === env.MP_WEIXIN_USER_APP_ID,
    "error",
    "用户端登录 AppID 与小程序 AppID 一致"
  );
  addCheck(
    isWechatAppId(env.WECHAT_MERCHANT_APP_ID),
    "error",
    "商家端 WECHAT_MERCHANT_APP_ID 格式正确"
  );
  addCheck(
    Boolean(env.WECHAT_MERCHANT_APP_SECRET),
    "error",
    "商家端 WECHAT_MERCHANT_APP_SECRET 已配置"
  );
  addCheck(
    env.WECHAT_MERCHANT_APP_ID === env.MP_WEIXIN_MERCHANT_APP_ID,
    "error",
    "商家端登录 AppID 与小程序 AppID 一致"
  );
}
if (env.MP_WEIXIN_MODE === "real") {
  addCheck(isHttpsUrl(env.VITE_MP_API_BASE_URL), "error", "正式小程序 API 必须使用 HTTPS");
  addCheck(isHttpsUrl(env.API_PUBLIC_BASE_URL), "error", "正式小程序图片访问域名必须使用 HTTPS");
} else {
  addCheck(
    Boolean(env.VITE_MP_API_BASE_URL?.startsWith("http://127.0.0.1")),
    "warning",
    "本地开发可使用 127.0.0.1 API，并在微信开发者工具关闭合法域名校验"
  );
}

if (env.UPLOAD_DRIVER === "LOCAL") {
  addCheck(
    env.MP_WEIXIN_MODE !== "real",
    "warning",
    "UPLOAD_DRIVER=LOCAL 适合开发；正式运营建议切换 COS/OSS/CDN"
  );
}

const failed = checks.filter((check) => !check.ok && check.level === "error");
for (const check of checks) {
  const status = check.ok ? "PASS" : check.level.toUpperCase();
  console.log(`[${status}] ${check.message}`);
}

if (failed.length > 0) {
  process.exitCode = 1;
}
