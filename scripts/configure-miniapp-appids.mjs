import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFilePath = path.join(rootDir, ".env");

const miniapps = [
  {
    key: "user",
    label: "用户端",
    manifestPath: "apps/user-miniapp/src/manifest.json",
    envNames: ["MP_WEIXIN_USER_APP_ID", "WECHAT_USER_APP_ID"],
    argNames: ["user", "user-appid"]
  },
  {
    key: "merchant",
    label: "商户端",
    manifestPath: "apps/merchant-miniapp/src/manifest.json",
    envNames: ["MP_WEIXIN_MERCHANT_APP_ID", "WECHAT_MERCHANT_APP_ID"],
    argNames: ["merchant", "merchant-appid"]
  }
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return env;
      }

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) {
        return env;
      }

      const [, key, rawValue] = match;
      env[key] = rawValue.replace(/^['"]|['"]$/g, "");
      return env;
    }, {});
}

function readArg(...names) {
  for (const name of names) {
    const prefix = `--${name}=`;
    const exactIndex = process.argv.indexOf(`--${name}`);
    const inline = process.argv.find((arg) => arg.startsWith(prefix));

    if (inline) {
      return inline.slice(prefix.length);
    }

    if (exactIndex >= 0) {
      return process.argv[exactIndex + 1];
    }
  }

  return undefined;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function assertWechatAppId(appId, label) {
  if (!/^wx[0-9A-Za-z]{16}$/.test(appId)) {
    throw new Error(`${label} AppID 格式不正确，应类似 wx1234567890abcdef`);
  }
}

const envFromFile = parseEnvFile(envFilePath);
const mode = (readArg("mode") || process.env.MP_WEIXIN_MODE || envFromFile.MP_WEIXIN_MODE || "local")
  .trim()
  .toLowerCase();

if (!["local", "real"].includes(mode)) {
  throw new Error("mode 只能是 local 或 real");
}

const changes = miniapps.map((miniapp) => {
  const manifestPath = path.join(rootDir, miniapp.manifestPath);
  const manifest = readJson(manifestPath);
  const argValue = readArg(...miniapp.argNames);
  const envValue = miniapp.envNames
    .map((name) => process.env[name] || envFromFile[name])
    .find((value) => value?.trim());
  const appId = mode === "local" ? "" : (argValue || envValue || "").trim();

  if (mode === "real") {
    assertWechatAppId(appId, miniapp.label);
  }

  manifest["mp-weixin"] = {
    ...(manifest["mp-weixin"] || {}),
    appid: appId
  };

  writeJson(manifestPath, manifest);

  return {
    label: miniapp.label,
    manifestPath: miniapp.manifestPath,
    appId: appId || "touristappid"
  };
});

console.log(`金泽快送小程序 AppID 配置完成：${mode}`);
for (const change of changes) {
  console.log(`- ${change.label}: ${change.appId} (${change.manifestPath})`);
}

if (mode === "local") {
  console.log("本地模式会在微信开发者工具中使用 touristappid；正式区分需要两个真实 AppID。");
}
