import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const envPath = join(root, ".env");
const envExamplePath = join(root, ".env.example");
const mode = readArg("mode") || process.argv[2];

if (!["mock", "real"].includes(mode)) {
  throw new Error("用法：pnpm wechat:mock 或 pnpm wechat:real");
}

const env = {
  ...parseEnvFile(envExamplePath),
  ...parseEnvFile(envPath)
};

if (mode === "real") {
  assertRealConfig(env);
}

let text = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
text = setEnvLine(text, "WECHAT_LOGIN_MODE", mode);
writeFileSync(envPath, text);

console.log(`微信登录模式已切换为 ${mode}`);
if (mode === "real") {
  console.log("请重启 API，并确认 VITE_MP_API_BASE_URL 已换成 HTTPS 域名。");
} else {
  console.log("本地 H5 和自动化 smoke test 将继续使用模拟微信登录。");
}

function readArg(name) {
  const inline = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
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

function setEnvLine(text, key, value) {
  const line = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(text)) {
    return text.replace(pattern, line);
  }
  return `${text.endsWith("\n") || !text ? text : `${text}\n`}${line}\n`;
}

function assertRealConfig(env) {
  const required = [
    "WECHAT_USER_APP_ID",
    "WECHAT_USER_APP_SECRET",
    "WECHAT_MERCHANT_APP_ID",
    "WECHAT_MERCHANT_APP_SECRET"
  ];

  for (const key of required) {
    if (!env[key] || env[key].startsWith("CHANGE_ME")) {
      throw new Error(`${key} 未配置，不能切换真实微信登录`);
    }
  }

  if (env.WECHAT_USER_APP_ID !== env.MP_WEIXIN_USER_APP_ID) {
    throw new Error("WECHAT_USER_APP_ID 必须和 MP_WEIXIN_USER_APP_ID 一致");
  }

  if (env.WECHAT_MERCHANT_APP_ID !== env.MP_WEIXIN_MERCHANT_APP_ID) {
    throw new Error("WECHAT_MERCHANT_APP_ID 必须和 MP_WEIXIN_MERCHANT_APP_ID 一致");
  }
}
