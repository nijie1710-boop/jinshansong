import { PageShell, Panel, StatusPill } from "../admin-ui";
import { getAdminStores, getStoreApplications } from "../lib/api";
import {
  approveApplicationAction,
  rejectApplicationAction,
  saveStoreDeliveryProviderAction
} from "./actions";

function applicationTone(status: string) {
  if (status === "APPROVED") return "green";
  if (status === "REJECTED") return "red";
  return "orange";
}

export default async function StoresPage() {
  const [stores, applications] = await Promise.all([getAdminStores(), getStoreApplications()]);
  const pendingCount = applications.filter((item) => item.status === "PENDING").length;
  const approvedCount = applications.filter((item) => item.status === "APPROVED").length;
  const rejectedCount = applications.filter((item) => item.status === "REJECTED").length;
  const sortedApplications = [...applications].sort(
    (left, right) => applicationSort(left.status) - applicationSort(right.status)
  );

  return (
    <PageShell
      title="门店管理"
      description="商家先提交入驻申请，后台审核通过后自动生成门店账号，商家才能上架商品。"
      actions={
        <div className="flex flex-wrap gap-2 text-sm">
          <StatusPill tone={pendingCount > 0 ? "orange" : "gray"}>待审核 {pendingCount}</StatusPill>
          <StatusPill tone="green">已通过 {approvedCount}</StatusPill>
          <StatusPill tone={rejectedCount > 0 ? "red" : "gray"}>已驳回 {rejectedCount}</StatusPill>
        </div>
      }
    >
      <Panel>
        <div className="grid gap-3 text-sm text-[#666666] md:grid-cols-3">
          <div className="rounded-xl bg-[#FFF7ED] p-4">
            <div className="font-semibold text-[#111111]">1. 商家申请入驻</div>
            <div className="mt-1">商家端提交联系人、手机号、门店地址和经营品类。</div>
          </div>
          <div className="rounded-xl bg-[#F7F8FA] p-4">
            <div className="font-semibold text-[#111111]">2. 平台审核门店</div>
            <div className="mt-1">审核通过后自动生成商家门店账号和门店编码。</div>
          </div>
          <div className="rounded-xl bg-[#ECFDF5] p-4">
            <div className="font-semibold text-[#111111]">3. 商家上架商品</div>
            <div className="mt-1">商家登录后才能上传商品，商品仍需后台二次审核。</div>
          </div>
        </div>
      </Panel>

      <Panel title="入驻审核">
        {applications.length === 0 ? (
          <div className="rounded-xl bg-[#F7F8FA] p-5 text-sm text-[#666666]">暂无商家入驻申请</div>
        ) : (
          <div className="space-y-3">
            {sortedApplications.map((application) => (
              <div key={application.id} className="rounded-xl bg-[#F7F8FA] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{application.storeName}</span>
                      <StatusPill tone={applicationTone(application.status)}>
                        {application.statusText}
                      </StatusPill>
                    </div>
                    <div className="mt-2 text-sm text-[#666666]">
                      {application.applicantName} · {application.applicantPhone} ·{" "}
                      {application.city}
                      {application.district}
                      {application.address}
                    </div>
                    <div className="mt-1 text-sm text-[#666666]">
                      经营品类：{application.categoryNote || "未填写"} · 执照号：
                      {application.businessLicenseNo || "未填写"}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <ApplicationImage
                        label="营业执照照片"
                        src={application.businessLicenseImageUrl}
                      />
                      <ApplicationImage label="门店门头照" src={application.storefrontImageUrl} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusPill tone={application.storeCode ? "green" : "gray"}>
                        {application.storeCode ? `门店编码 ${application.storeCode}` : "未生成门店"}
                      </StatusPill>
                      <StatusPill tone="gray">提交 {formatDate(application.createdAt)}</StatusPill>
                      {application.reviewedAt ? (
                        <StatusPill tone="gray">
                          审核 {formatDate(application.reviewedAt)}
                        </StatusPill>
                      ) : null}
                    </div>
                    {application.reviewRemark ? (
                      <div className="mt-2 text-sm text-[#666666]">
                        审核备注：{application.reviewRemark}
                      </div>
                    ) : null}
                  </div>

                  {application.status === "PENDING" ? (
                    <div className="flex min-w-[260px] flex-col gap-2">
                      <form action={approveApplicationAction} className="flex gap-2">
                        <input type="hidden" name="id" value={application.id} />
                        <input
                          className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
                          name="remark"
                          placeholder="通过备注"
                          defaultValue="审核通过"
                        />
                        <button className="rounded-lg bg-[#FF7A00] px-4 py-2 text-sm font-semibold text-white">
                          通过
                        </button>
                      </form>
                      <form action={rejectApplicationAction} className="flex gap-2">
                        <input type="hidden" name="id" value={application.id} />
                        <input
                          className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
                          name="remark"
                          placeholder="驳回原因"
                          defaultValue="资料不完整，请补充后重新提交"
                        />
                        <button className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600">
                          驳回
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {stores.length === 0 ? (
        <Panel>
          <div className="text-sm text-[#666666]">
            暂无门店数据。审核通过第一家商家入驻申请后会生成门店。
          </div>
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {stores.map((store) => (
            <Panel key={store.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">{store.name}</div>
                  <div className="mt-1 text-sm text-[#666666]">{store.code}</div>
                </div>
                <StatusPill tone={store.status === "OPEN" ? "green" : "gray"}>
                  {store.statusText}
                </StatusPill>
              </div>
              <div className="mt-4 text-sm text-[#666666]">{store.address}</div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-[#F7F8FA] p-3">
                  <div className="text-[#666666]">订单</div>
                  <div className="mt-1 text-lg font-semibold">{store.orderCount}</div>
                </div>
                <div className="rounded-lg bg-[#F7F8FA] p-3">
                  <div className="text-[#666666]">商品</div>
                  <div className="mt-1 text-lg font-semibold">{store.productCount}</div>
                </div>
                <div className="rounded-lg bg-[#F7F8FA] p-3">
                  <div className="text-[#666666]">接单率</div>
                  <div className="mt-1 text-lg font-semibold">{store.acceptRate}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill tone={store.acceptOrderSwitch ? "green" : "gray"}>接单开关</StatusPill>
                <StatusPill tone={store.autoTransferSwitch ? "green" : "gray"}>自动转单</StatusPill>
                <StatusPill tone={store.voiceReminderSwitch ? "green" : "gray"}>
                  语音提醒
                </StatusPill>
                <StatusPill tone={deliverySummaryTone(store.deliverySummary?.status)}>
                  {store.deliverySummary?.statusText ?? "配送未检查"}
                </StatusPill>
              </div>
              <div className="mt-4 space-y-3 border-t border-black/5 pt-4">
                <div>
                  <div className="text-sm font-semibold">配送门店绑定</div>
                  <div className="mt-1 text-xs text-[#666666]">
                    现在可先用演示门店跑通；推广门店后，每个真实门店都需要单独填写平台门店/商户 ID。
                  </div>
                </div>
                {deliveryConfigs(store).map((config) => (
                  <form
                    action={saveStoreDeliveryProviderAction}
                    className="space-y-2 rounded-xl bg-[#F7F8FA] p-3"
                    key={config.provider}
                  >
                    <input name="storeId" type="hidden" value={store.id} />
                    <input name="provider" type="hidden" value={config.provider} />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          className="size-4 accent-[#FF7A00]"
                          defaultChecked={config.enabled}
                          name="enabled"
                          type="checkbox"
                        />
                        {config.providerName}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill tone={config.readiness?.mode === "http" ? "green" : "orange"}>
                          {config.readiness?.mode === "http" ? "正式模式" : "演示模式"}
                        </StatusPill>
                        <StatusPill tone={deliveryReadinessTone(config.readiness?.status)}>
                          {config.readiness?.statusText ?? "待配置"}
                        </StatusPill>
                      </div>
                    </div>
                    {config.readiness?.missing?.length ? (
                      <div className="rounded-lg bg-white px-3 py-2 text-xs text-[#A14A00]">
                        缺少：{config.readiness.missing.join("、")}
                      </div>
                    ) : null}
                    <input
                      className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                      defaultValue={config.providerShopId}
                      name="providerShopId"
                      placeholder={`${config.providerName} 门店/商户 ID`}
                    />
                    <div className="grid gap-2 md:grid-cols-3">
                      <input
                        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                        defaultValue={config.serviceCode}
                        name="serviceCode"
                        placeholder="服务代码"
                      />
                      <input
                        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                        defaultValue={config.contactName}
                        name="contactName"
                        placeholder="联系人"
                      />
                      <input
                        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                        defaultValue={config.contactPhone || store.phone}
                        name="contactPhone"
                        placeholder="门店联系电话"
                      />
                    </div>
                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <input
                        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                        defaultValue={config.remark}
                        name="remark"
                        placeholder="备注"
                      />
                      <button className="rounded-lg bg-[#FF7A00] px-4 py-2 text-sm font-semibold text-white">
                        保存
                      </button>
                    </div>
                  </form>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function applicationSort(status: string) {
  if (status === "PENDING") return 0;
  if (status === "REJECTED") return 2;
  return 1;
}

const defaultDeliveryConfigs = [
  {
    provider: "MEITUAN",
    providerName: "美团配送",
    providerShopId: "",
    enabled: true,
    serviceCode: "4031",
    contactName: "",
    contactPhone: "",
    remark: "",
    readiness: null
  },
  {
    provider: "FENGNIAO",
    providerName: "蜂鸟即配",
    providerShopId: "",
    enabled: true,
    serviceCode: "即时配送",
    contactName: "",
    contactPhone: "",
    remark: "",
    readiness: null
  }
];

function deliveryConfigs(store: Awaited<ReturnType<typeof getAdminStores>>[number]) {
  const existing = store.deliveryConfigs ?? [];
  return defaultDeliveryConfigs.map((preset) => {
    const config = existing.find((item) => item.provider === preset.provider);
    return config ?? preset;
  });
}

function deliverySummaryTone(status?: string) {
  if (status === "READY") return "green";
  if (status === "MOCK_ONLY") return "orange";
  if (status === "NOT_READY") return "red";
  return "gray";
}

function deliveryReadinessTone(status?: string) {
  if (status === "HTTP_READY") return "green";
  if (status === "MOCK_READY") return "orange";
  if (status === "HTTP_INCOMPLETE") return "red";
  return "gray";
}

function ApplicationImage({ label, src }: { label: string; src?: string }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
      {src ? (
        <img className="h-20 w-28 object-cover" src={src} alt={label} />
      ) : (
        <div className="flex h-20 w-28 items-center justify-center text-xs text-[#999999]">
          未上传
        </div>
      )}
      <div className="px-2 py-1 text-xs text-[#666666]">{label}</div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
