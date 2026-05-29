import { formatCurrency, PageShell, Panel, StatusPill } from "../admin-ui";
import { getAdminOrders } from "../lib/api";
import { AlertTriangle, Clock3, ClipboardList, Route, Truck, WalletCards } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export default async function OrdersPage() {
  const orders = await getAdminOrders();
  const pendingOrders = orders.filter(
    (order) => order.statusCode === "WAITING_STORE_ACCEPT"
  ).length;
  const negativeOrders = orders.filter((order) => order.netProfit < 0).length;
  const completedOrders = orders.filter(
    (order) => order.statusCode === "COMPLETED" || order.status === "已完成"
  ).length;
  const totalPayable = orders.reduce((sum, order) => sum + order.payableAmount, 0);

  return (
    <PageShell
      title="订单管理"
      description="用户下单、商家履约、聚合配送和单单净利润都在这里核对，负利润订单会自动标红。"
      actions={
        <div className="flex flex-wrap gap-2">
          <StatusPill tone={pendingOrders > 0 ? "orange" : "gray"}>待接单 {pendingOrders}</StatusPill>
          <StatusPill tone={negativeOrders > 0 ? "red" : "gray"}>负利润 {negativeOrders}</StatusPill>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OrderStat
          icon={<ClipboardList className="size-5" />}
          label="订单总数"
          value={orders.length}
          hint={`${completedOrders} 单已完成`}
        />
        <OrderStat
          icon={<Clock3 className="size-5" />}
          label="待商家接单"
          value={pendingOrders}
          hint="超时会进入自动转单"
          tone="orange"
        />
        <OrderStat
          icon={<WalletCards className="size-5" />}
          label="实付金额"
          value={formatCurrency(totalPayable)}
          hint="按当前列表汇总"
          tone="green"
        />
        <OrderStat
          icon={<AlertTriangle className="size-5" />}
          label="负利润订单"
          value={negativeOrders}
          hint="需要检查配送费和补贴"
          tone="red"
        />
      </div>

      <Panel title="订单流水">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-[#F7F8FA] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="font-semibold">实时订单列表</div>
            <div className="mt-1 text-sm text-[#666666]">
              点击订单号进入详情；流转/拒单用于判断门店匹配是否健康。
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="orange">
              <Truck className="mr-1 size-3.5" />
              聚合配送状态
            </StatusPill>
            <StatusPill tone="gray">
              <Route className="mr-1 size-3.5" />
              转单记录
            </StatusPill>
          </div>
        </div>
        {orders.length === 0 ? (
          <div className="rounded-2xl bg-[#F7F8FA] p-6 text-sm text-[#666666]">
            暂无订单。用户端完成模拟支付后，这里会出现订单记录。
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="sticky top-0 bg-[#F7F8FA] text-[#666666]">
                <tr>
                  <th className="px-4 py-3 font-medium">订单号</th>
                  <th className="px-4 py-3 font-medium">用户</th>
                  <th className="px-4 py-3 font-medium">当前门店</th>
                  <th className="px-4 py-3 font-medium">订单状态</th>
                  <th className="px-4 py-3 font-medium">聚合配送</th>
                  <th className="px-4 py-3 text-right font-medium">实付金额</th>
                  <th className="px-4 py-3 text-center font-medium">流转/拒单</th>
                  <th className="px-4 py-3 text-right font-medium">单单净利润</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {orders.map((order) => (
                  <tr
                    key={order.orderNo}
                    className={`transition hover:bg-[#FFF7ED] ${
                      order.netProfit < 0 ? "bg-red-50/70" : ""
                    }`}
                  >
                    <td className="px-4 py-4 font-medium">
                      <Link className="text-[#FF7A00] hover:underline" href={`/orders/${order.id}`}>
                        {order.orderNo}
                      </Link>
                      <div className="mt-1 text-xs text-[#999999]">ID {order.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium">{order.user}</div>
                      <div className="mt-1 text-xs text-[#666666]">{order.phone}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-[180px] truncate font-medium">
                        {order.storeName ?? order.store}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill>{order.status}</StatusPill>
                    </td>
                    <td className="px-4 py-4">
                      {order.deliveryTask ? (
                        <div>
                          <div className="font-medium">{order.deliveryTask.statusText}</div>
                          <div className="mt-1 text-xs text-[#666666]">
                            {order.deliveryTask.providerName || order.deliveryTask.provider} ·{" "}
                            {order.deliveryTask.providerOrderNo || "待回单"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#999999]">未发单</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums">
                      {formatCurrency(order.payableAmount)}
                    </td>
                    <td className="px-4 py-4 text-center tabular-nums">
                      {order.transferCount} / {order.rejectCount}
                    </td>
                    <td
                      className={`px-4 py-4 text-right font-semibold tabular-nums ${
                        order.netProfit < 0 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(order.netProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </PageShell>
  );
}

function OrderStat({
  icon,
  label,
  value,
  hint,
  tone = "default"
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint: string;
  tone?: "default" | "orange" | "red" | "green";
}) {
  const toneClass =
    tone === "orange"
      ? "bg-orange-50 text-[#FF7A00]"
      : tone === "red"
        ? "bg-red-50 text-red-600"
        : tone === "green"
          ? "bg-emerald-50 text-emerald-600"
          : "bg-[#F7F8FA] text-[#111111]";

  return (
    <div className="rounded-[22px] bg-white p-5 shadow-[0_14px_38px_rgba(16,24,32,0.06)] ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-[#666666]">{label}</div>
        <div className={`flex size-10 items-center justify-center rounded-2xl ${toneClass}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3 text-[28px] font-semibold leading-tight">{value}</div>
      <div className="mt-1 text-xs text-[#999999]">{hint}</div>
    </div>
  );
}
