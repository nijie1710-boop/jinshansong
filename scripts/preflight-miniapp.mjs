import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const env = {
  ...parseEnvFile(join(root, ".env.example")),
  ...parseEnvFile(join(root, ".env")),
  ...process.env
};

const checks = [];
const builtApiTargets = [];

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

function readTextIfExists(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
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
  const buildApiConfigPath = join(root, appDir, "dist/build/mp-weixin/config/api.js");
  const manifest = readJson(manifestPath);
  const appId = manifest["mp-weixin"]?.appid || "";
  const expectedAppId = env[appIdEnvKey] || "";
  const buildApiConfig = readTextIfExists(buildApiConfigPath);

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

  if (!buildApiConfig) {
    addCheck(false, "warning", `${name} 构建包 API 配置不存在，请先执行 pnpm build:mp`);
    return;
  }

  const apiTarget = inferBuiltApiTarget(buildApiConfig);
  if (apiTarget) {
    builtApiTargets.push(apiTarget);
  }
  addCheck(
    Boolean(apiTarget),
    "warning",
    `${name} 构建包 API 指向：${apiTarget || "未识别，请检查 config/api.js"}`
  );
}

function inferBuiltApiTarget(text) {
  const match = text.match(/https?:\/\/[^"'`;]+/i);
  if (!match) return "";

  const value = match[0].replace(/\/api$/, "");
  if (value.includes("127.0.0.1") || value.includes("localhost")) {
    return `${value}（本地 H5/开发者工具预览）`;
  }
  if (value.includes("122.51.248.210")) {
    return `${value}（服务器 IP 预览，需关闭微信开发者工具合法域名校验）`;
  }
  if (value.includes("api.jssbuy.cn")) {
    return `${value}（正式 API 域名）`;
  }
  return value;
}

inspectMiniapp("用户端", "apps/user-miniapp", "MP_WEIXIN_USER_APP_ID");
inspectMiniapp("商户端", "apps/merchant-miniapp", "MP_WEIXIN_MERCHANT_APP_ID");

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
    "商户端 WECHAT_MERCHANT_APP_ID 格式正确"
  );
  addCheck(
    Boolean(env.WECHAT_MERCHANT_APP_SECRET),
    "error",
    "商户端 WECHAT_MERCHANT_APP_SECRET 已配置"
  );
  addCheck(
    env.WECHAT_MERCHANT_APP_ID === env.MP_WEIXIN_MERCHANT_APP_ID,
    "error",
    "商户端登录 AppID 与小程序 AppID 一致"
  );
}
if (env.MP_WEIXIN_MODE === "real") {
  addCheck(isHttpsUrl(env.VITE_MP_API_BASE_URL), "error", "正式小程序 API 必须使用 HTTPS");
  addCheck(isHttpsUrl(env.API_PUBLIC_BASE_URL), "error", "正式小程序图片访问域名必须使用 HTTPS");
} else {
  const hasServerPreviewBuild = builtApiTargets.some((target) => target.includes("122.51.248.210"));
  if (hasServerPreviewBuild) {
    addCheck(true, "warning", "当前构建包使用服务器 IP 预览；微信开发者工具需关闭合法域名校验");
  } else {
    addCheck(
      Boolean(env.VITE_MP_API_BASE_URL?.startsWith("http://127.0.0.1")),
      "warning",
      "本地开发可使用 127.0.0.1 API，并在微信开发者工具关闭合法域名校验"
    );
  }
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
