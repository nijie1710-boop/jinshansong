import { formatCurrency, PageShell, Panel, StatusPill } from "../../admin-ui";
import { getSettlementPreview } from "../../lib/api";

export default async function SettlementsPage() {
  const settlementPreview = await getSettlementPreview();

  return (
    <PageShell title="结算管理" description="汇总门店、骑手和推广结算数据，正式打款前由财务复核。">
      <div className="grid gap-4 md:grid-cols-4">
        <Panel>
          <div className="text-sm text-[#666666]">门店待结算</div>
          <div className="mt-2 text-2xl font-semibold text-[#FF7A00]">
            {formatCurrency(settlementPreview.storePendingAmount)}
          </div>
        </Panel>
        <Panel>
          <div className="text-sm text-[#666666]">骑手待结算</div>
          <div className="mt-2 text-2xl font-semibold">
            {formatCurrency(settlementPreview.riderPendingAmount)}
          </div>
        </Panel>
        <Panel>
          <div className="text-sm text-[#666666]">推广待结算</div>
          <div className="mt-2 text-2xl font-semibold">
            {formatCurrency(settlementPreview.promoterPendingAmount)}
          </div>
        </Panel>
        <Panel>
          <div className="text-sm text-[#666666]">总待结算</div>
          <div className="mt-2 text-2xl font-semibold text-[#111111]">
            {formatCurrency(settlementPreview.totalPendingAmount)}
          </div>
        </Panel>
      </div>

      <Panel title={`结算单 ${settlementPreview.period}`}>
        <div className="mb-4 text-sm text-[#666666]">
          已完成订单 {settlementPreview.completedOrderCount} 单，按门店、骑手、推广码自动汇总。
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#F7F8FA] text-[#666666]">
              <tr>
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">对象</th>
                <th className="px-4 py-3 font-medium">周期</th>
                <th className="px-4 py-3 font-medium">订单数</th>
                <th className="px-4 py-3 font-medium">金额</th>
                <th className="px-4 py-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {settlementPreview.settlements.map((settlement) => (
                <tr key={`${settlement.type}-${settlement.target}`}>
                  <td className="px-4 py-4 font-medium">{settlement.type}</td>
                  <td className="px-4 py-4">{settlement.target}</td>
                  <td className="px-4 py-4">{settlement.period}</td>
                  <td className="px-4 py-4">{settlement.orderCount}</td>
                  <td className="px-4 py-4 font-semibold">{formatCurrency(settlement.amount)}</td>
                  <td className="px-4 py-4">
                    <StatusPill tone={settlement.status === "已确认" ? "green" : "orange"}>
                      {settlement.status}
                    </StatusPill>
                  </td>
                </tr>
              ))}
              {settlementPreview.settlements.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-[#666666]" colSpan={6}>
                    暂无可结算订单。完成一笔订单后会自动生成结算汇总。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </PageShell>
  );
}
