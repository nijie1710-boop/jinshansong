import { formatCurrency, PageShell, Panel, StatusPill } from "../admin-ui";
import { getAdminProducts } from "../lib/api";
import type { AdminProduct } from "../lib/api";
import { approveProductAction, rejectProductAction } from "./actions";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  Boxes,
  CheckCircle2,
  Eye,
  Filter,
  ImageIcon,
  PackageCheck,
  Search,
  ShieldCheck,
  Store,
  XCircle
} from "lucide-react";
import type { ReactNode } from "react";

type ProductView = "all" | "pending" | "visible" | "blocked" | "lowStock" | "attention";

interface ProductPageSearchParams {
  view?: string;
  q?: string;
}

function reviewTone(status?: string) {
  if (status === "APPROVED") return "green";
  if (status === "REJECTED") return "red";
  return "orange";
}

export default async function ProductsPage({
  searchParams
}: {
  searchParams?: Promise<ProductPageSearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const activeView = normalizeView(params.view);
  const keyword = (params.q ?? "").trim();
  const products = await getAdminProducts();
  const pendingCount = products.filter((product) => product.reviewStatus === "PENDING").length;
  const rejectedCount = products.filter((product) => product.reviewStatus === "REJECTED").length;
  const visibleCount = products.filter((product) => product.visibleToUser).length;
  const onSaleCount = products.filter((product) => product.status === "ON_SALE").length;
  const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
  const sellableAfterReviewCount = products.filter(
    (product) =>
      product.reviewStatus === "APPROVED" && product.status === "ON_SALE" && product.stock > 0
  ).length;
  const missingImageCount = products.filter((product) => !product.coverUrl).length;
  const blockedCount = products.filter((product) => !product.visibleToUser).length;
  const lowStockCount = products.filter(isLowStockProduct).length;
  const attentionCount = products.filter(productNeedsAttention).length;
  const pendingProducts = sortedByReview(products).filter(
    (product) => product.reviewStatus === "PENDING"
  );
  const sortedProducts = [...products].sort(
    (left, right) => reviewSort(left.reviewStatus) - reviewSort(right.reviewStatus)
  );
  const filteredProducts = sortedProducts.filter(
    (product) => productMatchesView(product, activeView) && productMatchesKeyword(product, keyword)
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

      <Panel title="三端互通检查">
        <div className="grid gap-3 md:grid-cols-3">
          <DataFlowCard
            title="商家端提交"
            value={`${products.length} 个 SKU`}
            description="商家上传主图、SKU 图、详情图和价格后写入同一套商品库。"
            tone="orange"
          />
          <DataFlowCard
            title="后台审核"
            value={`${pendingCount} 个待处理`}
            description={
              missingImageCount > 0
                ? `${missingImageCount} 个商品缺主图，审核前建议补齐。`
                : "图片、价格、库存和说明已进入审核检查。"
            }
          />
          <DataFlowCard
            title="用户端可售"
            value={`${visibleCount} 个可见`}
            description={`${sellableAfterReviewCount} 个已通过审核、上架且有库存，用户端可购买。`}
            tone="green"
          />
        </div>
      </Panel>

      <Panel title="运营筛选">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <ProductFilterLink
              active={activeView === "all"}
              count={products.length}
              href={productFilterHref("all", keyword)}
            >
              全部
            </ProductFilterLink>
            <ProductFilterLink
              active={activeView === "pending"}
              count={pendingCount}
              href={productFilterHref("pending", keyword)}
              tone="orange"
            >
              待审核
            </ProductFilterLink>
            <ProductFilterLink
              active={activeView === "visible"}
              count={visibleCount}
              href={productFilterHref("visible", keyword)}
              tone="green"
            >
              用户可见
            </ProductFilterLink>
            <ProductFilterLink
              active={activeView === "blocked"}
              count={blockedCount}
              href={productFilterHref("blocked", keyword)}
            >
              用户不可见
            </ProductFilterLink>
            <ProductFilterLink
              active={activeView === "lowStock"}
              count={lowStockCount}
              href={productFilterHref("lowStock", keyword)}
              tone="orange"
            >
              低库存
            </ProductFilterLink>
            <ProductFilterLink
              active={activeView === "attention"}
              count={attentionCount}
              href={productFilterHref("attention", keyword)}
              tone="red"
            >
              需处理
            </ProductFilterLink>
          </div>
          <form className="flex min-w-0 gap-2" action="/products">
            <input type="hidden" name="view" value={activeView} />
            <div className="relative min-w-0 flex-1 xl:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#999999]" />
              <input
                className="h-10 w-full rounded-xl border border-black/10 bg-[#F7F8FA] pl-9 pr-3 text-sm outline-none focus:border-[#FF7A00]"
                defaultValue={keyword}
                name="q"
                placeholder="搜索商品、SKU、门店、分类"
              />
            </div>
            <button className="inline-flex h-10 items-center gap-1 rounded-xl bg-[#FF7A00] px-4 text-sm font-semibold text-white">
              <Filter className="size-4" />
              筛选
            </button>
          </form>
        </div>
        <div className="mt-3 rounded-2xl bg-[#F7F8FA] px-4 py-3 text-sm text-[#666666]">
          当前显示 {filteredProducts.length} / {products.length} 个 SKU
          {keyword ? `，关键词：${keyword}` : ""}。筛选只影响后台视图，不会改变用户端或商家端数据。
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
                  审核、上下架、库存、图片和用户端可见状态集中核对。当前显示 {filteredProducts.length} 条。
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
            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl bg-[#F7F8FA] p-6 text-center text-sm text-[#666666]">
                没有符合当前筛选的商品。
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-[#F7F8FA] text-[#666666]">
                  <tr>
                    <th className="px-4 py-3 font-medium">商品</th>
                    <th className="px-4 py-3 font-medium">门店</th>
                    <th className="px-4 py-3 text-right font-medium">价格/结算</th>
                    <th className="px-4 py-3 text-right font-medium">库存</th>
                    <th className="px-4 py-3 font-medium">审核状态</th>
                    <th className="px-4 py-3 font-medium">用户端</th>
                    <th className="px-4 py-3 font-medium">运营问题</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filteredProducts.map((product) => (
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
                        <ProductIssuePills product={product} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </Panel>
        </div>
      )}
    </PageShell>
  );
}

function ProductFilterLink({
  active,
  count,
  href,
  children,
  tone = "default"
}: {
  active: boolean;
  count: number;
  href: string;
  children: ReactNode;
  tone?: "default" | "orange" | "green" | "red";
}) {
  const activeClass =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "green"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : tone === "orange"
          ? "border-[#FFB020]/50 bg-[#FFF7ED] text-[#FF7A00]"
          : "border-black/10 bg-white text-[#111111]";

  return (
    <Link
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
        active ? activeClass : "border-black/5 bg-[#F7F8FA] text-[#666666]"
      }`}
      href={href}
    >
      {children}
      <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs">{count}</span>
    </Link>
  );
}

function PendingProductCard({ product }: { product: AdminProduct }) {
  const warnings = [
    !product.coverUrl ? "缺少主图" : "",
    (product.detailImageUrls?.length ?? 0) === 0 ? "未传详情图" : "",
    product.stock <= 0 ? "库存为 0" : "",
    typeof product.grossMargin === "number" && product.grossMargin < 0 ? "单件毛利为负" : ""
  ].filter(Boolean);

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
      {warnings.length ? (
        <div className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs text-[#A14A00]">
          审核关注：{warnings.join("、")}
        </div>
      ) : (
        <div className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs text-emerald-700">
          基础资料完整，通过后会同步到用户端商品详情和购物车。
        </div>
      )}
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

function ProductIssuePills({ product }: { product: AdminProduct }) {
  const issues = productIssues(product);

  if (issues.length === 0) {
    return (
      <StatusPill tone="green">
        <CheckCircle2 className="size-3.5" />
        正常
      </StatusPill>
    );
  }

  return (
    <div className="flex max-w-[230px] flex-wrap gap-1.5">
      {issues.map((issue) => (
        <StatusPill key={issue} tone={issue.includes("负") || issue.includes("售罄") ? "red" : "orange"}>
          <AlertTriangle className="size-3.5" />
          {issue}
        </StatusPill>
      ))}
    </div>
  );
}

function DataFlowCard({
  title,
  value,
  description,
  tone = "default"
}: {
  title: string;
  value: string;
  description: string;
  tone?: "default" | "orange" | "green";
}) {
  const toneClass =
    tone === "orange"
      ? "border-[#FFB020]/30 bg-[#FFF7ED]"
      : tone === "green"
        ? "border-emerald-100 bg-emerald-50"
        : "border-black/5 bg-[#F7F8FA]";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-sm font-semibold text-[#666666]">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-[#111111]">{value}</div>
      <div className="mt-2 text-sm leading-6 text-[#666666]">{description}</div>
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

function normalizeView(value?: string): ProductView {
  if (
    value === "pending" ||
    value === "visible" ||
    value === "blocked" ||
    value === "lowStock" ||
    value === "attention"
  ) {
    return value;
  }
  return "all";
}

function productFilterHref(view: ProductView, keyword: string) {
  const params = new URLSearchParams();
  if (view !== "all") {
    params.set("view", view);
  }
  if (keyword) {
    params.set("q", keyword);
  }
  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

function isLowStockProduct(product: AdminProduct) {
  return product.stock > 0 && product.stock <= 5;
}

function productIssues(product: AdminProduct) {
  return [
    !product.coverUrl ? "缺主图" : "",
    (product.detailImageUrls?.length ?? 0) === 0 ? "无详情图" : "",
    product.stock <= 0 ? "售罄" : "",
    isLowStockProduct(product) ? "低库存" : "",
    product.reviewStatus === "REJECTED" ? "已驳回" : "",
    !product.visibleToUser ? "用户不可见" : "",
    typeof product.grossMargin === "number" && product.grossMargin < 0 ? "负毛利" : ""
  ].filter(Boolean);
}

function productNeedsAttention(product: AdminProduct) {
  return productIssues(product).length > 0 || product.reviewStatus === "PENDING";
}

function productMatchesView(product: AdminProduct, view: ProductView) {
  if (view === "pending") return product.reviewStatus === "PENDING";
  if (view === "visible") return Boolean(product.visibleToUser);
  if (view === "blocked") return !product.visibleToUser;
  if (view === "lowStock") return isLowStockProduct(product);
  if (view === "attention") return productNeedsAttention(product);
  return true;
}

function productMatchesKeyword(product: AdminProduct, keyword: string) {
  if (!keyword) return true;
  const haystack = [
    product.name,
    product.categoryName,
    product.specs.join(" "),
    product.storeNames?.join(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(keyword.toLowerCase());
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
