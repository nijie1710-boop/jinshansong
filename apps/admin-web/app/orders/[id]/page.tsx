import type { ReactNode } from "react";
import { formatCurrency, PageShell, Panel, StatusPill } from "../../admin-ui";
import { getAdminOrder } from "../../lib/api";
import { adminOrderAction, retryDeliveryAction } from "./actions";

const statusSteps = [
  { key: "paidAt", label: "模拟支付" },
  { key: "acceptedAt", label: "门店接单" },
  { key: "readyAt", label: "备货完成" },
  { key: "pickedUpAt", label: "骑手取货" },
  { key: "completedAt", label: "完成订单" }
] as const;

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getAdminOrder(id);
  const storeName = order.storeName ?? order.store ?? "待匹配门店";

  return (
    <PageShell
      title="订单详情"
      description="后台查看真实订单数据、履约节点和单单净利润拆解。"
      actions={<StatusPill>{order.status}</StatusPill>}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_0.78fr]">
        <Panel title="订单概览">
          <div className="space-y-4 text-sm">
            <Info label="订单号" value={order.orderNo} />
            <Info label="用户" value={order.receiver ?? `${order.user} ${order.phone}`} />
            <Info label="收货地址" value={order.address ?? "-"} />
            <Info label="当前门店" value={storeName} />
            <Info label="门店电话" value={order.storePhone || "-"} />
            <Info label="骑手编号" value={order.riderNo || "-"} />
            <Info label="推广码" value={order.promoterCode || "-"} />
            <Info label="流转/拒单" value={`${order.transferCount} / ${order.rejectCount}`} />
            <Info
              label="库存预占"
              value={
                order.inventoryReservedAt ? formatDate(order.inventoryReservedAt) : "未预占/已释放"
              }
            />
            <Info label="用户实付" value={formatCurrency(order.payableAmount)} />
            <Info
              label="单单净利润"
              value={
                <span
                  className={
                    order.netProfit < 0
                      ? "font-semibold text-red-600"
                      : "font-semibold text-emerald-600"
                  }
                >
                  {formatCurrency(order.netProfit)}
                </span>
              }
            />
          </div>
        </Panel>

        <Panel title="履约节点">
          <div className="space-y-3">
            {statusSteps.map((step) => {
              const value = order[step.key];
              return (
                <div key={step.key} className="flex items-start gap-3">
                  <span
                    className={`mt-1 size-2 rounded-full ${value ? "bg-[#FF7A00]" : "bg-gray-300"}`}
                  />
                  <div>
                    <div className="font-medium">{step.label}</div>
                    <div className="mt-1 text-xs text-[#666666]">
                      {value ? formatDate(value) : "待完成"}
                    </div>
                  </div>
                </div>
              );
            })}
            {order.refundedAt ? (
              <div className="flex items-start gap-3">
                <span className="mt-1 size-2 rounded-full bg-red-500" />
                <div>
                  <div className="font-medium text-red-600">模拟退款</div>
                  <div className="mt-1 text-xs text-[#666666]">{formatDate(order.refundedAt)}</div>
                </div>
              </div>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel title="第三方聚合配送">
        {order.deliveryTask ? (
          <div className="space-y-4">
            <div className="grid gap-4 text-sm md:grid-cols-3">
              <Info
                label="平台"
                value={order.deliveryTask.providerName || order.deliveryTask.provider}
              />
              <Info label="配送单号" value={order.deliveryTask.providerOrderNo || "-"} />
              <Info
                label="配送状态"
                value={
                  <StatusPill tone={deliveryTone(order.deliveryTask.status)}>
                    {order.deliveryTask.statusText}
                  </StatusPill>
                }
              />
              <Info label="骑手" value={order.deliveryTask.riderName || "-"} />
              <Info label="骑手电话" value={order.deliveryTask.riderPhone || "-"} />
              <Info label="骑手编号" value={order.deliveryTask.riderNo || "-"} />
              <Info label="平台配送费" value={formatCurrency(order.deliveryTask.fee)} />
              <Info
                label="配送距离"
                value={
                  order.deliveryTask.distanceKm === null ||
                  order.deliveryTask.distanceKm === undefined
                    ? "-"
                    : `${order.deliveryTask.distanceKm}km`
                }
              />
              <Info
                label="发单时间"
                value={
                  order.deliveryTask.dispatchedAt
                    ? formatDate(order.deliveryTask.dispatchedAt)
                    : "-"
                }
              />
              <Info
                label="可取货通知"
                value={
                  order.deliveryTask.readyNotifiedAt
                    ? formatDate(order.deliveryTask.readyNotifiedAt)
                    : "-"
                }
              />
              <Info
                label="取货时间"
                value={
                  order.deliveryTask.pickedUpAt ? formatDate(order.deliveryTask.pickedUpAt) : "-"
                }
              />
              <Info
                label="完成时间"
                value={
                  order.deliveryTask.completedAt ? formatDate(order.deliveryTask.completedAt) : "-"
                }
              />
              {order.deliveryTask.failReason ? (
                <div className="md:col-span-3">
                  <Info label="异常原因" value={order.deliveryTask.failReason} />
                </div>
              ) : null}
            </div>
            {order.deliveryTask.status === "FAILED" ? (
              <form action={retryDeliveryAction}>
                <input name="orderId" type="hidden" value={order.id} />
                <button className="rounded-full bg-[#FF7A00] px-4 py-2 text-sm font-semibold text-white">
                  重发配送单
                </button>
              </form>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-xl bg-[#F7F8FA] p-5 text-sm text-[#666666] md:flex-row md:items-center md:justify-between">
            <span>
              订单接单后会自动创建第三方聚合配送任务。未发单时可检查系统配置中的聚合配送开关。
            </span>
            {order.statusCode === "STORE_ACCEPTED" ? (
              <form action={retryDeliveryAction}>
                <input name="orderId" type="hidden" value={order.id} />
                <button className="rounded-full bg-[#FF7A00] px-4 py-2 text-sm font-semibold text-white">
                  手动发单
                </button>
              </form>
            ) : null}
          </div>
        )}
      </Panel>

      <Panel title="后台订单干预">
        <div className="grid gap-3 text-sm lg:grid-cols-3">
          <AdminActionForm
            action="cancel"
            disabled={["COMPLETED", "CANCELLED", "REFUNDED"].includes(order.statusCode)}
            orderId={order.id}
            placeholder="取消原因"
            title="取消订单"
          />
          <AdminActionForm
            action="refund"
            disabled={
              order.payStatus !== "PAID" || ["COMPLETED", "REFUNDED"].includes(order.statusCode)
            }
            orderId={order.id}
            placeholder="退款原因"
            title="模拟退款"
          />
          <AdminActionForm
            action="force-complete"
            disabled={
              order.payStatus !== "PAID" ||
              ["COMPLETED", "CANCELLED", "REFUNDED"].includes(order.statusCode)
            }
            orderId={order.id}
            placeholder="强制完成备注"
            title="强制完成"
          />
        </div>
      </Panel>

      <Panel title="操作日志">
        {order.logs?.length ? (
          <div className="space-y-3">
            {order.logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-2 rounded-xl bg-[#F7F8FA] p-4 text-sm lg:flex-row lg:items-start lg:justify-between"
              >
                <div>
                  <div className="font-semibold text-[#111111]">{actionLabel(log.action)}</div>
                  <div className="mt-1 text-[#666666]">
                    {log.message || "-"} · {log.operatorType}
                    {log.operatorId ? ` ${log.operatorId}` : ""}
                  </div>
                  <div className="mt-1 text-xs text-[#999999]">
                    {log.fromStatus || "-"} → {log.toStatus || "-"}
                  </div>
                </div>
                <div className="text-xs text-[#666666]">{formatDate(log.createdAt)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-[#F7F8FA] p-5 text-sm text-[#666666]">
            暂无操作日志。旧订单会在后续状态变更时开始记录。
          </div>
        )}
      </Panel>

      <Panel title="支付 / 退款流水">
        {order.paymentRecords?.length ? (
          <div className="overflow-hidden rounded-xl ring-1 ring-black/5">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#F7F8FA] text-[#666666]">
                <tr>
                  <th className="px-4 py-3 font-medium">类型</th>
                  <th className="px-4 py-3 font-medium">渠道</th>
                  <th className="px-4 py-3 font-medium">商户单号</th>
                  <th className="px-4 py-3 font-medium">金额</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">完成时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {order.paymentRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3">{record.type === "PAYMENT" ? "支付" : "退款"}</td>
                    <td className="px-4 py-3">{record.channel}</td>
                    <td className="px-4 py-3 font-mono text-xs">{record.outTradeNo}</td>
                    <td className="px-4 py-3">{formatCurrency(record.amount)}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone={record.status === "SUCCESS" ? "green" : "orange"}>
                        {record.status === "SUCCESS" ? "成功" : record.status}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      {record.completedAt ? formatDate(record.completedAt) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl bg-[#F7F8FA] p-5 text-sm text-[#666666]">
            暂无支付流水。旧订单会在重新支付或退款时开始记录。
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.78fr]">
        <Panel title="商品明细">
          <div className="overflow-hidden rounded-xl ring-1 ring-black/5">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F7F8FA] text-[#666666]">
                <tr>
                  <th className="px-4 py-3 font-medium">商品</th>
                  <th className="px-4 py-3 font-medium">规格</th>
                  <th className="px-4 py-3 font-medium">数量</th>
                  <th className="px-4 py-3 font-medium">售价</th>
                  <th className="px-4 py-3 font-medium">结算价</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {(order.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium">{item.productName}</td>
                    <td className="px-4 py-3 text-[#666666]">{item.skuName}</td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3">{formatCurrency(item.salePrice)}</td>
                    <td className="px-4 py-3">{formatCurrency(item.settlePrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="净利润拆解">
          <div className="space-y-3 text-sm">
            <MoneyLine label="平台收入" value={order.platformIncome} strong />
            <MoneyLine label="商品金额" value={order.goodsAmount ?? 0} />
            <MoneyLine label="向用户收配送费" value={order.deliveryFeeCharged ?? 0} />
            <MoneyLine label="门店结算" value={-order.storeSettleAmount} />
            <MoneyLine label="配送成本" value={-order.deliveryFeeCost} />
            <MoneyLine label="门店佣金" value={-order.storeCommission} />
            <MoneyLine label="骑手奖励" value={-order.riderBonus} />
            <MoneyLine label="推广员佣金" value={-order.promoterCommission} />
            <MoneyLine label="用户优惠" value={-order.userDiscountAmount} />
            <div className="border-t border-black/5 pt-3">
              <MoneyLine label="单单净利润" value={order.netProfit} strong />
            </div>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/5 pb-3 last:border-0 last:pb-0">
      <span className="shrink-0 text-[#666666]">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function MoneyLine({
  label,
  value,
  strong = false
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#666666]">{label}</span>
      <span
        className={`${strong ? "font-semibold" : ""} ${
          value < 0 ? "text-red-600" : value > 0 ? "text-emerald-600" : ""
        }`}
      >
        {value < 0 ? "-" : ""}
        {formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

function AdminActionForm({
  orderId,
  action,
  title,
  placeholder,
  disabled
}: {
  orderId: string;
  action: "cancel" | "refund" | "force-complete";
  title: string;
  placeholder: string;
  disabled: boolean;
}) {
  return (
    <form action={adminOrderAction} className="rounded-xl bg-[#F7F8FA] p-4">
      <input name="orderId" type="hidden" value={orderId} />
      <input name="action" type="hidden" value={action} />
      <div className="font-semibold">{title}</div>
      <input
        className="mt-3 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
        disabled={disabled}
        name="reason"
        placeholder={placeholder}
      />
      <button
        className={`mt-3 w-full rounded-lg px-4 py-2 text-sm font-semibold ${
          disabled
            ? "bg-gray-200 text-gray-400"
            : action === "refund"
              ? "bg-red-600 text-white"
              : "bg-[#FF7A00] text-white"
        }`}
        disabled={disabled}
      >
        执行
      </button>
    </form>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    CREATE: "用户提交订单",
    MOCK_PAY: "模拟支付",
    MERCHANT_ACCEPT: "商户接单",
    MERCHANT_READY: "备货完成",
    RIDER_PICKUP: "骑手取货",
    ORDER_COMPLETE: "订单完成",
    DELIVERY_DISPATCH: "呼叫聚合配送",
    STORE_REJECT_TRANSFER: "拒单转单",
    STORE_REJECT_REFUND: "拒单退款",
    STORE_REJECT_NO_STORE_REFUND: "拒单无门店退款",
    STORE_TIMEOUT_TRANSFER: "超时转单",
    STORE_TIMEOUT_NO_STORE_REFUND: "超时无门店退款",
    ADMIN_CANCEL: "后台取消",
    ADMIN_REFUND: "后台退款",
    ADMIN_FORCE_COMPLETE: "后台强制完成"
  };
  return labels[action] ?? action;
}

function deliveryTone(status: string) {
  if (status === "COMPLETED") return "green";
  if (status === "FAILED" || status === "CANCELLED") return "red";
  if (status === "PENDING") return "gray";
  return "orange";
}
