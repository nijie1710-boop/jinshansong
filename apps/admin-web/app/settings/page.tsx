import { resolve4 } from "node:dns/promises";
import { PageShell, Panel, StatusPill } from "../admin-ui";
import { getApiHealth } from "../lib/api";
import { ChangePasswordForm } from "./change-password-form";

const previewIp = process.env.DEPLOYMENT_PREVIEW_IP || "122.51.248.210";
const domainTargets = [
  { host: "jssbuy.cn", usage: "主域名/备案主体" },
  { host: "www.jssbuy.cn", usage: "服务说明页预留" },
  { host: "api.jssbuy.cn", usage: "小程序和后台 API" },
  { host: "admin.jssbuy.cn", usage: "管理后台" }
];

export default async function SettingsPage() {
  const [health, domains] = await Promise.all([getApiHealth(), resolveDeploymentDomains()]);
  const readiness = [
    {
      label: "API / 数据库 / Redis",
      done: Boolean(health.ok),
      detail: health.ok ? "健康检查通过" : "API 健康检查失败或服务不可用"
    },
    {
      label: "HTTPS API 域名",
      done: Boolean(health.config?.apiPublicBaseUrl?.https),
      detail: health.config?.apiPublicBaseUrl?.https ? "图片/API 公网地址为 HTTPS" : "本地或未配置"
    },
    {
      label: "真实微信登录",
      done: health.config?.wechatLoginMode === "real",
      detail: `当前 ${health.config?.wechatLoginMode ?? "unknown"}`
    },
    {
      label: "微信支付",
      done: Boolean(health.payment?.wechatReady && health.config?.paymentMode === "wechat"),
      detail: health.payment?.wechatReady
        ? `当前 ${health.config?.paymentMode ?? "mock"}，微信商户配置已就绪`
        : `当前 ${health.config?.paymentMode ?? "mock"}，商户号/API v3 key/证书/回调未完整`
    },
    {
      label: "图片存储",
      done: health.config?.uploadDriver !== "LOCAL",
      detail: `当前 ${health.config?.uploadDriver ?? "LOCAL"}`
    },
    {
      label: "小程序备案 / 合法域名",
      done: false,
      detail: "ICP备案、HTTPS 和微信后台合法域名配置完成后可切正式环境"
    }
  ];

  return (
    <PageShell title="后台设置" description="后台账号、运行状态和上线前检查。">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
        <Panel title="运行状态">
          <div className="grid gap-3 md:grid-cols-2">
            <StatusItem label="API 状态" ok={health.ok} value={health.ok ? "正常" : "异常"} />
            <StatusItem
              label="数据库"
              ok={Boolean(health.database?.ok)}
              value={health.database?.ok ? "已连接" : "异常"}
            />
            <StatusItem
              label="Redis"
              ok={Boolean(health.cache?.ok)}
              value={health.cache?.ok ? "已连接" : "异常"}
            />
            <StatusItem
              label="上传目录"
              ok={Boolean(health.upload?.localDirectoryExists)}
              value={health.upload?.driver ?? "unknown"}
            />
          </div>
          <div className="mt-4 rounded-xl bg-[#F7F8FA] p-4 text-sm text-[#666666]">
            <div>环境：{health.environment}</div>
            <div>Node：{health.runtime?.node ?? "-"}</div>
            <div>运行时长：{Math.floor((health.uptimeSeconds ?? 0) / 60)} 分钟</div>
            <div>检查时间：{new Date(health.checkedAt).toLocaleString("zh-CN")}</div>
          </div>
        </Panel>

        <Panel title="上线前检查">
          <div className="grid gap-3 md:grid-cols-2">
            {readiness.map((item) => (
              <div key={item.label} className="rounded-xl bg-[#F7F8FA] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">{item.label}</div>
                  <StatusPill tone={item.done ? "green" : "orange"}>
                    {item.done ? "已就绪" : "待完成"}
                  </StatusPill>
                </div>
                <div className="mt-2 text-sm text-[#666666]">{item.detail}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="jssbuy.cn 域名与切换状态">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {domains.map((item) => (
            <div key={item.host} className="rounded-xl bg-[#F7F8FA] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{item.host}</div>
                <StatusPill tone={item.ok ? "green" : "orange"}>
                  {item.ok ? "已解析" : "待检查"}
                </StatusPill>
              </div>
              <div className="mt-2 text-sm text-[#666666]">{item.usage}</div>
              <div className="mt-3 text-sm font-semibold">
                {item.addresses.length ? item.addresses.join("、") : item.message}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <StatusItem label="ICP备案" ok={false} value="待提交/待通过" />
          <StatusItem
            label="HTTPS"
            ok={Boolean(health.config?.apiPublicBaseUrl?.https)}
            value={health.config?.apiPublicBaseUrl?.https ? "已启用" : "待备案后启用"}
          />
          <StatusItem
            label="当前预览"
            ok={health.config?.apiPublicBaseUrl?.protocol === "http"}
            value={`http://${previewIp}`}
          />
        </div>
        <p className="mt-4 text-sm text-[#666666]">
          备案通过后，将 API 切换到 `https://api.jssbuy.cn`，后台切换到
          `https://admin.jssbuy.cn`，再到微信公众平台配置合法域名。
        </p>
      </Panel>

      <Panel title="微信支付接入状态">
        <div className="grid gap-3 md:grid-cols-3">
          <StatusItem
            label="支付模式"
            ok={health.config?.paymentMode === "wechat"}
            value={health.config?.paymentMode ?? "mock"}
          />
          <StatusItem
            label="用户支付通道"
            ok={Boolean(health.payment?.channel)}
            value={health.payment?.channel ?? "MOCK"}
          />
          <StatusItem
            label="回调地址"
            ok={Boolean(health.payment?.required.notifyUrl)}
            value={health.payment?.notifyUrl ? "已配置" : "未配置"}
          />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {[
            { label: "商户号", ok: Boolean(health.payment?.required.mchId) },
            { label: "API v3 key", ok: Boolean(health.payment?.required.apiV3Key) },
            { label: "证书序列号", ok: Boolean(health.payment?.required.serialNo) },
            { label: "商户私钥", ok: Boolean(health.payment?.required.privateKeyPath) },
            { label: "HTTPS 回调", ok: Boolean(health.payment?.required.notifyUrl) }
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-[#F7F8FA] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">{item.label}</div>
                <StatusPill tone={item.ok ? "green" : "orange"}>
                  {item.ok ? "已配置" : "待配置"}
                </StatusPill>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-[#666666]">
          这里仅展示环境变量是否齐全，不展示任何密钥明文。商户号、API v3 key、证书序列号、私钥路径和
          HTTPS 回调都就绪后，再把 `PAYMENT_MODE` 切到 `wechat`。
        </p>
      </Panel>

      <Panel>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-[#F7F8FA] p-4">
            <div className="font-semibold">admin</div>
            <div className="mt-2 text-sm text-[#666666]">超级管理员</div>
            <div className="mt-4">
              <StatusPill tone="green">启用</StatusPill>
            </div>
          </div>
          <div className="rounded-xl bg-[#F7F8FA] p-4">
            <div className="font-semibold">运营账号</div>
            <div className="mt-2 text-sm text-[#666666]">订单、商品、门店</div>
            <div className="mt-4">
              <StatusPill>待配置</StatusPill>
            </div>
          </div>
          <div className="rounded-xl bg-[#F7F8FA] p-4">
            <div className="font-semibold">财务账号</div>
            <div className="mt-2 text-sm text-[#666666]">财务统计、结算管理</div>
            <div className="mt-4">
              <StatusPill>待配置</StatusPill>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="管理员密码">
        <ChangePasswordForm />
        <p className="mt-3 text-sm text-[#666666]">
          密码只提交到 API
          更新哈希，不会在后台页面保存明文。修改后当前会话仍可继续使用，下次登录需要输入新密码。
        </p>
      </Panel>
    </PageShell>
  );
}

async function resolveDeploymentDomains() {
  return Promise.all(
    domainTargets.map(async (target) => {
      try {
        const addresses = await resolve4(target.host);
        return {
          ...target,
          addresses,
          ok: addresses.includes(previewIp),
          message: ""
        };
      } catch (error) {
        return {
          ...target,
          addresses: [] as string[],
          ok: false,
          message: error instanceof Error ? error.message : "DNS 查询失败"
        };
      }
    })
  );
}

function StatusItem({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="rounded-xl bg-[#F7F8FA] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-[#666666]">{label}</div>
        <StatusPill tone={ok ? "green" : "red"}>{ok ? "正常" : "异常"}</StatusPill>
      </div>
      <div className="mt-2 font-semibold">{value}</div>
    </div>
  );
}
