import { PageShell, Panel } from "../admin-ui";
import { getSystemConfigs } from "../lib/api";
import {
  saveCommissionConfig,
  saveDeliveryAggregationConfig,
  saveDeliveryConfig,
  saveFinanceConfig,
  saveOrderFlowConfig
} from "./actions";

function configValue(configs: Awaited<ReturnType<typeof getSystemConfigs>>, key: string) {
  return configs.find((item) => item.key === key)?.value ?? {};
}

function value(config: Record<string, unknown>, key: string, fallback: number) {
  const raw = config[key];
  return typeof raw === "number" ? raw : fallback;
}

function stringValue(config: Record<string, unknown>, key: string, fallback = "") {
  const raw = config[key];
  return typeof raw === "string" ? raw : fallback;
}

function boolValue(config: Record<string, unknown>, key: string, fallback: boolean) {
  const raw = config[key];
  return typeof raw === "boolean" ? raw : fallback;
}

const defaultDeliveryProviders = [
  {
    code: "MEITUAN",
    name: "美团配送",
    serviceCode: "4031",
    enabled: true,
    mode: "mock",
    mockBaseFee: 5.8,
    mockEtaMinutes: 38
  },
  {
    code: "FENGNIAO",
    name: "蜂鸟即配",
    serviceCode: "即时配送",
    enabled: true,
    mode: "mock",
    mockBaseFee: 5.5,
    mockEtaMinutes: 42
  },
  {
    code: "UU",
    name: "UU跑腿",
    serviceCode: "帮送",
    enabled: false,
    mode: "mock",
    mockBaseFee: 7,
    mockEtaMinutes: 45
  },
  {
    code: "SF_INTRA_CITY",
    name: "顺丰同城",
    serviceCode: "同城急送",
    enabled: false,
    mode: "mock",
    mockBaseFee: 9,
    mockEtaMinutes: 35
  }
] as const;

function providerConfigs(config: Record<string, unknown>) {
  const providers = Array.isArray(config.providers) ? config.providers : [];
  return defaultDeliveryProviders.map((preset) => {
    const stored = providers.find(
      (item) =>
        item && typeof item === "object" && (item as { code?: unknown }).code === preset.code
    );
    const value = stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
    return {
      ...preset,
      enabled: boolValue(value, "enabled", preset.enabled),
      mode: stringValue(value, "mode", preset.mode),
      endpoint: stringValue(value, "endpoint"),
      appKey: stringValue(value, "appKey"),
      token: stringValue(value, "token"),
      secret: stringValue(value, "secret"),
      shopId: stringValue(value, "shopId"),
      mockBaseFee: valueNumber(value, "mockBaseFee", preset.mockBaseFee),
      mockEtaMinutes: valueNumber(value, "mockEtaMinutes", preset.mockEtaMinutes)
    };
  });
}

function valueNumber(config: Record<string, unknown>, key: string, fallback: number) {
  const raw = config[key];
  return typeof raw === "number" ? raw : fallback;
}

