import {
  AlertTriangle,
  ArrowUpRight,
  CircleDollarSign,
  ClipboardList,
  Store,
  TrendingUp,
  type LucideIcon
} from "lucide-react";
import { formatCurrency, MiniBars, PageShell, Panel, StatusPill } from "../admin-ui";
import { getDashboardSummary } from "../lib/api";

export default async function DashboardPage() {
  const dashboard = await getDashboardSummary();

  return (
    <PageShell
      title="运营工作台"
      description="聚合同城数码闪购的订单、利润、门店、异常和审核数据，优先处理会影响履约和利润的事项。"
      actions={
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="green">真实接口</StatusPill>
          <StatusPill tone="orange">本地预部署</StatusPill>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={ClipboardList}
          label="今日订单"
          value={dashboard.todayOrders.toLocaleString()}
          helper={`待接单 ${dashboard.pendingOrders}`}
          tone="blue"
        />
        <KpiCard
          icon={CircleDollarSign}
          label="今日成交额"
          value={formatCurrency(dashboard.todaySales)}
          helper="模拟支付口径"
          tone="orange"
        />
        <KpiCard
          icon={TrendingUp}
          label="今日净利润"
          value={formatCurrency(dashboard.todayProfit)}
          helper={dashboard.todayProfit < 0 ? "需要复核亏损单" : "利润健康"}
          tone={dashboard.todayProfit < 0 ? "red" : "green"}
        />
        <KpiCard
          icon={AlertTriangle}
          label="负利润订单"
          value={dashboard.negativeOrders}
          helper="后台订单表已标红"
          tone="red"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <Panel title="订单与利润走势" className="min-h-[330px]">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[#666666]">近 7 天订单</span>
                <StatusPill tone="gray">订单量</StatusPill>
              </div>
              <MiniBars values={dashboard.orderTrend} tone="blue" />
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[#666666]">近 7 天利润</span>
                <StatusPill tone={dashboard.todayProfit < 0 ? "red" : "green"}>净利润</StatusPill>
              </div>
              <MiniBars values={dashboard.profitTrend} />
            </div>
          </div>
        </Panel>

        <Panel title="运营待办" className="min-h-[330px]">
          <div className="space-y-3">
            <TodoRow
              label="待接单订单"
              value={dashboard.pendingOrders}
              helper="超过 3 分钟会触发转单"
              tone={dashboard.pendingOrders > 0 ? "orange" : "green"}
            />
            <TodoRow
              label="负利润订单"
              value={dashboard.negativeOrders}
              helper="进入订单管理查看净利润拆解"
              tone={dashboard.negativeOrders > 0 ? "red" : "green"}
            />
            <TodoRow
              label="商品销量排行"
              value={dashboard.productRanks.length}
              helper="用于判断用户端推荐位"
              tone="gray"
            />
            <TodoRow
              label="门店履约样本"
              value={dashboard.storeRanks.length}
              helper="观察接单率和订单分布"
              tone="gray"
            />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Panel title="商品销量排行">
          <div className="space-y-3">
            {dashboard.productRanks.length === 0 ? (
              <EmptyState text="暂无商品销量数据" />
            ) : (
              dashboard.productRanks.map((product) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between rounded-2xl bg-[#F7F8FA] p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-orange-50 text-sm font-semibold text-[#FF7A00]">
                      {product.rank}
                    </span>
                    <span className="line-clamp-1 font-medium">{product.name}</span>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-[#111111]">
                    {product.sales}
                  </span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="最新异常订单">
          <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
            {dashboard.recentOrders.length === 0 ? (
              <EmptyState text="暂无异常订单" />
            ) : (
              dashboard.recentOrders.map((order) => (
                <div
                  key={order.orderNo}
                  className="flex items-center justify-between gap-3 border-b border-black/5 bg-white px-4 py-3 last:border-b-0 hover:bg-[#FFF7ED]"
                >
                  <div>
                    <div className="font-medium">{order.orderNo}</div>
                    <div className="text-sm text-[#666666]">{order.storeName ?? order.store}</div>
                  </div>
                  <StatusPill tone={order.netProfit < 0 ? "red" : "green"}>
                    净利润 {formatCurrency(order.netProfit)}
                  </StatusPill>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <Panel title="门店接单排行">
        {dashboard.storeRanks.length === 0 ? (
          <EmptyState text="暂无门店排行数据" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.storeRanks.map((store) => (
              <div key={store.name} className="rounded-2xl bg-[#F7F8FA] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{store.name}</div>
                    <div className="mt-1 text-sm text-[#666666]">接单率 {store.acceptRate}</div>
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#FF7A00] shadow-sm">
                    <Store className="size-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <span className="text-sm text-[#666666]">订单数</span>
                  <span className="text-2xl font-semibold">{store.orders}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </PageShell>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl bg-[#F7F8FA] p-4 text-sm text-[#666666]">{text}</div>;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  helper,
  tone
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  helper: string;
  tone: "blue" | "orange" | "green" | "red";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-[#FFF1E5] text-[#FF7A00]",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600"
  }[tone];

  return (
    <div className="group rounded-[24px] bg-white p-5 shadow-[0_16px_42px_rgba(16,24,32,0.07)] ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(16,24,32,0.1)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-[#666666]">{label}</div>
          <div className="mt-2 text-[30px] font-semibold leading-tight tracking-normal">{value}</div>
        </div>
        <div className={`flex size-11 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="size-5" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#666666]">
        <span>{helper}</span>
        <ArrowUpRight className="size-4 text-[#B0B0B0] transition group-hover:text-[#FF7A00]" />
      </div>
    </div>
  );
}

function TodoRow({
  label,
  value,
  helper,
  tone
}: {
  label: string;
  value: number;
  helper: string;
  tone: "orange" | "red" | "green" | "gray";
}) {
  const valueClass =
    tone === "red"
      ? "text-red-600"
      : tone === "green"
        ? "text-emerald-600"
        : tone === "orange"
          ? "text-[#FF7A00]"
          : "text-[#111111]";

  return (
    <div className="rounded-2xl bg-[#F7F8FA] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{label}</div>
          <div className="mt-1 text-xs leading-5 text-[#666666]">{helper}</div>
        </div>
        <div className={`text-2xl font-semibold ${valueClass}`}>{value}</div>
      </div>
    </div>
  );
}
