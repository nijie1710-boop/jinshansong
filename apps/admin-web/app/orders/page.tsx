import { formatCurrency, PageShell, Panel, StatusPill } from "../admin-ui";
import { getAdminOrders } from "../lib/api";
import Link from "next/link";

export default async function OrdersPage() {
  const orders = await getAdminOrders();
  const pendingOrders = orders.filter(
    (order) => order.statusCode === "WAITING_STORE_ACCEPT"
  ).length;
  const negativeOrders = orders.filter((order) => order.netProfit < 0).length;

  return (
    <PageShell title="订单管理" description="真实接口订单列表，单单净利润为负时红色标记。">
      <Panel>
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-[#F7F8FA] p-4">
            <div className="text-sm text-[#666666]">今日订单</div>
            <div className="mt-1 text-xl font-semibold">{orders.length}</div>
          </div>
          <div className="rounded-xl bg-[#F7F8FA] p-4">
            <div className="text-sm text-[#666666]">待接单</div>
            <div className="mt-1 text-xl font-semibold text-[#FF7A00]">{pendingOrders}</div>
          </div>
          <div className="rounded-xl bg-[#F7F8FA] p-4">
            <div className="text-sm text-[#666666]">负利润订单</div>
            <div className="mt-1 text-xl font-semibold text-red-600">{negativeOrders}</div>
          </div>
          <div className="rounded-xl bg-[#F7F8FA] p-4">
            <div className="text-sm text-[#666666]">平均履约时长</div>
            <div className="mt-1 text-xl font-semibold">42分钟</div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-2xl ring-1 ring-black/5">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="sticky top-0 bg-[#F7F8FA] text-[#666666]">
              <tr>
                <th className="px-4 py-3 font-medium">订单号</th>
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">当前门店</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">聚合配送</th>
                <th className="px-4 py-3 font-medium">实付金额</th>
                <th className="px-4 py-3 font-medium">流转/拒单</th>
                <th className="px-4 py-3 font-medium">单单净利润</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {orders.map((order) => (
                <tr
                  key={order.orderNo}
                  className={`transition hover:bg-[#FFF7ED] ${
                    order.netProfit < 0 ? "bg-red-50/60" : ""
                  }`}
                >
                  <td className="px-4 py-4 font-medium">
                    <Link className="text-[#FF7A00] hover:underline" href={`/orders/${order.id}`}>
                      {order.orderNo}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <div>{order.user}</div>
                    <div className="text-xs text-[#666666]">{order.phone}</div>
                  </td>
                  <td className="px-4 py-4">{order.storeName ?? order.store}</td>
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
                  <td className="px-4 py-4">{formatCurrency(order.payableAmount)}</td>
                  <td className="px-4 py-4">
                    {order.transferCount} / {order.rejectCount}
                  </td>
                  <td
                    className={`px-4 py-4 font-semibold ${
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
      </Panel>
    </PageShell>
  );
}
