import { PageShell, Panel, StatusPill } from "../admin-ui";
import { getPromotionConfigs, type PromotionConfigEntry } from "../lib/api";
import {
  saveFreeDeliveryPromotion,
  saveNewUserPromotion,
  saveOrderDiscountPromotion,
  saveReferralPromotion
} from "./actions";

function promotion(promotions: PromotionConfigEntry[], code: string) {
  return promotions.find((item) => item.code === code);
}

function numberValue(config: Record<string, unknown> | undefined, key: string, fallback: number) {
  const raw = config?.[key];
  return typeof raw === "number" ? raw : fallback;
}

function tierValue(
  config: Record<string, unknown> | undefined,
  index: number,
  key: "threshold" | "discount",
  fallback: number
) {
  const tiers = Array.isArray(config?.tiers) ? config.tiers : [];
  const tier = tiers[index];
  if (!tier || typeof tier !== "object") {
    return fallback;
  }
  const raw = (tier as Record<string, unknown>)[key];
  return typeof raw === "number" ? raw : fallback;
}

function couponPreviews(promotions: PromotionConfigEntry[]) {
  return promotions
    .filter((item) =>
      ["NEW_USER_FIRST_ORDER", "REFERRAL_COUPON", "ORDER_DISCOUNT", "FREE_DELIVERY"].includes(
        item.code
      )
    )
    .map((item) => {
      if (item.code === "ORDER_DISCOUNT") {
        const tiers = Array.isArray(item.config.tiers) ? item.config.tiers : [];
        const bestDiscount = tiers.reduce((max, tier) => {
          if (!tier || typeof tier !== "object") {
            return max;
          }
          const discount = (tier as Record<string, unknown>).discount;
          return typeof discount === "number" ? Math.max(max, discount) : max;
        }, 0);

        return {
          id: item.id,
          amount: `¥${bestDiscount}`,
          title: item.name,
          threshold: "满减阶梯自动计算",
          expires: item.enabled ? "下单自动生效" : "已停用",
          enabled: item.enabled
        };
      }

      if (item.code === "FREE_DELIVERY") {
        return {
          id: item.id,
          amount: "免配送",
          title: item.name,
          threshold: `满 ${numberValue(item.config, "threshold", 19)} 元可用`,
          expires: item.enabled ? "下单自动生效" : "已停用",
          enabled: item.enabled
        };
      }

      return {
        id: item.id,
        amount: `¥${numberValue(item.config, "amount", item.code === "NEW_USER_FIRST_ORDER" ? 5 : 2)}`,
        title: item.name,
        threshold: item.code === "NEW_USER_FIRST_ORDER" ? "首单可用" : "无门槛奖励券",
        expires:
          item.code === "REFERRAL_COUPON"
            ? `${numberValue(item.config, "validDays", 7)} 天有效`
            : "仅限新人首单",
        enabled: item.enabled
      };
    });
}

function Toggle({ enabled }: { enabled: boolean }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-full bg-[#F7F8FA] px-3 py-2 text-sm">
      <input defaultChecked={enabled} name="enabled" type="checkbox" />
      <span>启用</span>
    </label>
  );
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
          className="min-w-0 flex-1 bg-transparent font-semibold outline-none"
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
      保存活动
    </button>
  );
}

