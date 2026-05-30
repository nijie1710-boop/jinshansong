import { formatCurrency, PageShell, Panel, StatusPill } from "../admin-ui";
import { getAdminProducts } from "../lib/api";
import type { AdminProduct } from "../lib/api";
import { approveProductAction, rejectProductAction } from "./actions";
import {
  BadgeCheck,
  Boxes,
  CheckCircle2,
  Eye,
  ImageIcon,
  PackageCheck,
  ShieldCheck,
  Store,
  XCircle
} from "lucide-react";
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
  const pendingProducts = sortedByReview(products).filter(
    (product) => product.reviewStatus === "PENDING"
  );
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
      <Panel title="商品审核工作台">
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
        <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.6fr)]">
          <Panel title="待审核队列">
            {pendingProducts.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl bg-[#F7F8FA] px-5 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="size-6" />
                </div>
                <div className="mt-3 font-semibold">暂无待审核商品</div>
                <div className="mt-1 text-sm text-[#666666]">商家新提交商品后会优先出现在这里。</div>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingProducts.map((product) => (
                  <PendingProductCard key={`${product.id}-${product.skuId}`} product={product} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="商品库">
            <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-[#F7F8FA] p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="font-semibold">真实接口商品列表</div>
                <div className="mt-1 text-sm text-[#666666]">
                  审核、上下架、库存、图片和用户端可见状态集中核对。
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill tone="green">
                  <Eye className="size-3.5" />
                  用户可见 {visibleCount}
                </StatusPill>
                <StatusPill tone={pendingCount > 0 ? "orange" : "gray"}>
                  待审核 {pendingCount}
                </StatusPill>
              </div>
            </div>
            <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-[#F7F8FA] text-[#666666]">
                  <tr>
                    <th className="px-4 py-3 font-medium">商品</th>
                    <th className="px-4 py-3 font-medium">门店</th>
                    <th className="px-4 py-3 text-right font-medium">价格/结算</th>
                    <th className="px-4 py-3 text-right font-medium">库存</th>
                    <th className="px-4 py-3 font-medium">审核状态</th>
                    <th className="px-4 py-3 font-medium">用户端</th>
                    <th className="px-4 py-3 font-medium">素材</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {sortedProducts.map((product) => (
                    <tr
                      className={`transition hover:bg-[#FFF7ED] ${
                        product.reviewStatus === "PENDING" ? "bg-orange-50/40" : ""
                      }`}
                      key={`${product.id}-${product.skuId}`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <ProductThumb product={product} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{product.name}</div>
                            <div className="mt-1 truncate text-xs text-[#666666]">
                              {product.categoryName || "未分类"} · {product.specs.join(" / ")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-[180px] truncate text-[#666666]">
                          {product.storeNames?.join("、") || "暂无门店"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums">
                        <div className="font-semibold text-red-600">{formatCurrency(product.price)}</div>
                        <div className="mt-1 text-xs text-[#666666]">
                          结算 {formatCurrency(product.settlePrice)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold tabular-nums">
                        {product.stock}
                      </td>
                      <td className="px-4 py-4">
                        <StatusPill tone={reviewTone(product.reviewStatus)}>
                          {product.reviewStatusText || "待审核"}
                        </StatusPill>
                        <div className="mt-1 text-xs text-[#999999]">
                          更新 {formatDate(product.updatedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusPill tone={product.visibleToUser ? "green" : "gray"}>
                          {product.visibleToUser ? "可见" : "不可见"}
                        </StatusPill>
                        <div className="mt-1 max-w-[180px] truncate text-xs text-[#999999]">
                          {product.visibilityStatusText || "等待检查"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <StatusPill tone={product.coverUrl ? "green" : "orange"}>
                            <ImageIcon className="size-3.5" />
                            {product.coverUrl ? "主图" : "缺主图"}
                          </StatusPill>
                          <StatusPill
                            tone={(product.detailImageUrls?.length ?? 0) > 0 ? "green" : "gray"}
                          >
                            详情 {product.detailImageUrls?.length ?? 0}
                          </StatusPill>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </PageShell>
  );
}

function PendingProductCard({ product }: { product: AdminProduct }) {
  return (
    <div className="rounded-2xl border border-[#FFB020]/45 bg-[#FFF7ED] p-4 shadow-sm">
      <div className="flex gap-3">
        <ProductThumb product={product} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-semibold">{product.name}</div>
              <div className="mt-1 text-xs text-[#8A4B13]">
                {product.categoryName || "未分类"} · {product.specs.join(" / ")}
              </div>
            </div>
            <StatusPill tone="orange">待审核</StatusPill>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <MiniValue label="售价" value={formatCurrency(product.price)} tone="red" />
            <MiniValue label="结算" value={formatCurrency(product.settlePrice)} />
            <MiniValue label="库存" value={product.stock} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusPill tone={product.coverUrl ? "green" : "orange"}>
          <ImageIcon className="size-3.5" />
          {product.coverUrl ? "已传主图" : "缺少主图"}
        </StatusPill>
        <StatusPill tone={(product.detailImageUrls?.length ?? 0) > 0 ? "green" : "gray"}>
          详情图 {product.detailImageUrls?.length ?? 0}
        </StatusPill>
        <StatusPill tone="gray">
          <Store className="size-3.5" />
          {product.storeNames?.[0] || "暂无门店"}
        </StatusPill>
      </div>
      {product.reviewRemark ? (
        <div className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs text-[#8A4B13]">
          {product.reviewRemark}
        </div>
      ) : null}
      <div className="mt-3 space-y-2">
        <form action={approveProductAction} className="flex gap-2">
          <input type="hidden" name="productId" value={product.productId || product.id} />
          <input
            className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-xs outline-none ring-1 ring-black/5"
            name="remark"
            placeholder="审核备注"
          />
          <button className="inline-flex items-center gap-1 rounded-xl bg-[#FF7A00] px-3 py-2 text-xs font-semibold text-white shadow-sm">
            <CheckCircle2 className="size-3.5" />
            通过
          </button>
        </form>
        <form action={rejectProductAction} className="flex gap-2">
          <input type="hidden" name="productId" value={product.productId || product.id} />
          <input
            className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-xs outline-none ring-1 ring-black/5"
            name="remark"
            placeholder="驳回原因"
          />
          <button className="inline-flex items-center gap-1 rounded-xl border border-[#FF7A00] bg-white px-3 py-2 text-xs font-semibold text-[#FF7A00]">
            <XCircle className="size-3.5" />
            驳回
          </button>
        </form>
      </div>
    </div>
  );
}

function ProductThumb({ product, size = "md" }: { product: AdminProduct; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "size-16 rounded-2xl" : "size-24 rounded-[22px]";

  if (product.coverUrl) {
    return (
      <img
        alt={product.name}
        className={`${sizeClass} shrink-0 object-cover ring-1 ring-black/5`}
        src={product.coverUrl}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} relative flex shrink-0 items-center justify-center overflow-hidden bg-[#FFF7ED] ring-1 ring-black/5`}
      style={{ background: product.imageTone }}
    >
      <img
        alt=""
        className="size-9 object-contain opacity-20"
        src="/brand/logo-icon.png"
      />
      <span className="absolute bottom-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-[#FF7A00]">
        待补图
      </span>
    </div>
  );
}

function MiniValue({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "red";
}) {
  return (
    <div className="rounded-xl bg-white/75 px-3 py-2">
      <div className="text-[#8A4B13]/70">{label}</div>
      <div className={`mt-1 font-semibold ${tone === "red" ? "text-red-600" : "text-[#111111]"}`}>
        {value}
      </div>
    </div>
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

function sortedByReview(products: AdminProduct[]) {
  return [...products].sort(
    (left, right) => reviewSort(left.reviewStatus) - reviewSort(right.reviewStatus)
  );
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
