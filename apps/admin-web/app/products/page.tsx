import { formatCurrency, PageShell, Panel, StatusPill } from "../admin-ui";
import { getAdminProducts } from "../lib/api";
import { approveProductAction, rejectProductAction } from "./actions";
import { BadgeCheck, Boxes, ImageIcon, PackageCheck, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

function reviewTone(status?: string) {
  if (status === "APPROVED") return "green";
  if (status === "REJECTED") return "red";
  return "orange";
}

export default async function ProductsPage() {
  const products = await getAdminProducts();
  const pendingCount = products.filter((product) => product.reviewStatus === "PENDING").length;
  const rejectedCount = products.filter((product) => product.reviewStatus === "REJECTED").length;
  const visibleCount = products.filter((product) => product.visibleToUser).length;
  const onSaleCount = products.filter((product) => product.status === "ON_SALE").length;
  const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
  const sortedProducts = [...products].sort(
    (left, right) => reviewSort(left.reviewStatus) - reviewSort(right.reviewStatus)
  );

  return (
    <PageShell
      title="商品管理"
      description="商家提交商品后进入待审核，审核通过且上架后才会展示给用户端。"
      actions={
        <div className="flex flex-wrap gap-2 text-sm">
          <StatusPill tone={pendingCount > 0 ? "orange" : "gray"}>待审核 {pendingCount}</StatusPill>
          <StatusPill tone="green">用户可见 {visibleCount}</StatusPill>
          <StatusPill tone={rejectedCount > 0 ? "red" : "gray"}>已驳回 {rejectedCount}</StatusPill>
        </div>
      }
    >
      <Panel title="商品审核台">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ProductSummary
            icon={<ShieldCheck className="size-5" />}
            label="待审核商品"
            value={pendingCount}
            hint="商家新提交后进入队列"
            tone="orange"
          />
          <ProductSummary
            icon={<BadgeCheck className="size-5" />}
            label="用户端可见"
            value={visibleCount}
            hint="审核通过且商家已上架"
            tone="green"
          />
          <ProductSummary
            icon={<PackageCheck className="size-5" />}
            label="商家上架"
            value={onSaleCount}
            hint="不代表已通过平台审核"
          />
          <ProductSummary
            icon={<Boxes className="size-5" />}
            label="库存合计"
            value={totalStock}
            hint="按当前商品 SKU 汇总"
          />
        </div>
        <div className="mt-4 grid gap-3 text-sm text-[#666666] md:grid-cols-3">
          <ReviewStep
            index="1"
            title="商家提交"
            description="商家端上传主图、详情图、价格、库存和说明。"
            tone="orange"
          />
          <ReviewStep
            index="2"
            title="平台审核"
            description="审核通过后商品保持上架状态，用户端才可见。"
          />
          <ReviewStep
            index="3"
            title="用户购买"
            description="用户下单后，订单会进入对应商家端待接单。"
            tone="green"
          />
        </div>
      </Panel>

      {products.length === 0 ? (
        <Panel>
          <div className="text-sm text-[#666666]">
            暂无商品数据。商家提交商品后会进入这里等待审核。
          </div>
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedProducts.map((product) => (
            <Panel
              key={`${product.id}-${product.skuId}`}
              className={
                product.reviewStatus === "PENDING"
                  ? "border border-[#FFB020]/40"
                  : product.reviewStatus === "REJECTED"
                    ? "border border-red-100"
                    : ""
              }
            >
              <div className="mb-4 overflow-hidden rounded-2xl bg-[#F7F8FA] ring-1 ring-black/5">
                {product.coverUrl ? (
                  <img
                    className="h-40 w-full object-cover"
                    src={product.coverUrl}
                    alt={product.name}
                  />
                ) : (
                  <div
                    className="flex h-32 items-center justify-center font-semibold text-[#FF7A00]"
                    style={{ background: product.imageTone }}
                  >
                    金闪送
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">{product.name}</div>
                  <div className="mt-2 text-sm text-[#666666]">
                    {product.categoryName || "未分类"} · {product.specs.join(" / ")}
                  </div>
                </div>
                <StatusPill tone={reviewTone(product.reviewStatus)}>
                  {product.reviewStatusText || "待审核"}
                </StatusPill>
              </div>

              <div className="mt-2 text-sm text-[#666666]">
                {product.storeNames?.join("、") || "暂无门店"} · 库存 {product.stock}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-[#F7F8FA] p-3">
                  <div className="text-xs text-[#666666]">销售价</div>
                  <div className="mt-1 font-semibold text-red-600">
                    {formatCurrency(product.price)}
                  </div>
                </div>
                <div className="rounded-xl bg-[#F7F8FA] p-3">
                  <div className="text-xs text-[#666666]">单件毛利</div>
                  <div
                    className={`mt-1 font-semibold ${
                      (product.grossMargin ?? 0) < 0 ? "text-red-600" : "text-[#0F9F6E]"
                    }`}
                  >
                    {formatCurrency(product.grossMargin ?? 0)}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill tone={product.status === "ON_SALE" ? "green" : "gray"}>
                  {product.status === "ON_SALE" ? "商家已上架" : "商家已下架"}
                </StatusPill>
                <StatusPill tone={product.coverUrl ? "green" : "orange"}>
                  <ImageIcon className="mr-1 size-3.5" />
                  {product.coverUrl ? "有主图" : "缺少主图"}
                </StatusPill>
                <StatusPill tone={(product.detailImageUrls?.length ?? 0) > 0 ? "green" : "gray"}>
                  详情图 {product.detailImageUrls?.length ?? 0}
                </StatusPill>
                {(product.visibilityIssues ?? []).map((issue) => (
                  <StatusPill key={issue} tone="orange">
                    {issue}
                  </StatusPill>
                ))}
              </div>
              <div className="mt-2 text-xs text-[#999999]">
                详情图 {product.detailImageUrls?.length ?? 0} 张 · 更新{" "}
                {formatDate(product.updatedAt)}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#FFF7ED] px-3 py-3">
                <div className="text-xs text-[#8A4B13]">
                  结算价 {formatCurrency(product.settlePrice)}
                </div>
                <StatusPill tone={product.visibleToUser ? "green" : "gray"}>
                  {product.visibleToUser ? "用户端可见" : "用户端不可见"}
                </StatusPill>
              </div>
              <div className="mt-3 rounded-xl bg-[#F7F8FA] px-3 py-2 text-xs text-[#666666]">
                {product.visibilityStatusText || "请确认审核、库存和上下架状态"}
              </div>
              {product.reviewRemark ? (
                <div className="mt-3 rounded-xl bg-[#F7F8FA] px-3 py-2 text-xs text-[#666666]">
                  {product.reviewRemark}
                </div>
              ) : null}
              {product.reviewStatus === "PENDING" ? (
                <div className="mt-4 space-y-2 rounded-2xl bg-[#F7F8FA] p-3">
                  <div className="text-sm font-semibold">审核操作</div>
                  <form action={approveProductAction} className="flex gap-2">
                    <input type="hidden" name="productId" value={product.productId || product.id} />
                    <input
                      className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-xs outline-none ring-1 ring-black/5"
                      name="remark"
                      placeholder="审核备注"
                    />
                    <button className="rounded-lg bg-[#FF7A00] px-3 py-2 text-xs font-semibold text-white">
                      通过
                    </button>
                  </form>
                  <form action={rejectProductAction} className="flex gap-2">
                    <input type="hidden" name="productId" value={product.productId || product.id} />
                    <input
                      className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-xs outline-none ring-1 ring-black/5"
                      name="remark"
                      placeholder="驳回原因"
                    />
                    <button className="rounded-lg border border-[#FF7A00] px-3 py-2 text-xs font-semibold text-[#FF7A00]">
                      驳回
                    </button>
                  </form>
                </div>
              ) : null}
            </Panel>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function ProductSummary({
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
  tone?: "default" | "orange" | "green";
}) {
  const toneClass =
    tone === "orange"
      ? "bg-orange-50 text-[#FF7A00]"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-600"
        : "bg-[#F7F8FA] text-[#111111]";

  return (
    <div className="rounded-2xl bg-[#F7F8FA] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-[#666666]">{label}</div>
        <div className={`flex size-9 items-center justify-center rounded-2xl ${toneClass}`}>
          {icon}
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-[#999999]">{hint}</div>
    </div>
  );
}

function ReviewStep({
  index,
  title,
  description,
  tone = "gray"
}: {
  index: string;
  title: string;
  description: string;
  tone?: "orange" | "green" | "gray";
}) {
  const toneClass =
    tone === "orange"
      ? "bg-[#FFF7ED] text-[#FF7A00]"
      : tone === "green"
        ? "bg-[#ECFDF5] text-emerald-700"
        : "bg-white text-[#666666]";

  return (
    <div className={`rounded-2xl p-4 ring-1 ring-black/5 ${toneClass}`}>
      <div className="flex items-center gap-2 font-semibold text-[#111111]">
        <span className="flex size-7 items-center justify-center rounded-full bg-white text-xs text-[#FF7A00] shadow-sm">
          {index}
        </span>
        {title}
      </div>
      <div className="mt-2 leading-6">{description}</div>
    </div>
  );
}

function reviewSort(status?: string) {
  if (status === "PENDING") return 0;
  if (status === "REJECTED") return 2;
  return 1;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