export default async function PromotionsPage() {
  const promotions = await getPromotionConfigs();
  const newUser = promotion(promotions, "NEW_USER_FIRST_ORDER");
  const referral = promotion(promotions, "REFERRAL_COUPON");
  const orderDiscount = promotion(promotions, "ORDER_DISCOUNT");
  const freeDelivery = promotion(promotions, "FREE_DELIVERY");
  const previews = couponPreviews(promotions);

  return (
    <PageShell
      title="优惠活动配置"
      description="新人券、老带新、满减和免配送规则均来自真实后端配置。"
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="新人首单立减">
          <form action={saveNewUserPromotion} className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusPill tone={newUser?.enabled ? "green" : "gray"}>
                {newUser?.enabled ? "启用" : "停用"}
              </StatusPill>
              <Toggle enabled={Boolean(newUser?.enabled)} />
            </div>
            <NumberField
              defaultValue={numberValue(newUser?.config, "amount", 5)}
              label="立减金额"
              name="amount"
              suffix="元"
            />
            <p className="text-sm text-[#666666]">仅福州同城订单，单用户终生限一次。</p>
            <SaveButton />
          </form>
        </Panel>

        <Panel title="老带新奖励券">
          <form action={saveReferralPromotion} className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusPill tone={referral?.enabled ? "green" : "gray"}>
                {referral?.enabled ? "启用" : "停用"}
              </StatusPill>
              <Toggle enabled={Boolean(referral?.enabled)} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <NumberField
                defaultValue={numberValue(referral?.config, "amount", 2)}
                label="奖励券金额"
                name="amount"
                suffix="元"
              />
              <NumberField
                defaultValue={numberValue(referral?.config, "validDays", 7)}
                label="有效期"
                name="validDays"
                suffix="天"
              />
              <NumberField
                defaultValue={numberValue(referral?.config, "weeklyLimit", 3)}
                label="每周上限"
                name="weeklyLimit"
                suffix="次"
              />
            </div>
            <SaveButton />
          </form>
        </Panel>

        <Panel title="满减活动">
          <form action={saveOrderDiscountPromotion} className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusPill tone={orderDiscount?.enabled ? "green" : "gray"}>
                {orderDiscount?.enabled ? "启用" : "停用"}
              </StatusPill>
              <Toggle enabled={Boolean(orderDiscount?.enabled)} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <NumberField
                defaultValue={tierValue(orderDiscount?.config, 0, "threshold", 29)}
                label="第一档门槛"
                name="thresholdA"
                suffix="元"
              />
              <NumberField
                defaultValue={tierValue(orderDiscount?.config, 0, "discount", 3)}
                label="第一档优惠"
                name="discountA"
                suffix="元"
              />
              <NumberField
                defaultValue={tierValue(orderDiscount?.config, 1, "threshold", 49)}
                label="第二档门槛"
                name="thresholdB"
                suffix="元"
              />
              <NumberField
                defaultValue={tierValue(orderDiscount?.config, 1, "discount", 6)}
                label="第二档优惠"
                name="discountB"
                suffix="元"
              />
            </div>
            <SaveButton />
          </form>
        </Panel>

        <Panel title="满额免配送">
          <form action={saveFreeDeliveryPromotion} className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusPill tone={freeDelivery?.enabled ? "green" : "gray"}>
                {freeDelivery?.enabled ? "启用" : "停用"}
              </StatusPill>
              <Toggle enabled={Boolean(freeDelivery?.enabled)} />
            </div>
            <NumberField
              defaultValue={numberValue(freeDelivery?.config, "threshold", 19)}
              label="免配送门槛"
              name="threshold"
              suffix="元"
            />
            <SaveButton />
          </form>
        </Panel>
      </div>

      <Panel title="优惠券预览">
        <div className="grid gap-4 md:grid-cols-3">
          {previews.map((coupon) => (
            <div
              key={coupon.id}
              className="rounded-xl bg-gradient-to-br from-orange-50 to-white p-5 ring-1 ring-orange-100"
            >
              <div className="text-3xl font-semibold text-red-600">{coupon.amount}</div>
              <div className="mt-3 flex items-center gap-2 font-semibold">
                <span>{coupon.title}</span>
                <StatusPill tone={coupon.enabled ? "green" : "gray"}>
                  {coupon.enabled ? "启用" : "停用"}
                </StatusPill>
              </div>
              <div className="mt-1 text-sm text-[#666666]">
                {coupon.threshold} · {coupon.expires}
              </div>
            </div>
          ))}
          {previews.length === 0 ? (
            <div className="rounded-xl bg-[#F7F8FA] p-5 text-sm text-[#666666]">
              暂无活动配置，请先运行 seed 或检查后端服务。
            </div>
          ) : null}
        </div>
      </Panel>
    </PageShell>
  );
}