function NumberField({
  label,
  name,
  defaultValue,
  suffix
}: {
  label: string;
  name: string;
  defaultValue: number;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-[#666666]">{label}</span>
      <div className="mt-1 flex items-center rounded-xl bg-[#F7F8FA] px-3 py-2 ring-1 ring-black/5">
        <input
          className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
          defaultValue={defaultValue}
          name={name}
          step="0.01"
          type="number"
        />
        {suffix ? <span className="text-sm text-[#666666]">{suffix}</span> : null}
      </div>
    </label>
  );
}

function SaveButton() {
  return (
    <button
      className="rounded-full bg-[#FF7A00] px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
      type="submit"
    >
      保存配置
    </button>
  );
}

function TextField({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text"
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-[#666666]">{label}</span>
      <input
        className="mt-1 w-full rounded-xl bg-[#F7F8FA] px-3 py-2 text-base font-semibold outline-none ring-1 ring-black/5"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-[#666666]">{label}</span>
      <select
        className="mt-1 w-full rounded-xl bg-[#F7F8FA] px-3 py-2 text-base font-semibold outline-none ring-1 ring-black/5"
        defaultValue={defaultValue}
        name={name}
      >
        <option value="mock">Mock 聚合平台</option>
        <option value="http">HTTP 正式平台</option>
      </select>
    </label>
  );
}

function StrategyField({ defaultValue }: { defaultValue: string }) {
  return (
    <label className="block">
      <span className="text-sm text-[#666666]">选择策略</span>
      <select
        className="mt-1 w-full rounded-xl bg-[#F7F8FA] px-3 py-2 text-base font-semibold outline-none ring-1 ring-black/5"
        defaultValue={defaultValue}
        name="strategy"
      >
        <option value="LOWEST_COST">低价骑手优先</option>
        <option value="HIGH_VALUE_PRIORITY">高价值订单优先稳定运力</option>
      </select>
    </label>
  );
}

function ToggleField({
  label,
  name,
  defaultChecked
}: {
  label: string;
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-3 rounded-xl bg-[#F7F8FA] px-4 py-3 text-sm font-semibold ring-1 ring-black/5">
      <input
        className="size-4 accent-[#FF7A00]"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
      />
      {label}
    </label>
  );
}

export default async function ConfigsPage() {
  const configs = await getSystemConfigs();
  const delivery = configValue(configs, "delivery");
  const deliveryAggregation = configValue(configs, "delivery_aggregation");
  const providers = providerConfigs(deliveryAggregation);
  const commission = configValue(configs, "commission");
  const orderFlow = configValue(configs, "order_flow");
  const finance = configValue(configs, "finance");

  return (
    <PageShell title="系统配置" description="配送费、佣金、订单流转和亏损阈值均来自真实后端配置。">
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="配送配置">
          <form action={saveDeliveryConfig} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <NumberField
                defaultValue={value(delivery, "userDeliveryFee", 4)}
                label="用户配送费"
                name="userDeliveryFee"
                suffix="元"
              />
              <NumberField
                defaultValue={value(delivery, "platformDeliveryCost", 4)}
                label="平台配送成本"
                name="platformDeliveryCost"
                suffix="元"
              />
              <NumberField
                defaultValue={value(delivery, "freeDeliveryThreshold", 19)}
                label="免配送门槛"
                name="freeDeliveryThreshold"
                suffix="元"
              />
            </div>
            <SaveButton />
          </form>
        </Panel>

        <Panel title="第三方聚合配送平台">
          <form action={saveDeliveryAggregationConfig} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <ToggleField
                defaultChecked={boolValue(deliveryAggregation, "enabled", true)}
                label="接单后自动呼叫聚合配送"
                name="enabled"
              />
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-[#FF7A00]">
                美团/蜂鸟先做低价骑手比价，真实密钥到位后切换 HTTP
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <StrategyField
                defaultValue={stringValue(deliveryAggregation, "strategy", "LOWEST_COST")}
              />
              <NumberField
                defaultValue={value(deliveryAggregation, "highValueThreshold", 99)}
                label="高价值订单阈值"
                name="highValueThreshold"
                suffix="元"
              />
              <label className="block">
                <span className="text-sm text-[#666666]">高价值优先运力</span>
                <select
                  className="mt-1 w-full rounded-xl bg-[#F7F8FA] px-3 py-2 text-base font-semibold outline-none ring-1 ring-black/5"
                  defaultValue={stringValue(
                    deliveryAggregation,
                    "highValuePreferredProvider",
                    "SF_INTRA_CITY"
                  )}
                  name="highValuePreferredProvider"
                >
                  {providers.map((provider) => (
                    <option key={provider.code} value={provider.code}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-3">
              {providers.map((provider) => (
                <div
                  key={provider.code}
                  className="rounded-2xl bg-[#F7F8FA] p-4 ring-1 ring-black/5"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <ToggleField
                      defaultChecked={provider.enabled}
                      label={`${provider.name} · ${provider.serviceCode}`}
                      name={`${provider.code}_enabled`}
                    />
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#666666]">
                      {provider.code}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <SelectField
                      defaultValue={provider.mode}
                      label="接入模式"
                      name={`${provider.code}_mode`}
                    />
                    <NumberField
                      defaultValue={provider.mockBaseFee}
                      label="Mock 成本"
                      name={`${provider.code}_mockBaseFee`}
                      suffix="元"
                    />
                    <NumberField
                      defaultValue={provider.mockEtaMinutes}
                      label="Mock 时效"
                      name={`${provider.code}_mockEtaMinutes`}
                      suffix="分钟"
                    />
                    <TextField
                      defaultValue={provider.endpoint}
                      label="接口地址"
                      name={`${provider.code}_endpoint`}
                      placeholder="测试/正式 API endpoint"
                    />
                    <TextField
                      defaultValue={provider.appKey}
                      label="AppKey"
                      name={`${provider.code}_appKey`}
                      placeholder="平台提供"
                    />
                    <TextField
                      defaultValue={provider.shopId}
                      label="全局备用门店 ID"
                      name={`${provider.code}_shopId`}
                      placeholder="正式发单按门店管理单独绑定"
                    />
                    <TextField
                      defaultValue={provider.token}
                      label="Token"
                      name={`${provider.code}_token`}
                      placeholder="平台提供"
                      type="password"
                    />
                    <TextField
                      defaultValue={provider.secret}
                      label="Secret"
                      name={`${provider.code}_secret`}
                      placeholder="签名密钥"
                      type="password"
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-[#666666]">
              确认订单页会展示各平台预估成本和时效；商家接单后按策略发单。没有真实门店入驻前可保持
              Mock 演示；正式推广门店后，需要在“门店管理”里给每家门店单独绑定平台门店/商户 ID。
            </p>
            <SaveButton />
          </form>
        </Panel>

        <Panel title="佣金配置">
          <form action={saveCommissionConfig} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <NumberField
                defaultValue={value(commission, "storeFixedCommission", 1)}
                label="门店履约佣金"
                name="storeFixedCommission"
                suffix="元/单"
              />
              <NumberField
                defaultValue={value(commission, "riderBaseBonus", 1.5)}
                label="骑手基础奖励"
                name="riderBaseBonus"
                suffix="元/单"
              />
              <NumberField
                defaultValue={value(commission, "promoterCommission", 2)}
                label="推广员佣金"
                name="promoterCommission"
                suffix="元/单"
              />
              <NumberField
                defaultValue={value(commission, "generalAgentRate", 0.03)}
                label="总代理佣金率"
                name="generalAgentRate"
              />
              <NumberField
                defaultValue={value(commission, "riderStepCount", 10)}
                label="骑手阶梯单数"
                name="riderStepCount"
                suffix="单"
              />
              <NumberField
                defaultValue={value(commission, "riderStepBonus", 5)}
                label="骑手阶梯奖励"
                name="riderStepBonus"
                suffix="元"
              />
            </div>
            <SaveButton />
          </form>
        </Panel>

        <Panel title="订单流转">
          <form action={saveOrderFlowConfig} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <NumberField
                defaultValue={value(orderFlow, "storeAcceptTimeoutMinutes", 3)}
                label="接单倒计时"
                name="storeAcceptTimeoutMinutes"
                suffix="分钟"
              />
              <NumberField
                defaultValue={value(orderFlow, "rejectRefundThreshold", 2)}
                label="拒单退款阈值"
                name="rejectRefundThreshold"
                suffix="家"
              />
            </div>
            <SaveButton />
          </form>
        </Panel>

        <Panel title="财务风控">
          <form action={saveFinanceConfig} className="space-y-4">
            <NumberField
              defaultValue={value(finance, "lossWarningThreshold", 0)}
              label="单单亏损预警阈值"
              name="lossWarningThreshold"
              suffix="元"
            />
            <p className="text-sm text-[#666666]">
              后台订单管理会继续对负利润订单标红，后续可基于该阈值扩展自动拦截。
            </p>
            <SaveButton />
          </form>
        </Panel>
      </div>
    </PageShell>
  );
}
