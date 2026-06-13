import { formatCurrency, PageShell, Panel, StatusPill } from "../../admin-ui";
import { getAdminSettlementRequests, getSettlementPreview } from "../../lib/api";
import { settlementRequestAction } from "./actions";

export default async function SettlementsPage() {
  const [settlementPreview, settlementRequests] = await Promise.all([
    getSettlementPreview(),
    getAdminSettlementRequests()
  ]);
  const pendingReviewCount = settlementRequests.filter((item) => item.status === "PENDING").length;
  const waitingPayCount = settlementRequests.filter(
    (item) => item.status === "CONFIRMED" && !item.settleTime
  ).length;

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

      <Panel title="商户提现申请">
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <StatusPill tone={pendingReviewCount > 0 ? "orange" : "gray"}>
            待审核 {pendingReviewCount}
          </StatusPill>
          <StatusPill tone={waitingPayCount > 0 ? "orange" : "gray"}>
            待打款 {waitingPayCount}
          </StatusPill>
          <StatusPill tone="gray">人工打款模式</StatusPill>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-[#F7F8FA] text-[#666666]">
              <tr>
                <th className="px-4 py-3 font-medium">商户</th>
                <th className="px-4 py-3 font-medium">周期</th>
                <th className="px-4 py-3 font-medium">订单数</th>
                <th className="px-4 py-3 font-medium">申请金额</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">申请时间</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {settlementRequests.map((request) => (
                <tr key={request.id}>
                  <td className="px-4 py-4">
                    <div className="font-medium">{request.targetName}</div>
                    <div className="mt-1 text-xs text-[#666666]">
                      {request.targetCode || request.targetId}
                      {request.targetPhone ? ` · ${request.targetPhone}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-4">{request.period}</td>
                  <td className="px-4 py-4">{request.orderCount}</td>
                  <td className="px-4 py-4 font-semibold">{formatCurrency(request.amount)}</td>
                  <td className="px-4 py-4">
                    <StatusPill tone={settlementTone(request.statusText)}>
                      {request.statusText}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-4">{formatDate(request.createdAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {request.status === "PENDING" ? (
                        <>
                          <SettlementButton
                            id={request.id}
                            action="confirm"
                            label="通过"
                            tone="primary"
                          />
                          <SettlementButton id={request.id} action="cancel" label="驳回" />
                        </>
                      ) : null}
                      {request.status === "CONFIRMED" && !request.settleTime ? (
                        <SettlementButton
                          id={request.id}
                          action="mark-paid"
                          label="标记已打款"
                          tone="primary"
                        />
                      ) : null}
                      {request.settleTime ? (
                        <span className="text-xs text-[#666666]">
                          打款 {formatDate(request.settleTime)}
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {settlementRequests.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-[#666666]" colSpan={7}>
                    暂无商户提现申请。商户端提交后会出现在这里。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

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

function SettlementButton({
  id,
  action,
  label,
  tone = "default"
}: {
  id: string;
  action: "confirm" | "cancel" | "mark-paid";
  label: string;
  tone?: "default" | "primary";
}) {
  return (
    <form action={settlementRequestAction}>
      <input name="id" type="hidden" value={id} />
      <input name="action" type="hidden" value={action} />
      <button
        className={
          tone === "primary"
            ? "rounded-lg bg-[#FF7A00] px-3 py-2 text-xs font-semibold text-white"
            : "rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#666666]"
        }
      >
        {label}
      </button>
    </form>
  );
}

function settlementTone(statusText: string) {
  if (statusText === "已打款") return "green";
  if (statusText === "已驳回") return "red";
  return "orange";
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
