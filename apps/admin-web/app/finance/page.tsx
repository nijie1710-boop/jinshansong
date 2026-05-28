import { formatCurrency, MetricCard, MiniBars, PageShell, Panel } from "../admin-ui";
import { getFinanceSummary } from "../lib/api";

export default async function FinancePage() {
  const financeStats = await getFinanceSummary();

  return (
    <PageShell title="财务统计" description="使用扩展口径展示收入、成本、净利润和角色支出。">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="平台收入" value={formatCurrency(financeStats.totalIncome)} tone="orange" />
        <MetricCard label="总成本" value={formatCurrency(financeStats.totalCost)} />
        <MetricCard label="总净利润" value={formatCurrency(financeStats.totalProfit)} tone="green" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel title="每日净利润">
          <MiniBars values={financeStats.daily.map((item) => item.profit)} />
        </Panel>
        <Panel title="角色支出明细">
          <div className="space-y-3">
            {financeStats.roleCosts.map((cost) => (
              <div key={cost.role} className="flex items-center justify-between rounded-lg bg-[#F7F8FA] p-3">
                <span>{cost.role}</span>
                <span className="font-semibold">{formatCurrency(cost.amount)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
