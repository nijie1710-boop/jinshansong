import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const env = {
  ...parseEnvFile(join(root, ".env.example")),
  ...parseEnvFile(join(root, ".env")),
  ...process.env
};
const target = readArg("target") || "any";
const checks = [];

const expectedTargets = {
  local: ["http://localhost:3001", "http://127.0.0.1:3001"],
  server: ["http://122.51.248.210"],
  production: ["https://api.jssbuy.cn"]
};

const runtimeTargets = [
  {
    name: "用户端 H5 预览",
    value:
      env.VITE_API_BASE_URL ||
      readTargetFromLog(".logs/screen-user-preview.log", "VITE_API_BASE_URL")
  },
  {
    name: "商户端 H5 预览",
    value:
      env.VITE_API_BASE_URL ||
      readTargetFromLog(".logs/screen-merchant-preview.log", "VITE_API_BASE_URL")
  },
  {
    name: "后台 Web 预览",
    value:
      env.NEXT_PUBLIC_API_BASE_URL ||
      readTargetFromLog(".logs/screen-admin-preview.log", "NEXT_PUBLIC_API_BASE_URL")
  },
  {
    name: "用户端微信构建包",
    value: readBuiltApiTarget("apps/user-miniapp/dist/build/mp-weixin/config/api.js")
  },
  {
    name: "商户端微信构建包",
    value: readBuiltApiTarget("apps/merchant-miniapp/dist/build/mp-weixin/config/api.js")
  }
];

console.log(`金泽快送运行环境一致性检查：${target}`);
console.log("");

for (const item of runtimeTargets) {
  const normalized = normalizeBaseUrl(item.value);
  addCheck(Boolean(normalized), "warning", `${item.name} API：${normalized || "未识别"}`);
  if (target !== "any") {
    addCheck(
      matchesExpectedTarget(normalized, target),
      "error",
      `${item.name} 与目标环境 ${target} 一致`
    );
  }
}

const uniqueTargets = [...new Set(runtimeTargets.map((item) => classifyTarget(item.value)))].filter(
  Boolean
);
addCheck(
  uniqueTargets.length <= 1 || target === "any",
  "error",
  `三端 API 环境数量：${uniqueTargets.length}（${uniqueTargets.join("、") || "未识别"}）`
);

await checkHealth("本机 API", "http://localhost:3001/api/health", target === "local");
await checkHealth("服务器 IP API", "http://122.51.248.210/api/health", target === "server");
await checkHealth(
  "正式 HTTPS API",
  "https://api.jssbuy.cn/api/health",
  target === "production"
);

console.log("");
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

function readTargetFromLog(relativePath, key) {
  const text = readTextIfExists(join(root, relativePath));
  if (!text) return "";

  const matches = [...text.matchAll(new RegExp(`${key}=([^\\s]+)`, "g"))];
  const lastMatch = matches.at(-1);
  return lastMatch?.[1] || "";
}

function readBuiltApiTarget(relativePath) {
  const text = readTextIfExists(join(root, relativePath));
  const matches = text.match(/https?:\/\/[^"'`;]+/g);
  return matches?.[0] || "";
}

function readTextIfExists(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
}

function normalizeBaseUrl(value) {
  if (!value) return "";
  const clean = value.replace(/\/api$/, "").replace(/\/$/, "");
  if (clean === "http://localhost:3001") return clean;
  if (clean === "http://127.0.0.1:3001") return clean;
  if (clean === "http://122.51.248.210") return clean;
  if (clean === "https://api.jssbuy.cn") return clean;
  return clean;
}

function classifyTarget(value) {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) return "";
  if (expectedTargets.local.includes(normalized)) return "local";
  if (expectedTargets.server.includes(normalized)) return "server";
  if (expectedTargets.production.includes(normalized)) return "production";
  return normalized;
}

function matchesExpectedTarget(value, expectedTarget) {
  const expected = expectedTargets[expectedTarget];
  if (!expected) return true;
  return expected.includes(value);
}

async function checkHealth(name, url, required) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      addCheck(
        !required,
        required ? "error" : "warning",
        `${name} 健康检查失败：${response.status}`
      );
      return;
    }

    const data = await response.json();
    addCheck(Boolean(data.ok), required ? "error" : "warning", `${name} 健康检查可用`);
    if (data.config) {
      addCheck(
        true,
        "warning",
        `${name} 模式：登录=${data.config.wechatLoginMode}，支付=${data.config.paymentMode}，上传=${data.config.uploadDriver}`
      );
    }
  } catch {
    addCheck(!required, required ? "error" : "warning", `${name} 健康检查不可用：${url}`);
  }
}

function addCheck(ok, level, message) {
  checks.push({ ok, level, message });
}

function readArg(name) {
  const inline = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
