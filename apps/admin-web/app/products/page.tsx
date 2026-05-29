import { formatCurrency, PageShell, Panel, StatusPill } from "../admin-ui";
import { getAdminProducts } from "../lib/api";
import { approveProductAction, rejectProductAction } from "./actions";

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
      <Panel>
        <div className="grid gap-3 text-sm text-[#666666] md:grid-cols-3">
          <div className="rounded-xl bg-[#FFF7ED] p-4">
            <div className="font-semibold text-[#111111]">1. 商家提交</div>
            <div className="mt-1">商家端上传主图、详情图、价格、库存和说明。</div>
          </div>
          <div className="rounded-xl bg-[#F7F8FA] p-4">
            <div className="font-semibold text-[#111111]">2. 后台审核</div>
            <div className="mt-1">审核通过后商品保持上架状态，用户端才可见。</div>
          </div>
          <div className="rounded-xl bg-[#ECFDF5] p-4">
            <div className="font-semibold text-[#111111]">3. 用户购买</div>
            <div className="mt-1">用户端下单后，订单会进入对应商家端待接单。</div>
          </div>
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
            <Panel key={`${product.id}-${product.skuId}`}>
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
                  <div className="truncate font-semibold">{product.name}</div>
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
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusPill tone={product.status === "ON_SALE" ? "green" : "gray"}>
                  {product.status === "ON_SALE" ? "商家已上架" : "商家已下架"}
                </StatusPill>
                <StatusPill tone={product.coverUrl ? "green" : "orange"}>
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
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-red-600">
                    {formatCurrency(product.price)}
                  </div>
                  <div className="text-xs text-[#666666]">
                    结算价 {formatCurrency(product.settlePrice)}
                  </div>
                  <div
                    className={`text-xs font-semibold ${
                      (product.grossMargin ?? 0) < 0 ? "text-red-600" : "text-[#0F9F6E]"
                    }`}
                  >
                    单件毛利 {formatCurrency(product.grossMargin ?? 0)}
                  </div>
                </div>
                <StatusPill tone={product.visibleToUser ? "green" : "gray"}>
                  {product.visibleToUser ? "用户端可见" : "用户端不可见"}
                </StatusPill>
              </div>
              <div className="mt-3 rounded-xl bg-[#FFF7ED] px-3 py-2 text-xs text-[#8A4B13]">
                {product.visibilityStatusText || "请确认审核、库存和上下架状态"}
              </div>
              {product.reviewRemark ? (
                <div className="mt-3 rounded-xl bg-[#F7F8FA] px-3 py-2 text-xs text-[#666666]">
                  {product.reviewRemark}
                </div>
              ) : null}
              {product.reviewStatus === "PENDING" ? (
                <div className="mt-4 space-y-2">
                  <form action={approveProductAction} className="flex gap-2">
                    <input type="hidden" name="productId" value={product.productId || product.id} />
                    <input
                      className="min-w-0 flex-1 rounded-lg bg-[#F7F8FA] px-3 py-2 text-xs outline-none ring-1 ring-black/5"
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
                      className="min-w-0 flex-1 rounded-lg bg-[#F7F8FA] px-3 py-2 text-xs outline-none ring-1 ring-black/5"
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
