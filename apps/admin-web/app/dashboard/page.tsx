import { formatCurrency, MetricCard, MiniBars, PageShell, Panel, StatusPill } from "../admin-ui";
import { getDashboardSummary } from "../lib/api";

export default async function DashboardPage() {
  const dashboard = await getDashboardSummary();

  return (
    <PageShell title="数据看板" description="订单、成交额、净利润和异常订单的真实接口展示。">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="今日订单数" value={dashboard.todayOrders.toLocaleString()} />
        <MetricCard label="今日成交额" value={formatCurrency(dashboard.todaySales)} />
        <MetricCard
          label="今日净利润"
          value={formatCurrency(dashboard.todayProfit)}
          tone={dashboard.todayProfit < 0 ? "red" : "green"}
        />
        <MetricCard label="负利润订单" value={dashboard.negativeOrders} tone="red" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="订单趋势（近7天）">
          <MiniBars values={dashboard.orderTrend} tone="blue" />
        </Panel>
        <Panel title="利润趋势（近7天）">
          <MiniBars values={dashboard.profitTrend} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="商品销量排行">
          <div className="space-y-3">
            {dashboard.productRanks.length === 0 ? (
              <EmptyState text="暂无商品销量数据" />
            ) : (
              dashboard.productRanks.map((product) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between rounded-lg bg-[#F7F8FA] p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-orange-50 text-sm font-semibold text-[#FF7A00]">
                      {product.rank}
                    </span>
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <span className="text-sm text-[#666666]">{product.sales}</span>
                </div>
              ))
            )}
          </div>
        </Panel>
        <Panel title="最新异常订单">
          <div className="space-y-3">
            {dashboard.recentOrders.length === 0 ? (
              <EmptyState text="暂无异常订单" />
            ) : (
              dashboard.recentOrders.map((order) => (
                <div
                  key={order.orderNo}
                  className="flex items-center justify-between rounded-lg bg-[#F7F8FA] p-3"
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
          <div className="grid gap-3 md:grid-cols-3">
            {dashboard.storeRanks.map((store) => (
              <div key={store.name} className="rounded-lg bg-[#F7F8FA] p-4">
                <div className="font-semibold">{store.name}</div>
                <div className="mt-2 text-sm text-[#666666]">
                  {store.orders} 单 · 接单率 {store.acceptRate}
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
  return <div className="rounded-lg bg-[#F7F8FA] p-4 text-sm text-[#666666]">{text}</div>;
}
