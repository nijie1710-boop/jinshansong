import { PageShell, Panel, StatusPill } from "../admin-ui";
import { createCategoryAction, updateCategoryAction } from "./actions";
import { getAdminCategories } from "../lib/api";

export default async function CategoriesPage() {
  const categories = await getAdminCategories();

  return (
    <PageShell title="分类管理" description="分类从后端数据库读取，商品数量只统计已审核上架商品。">
      <Panel title="新增分类">
        <form
          action={createCategoryAction}
          className="grid gap-3 md:grid-cols-[1.2fr_1fr_120px_140px_auto]"
        >
          <label className="space-y-1 text-sm">
            <span className="text-[#666666]">分类名称</span>
            <input
              name="name"
              required
              placeholder="如 充电线"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-orange-100"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[#666666]">图标标识</span>
            <input
              name="icon"
              placeholder="如 cable"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-orange-100"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[#666666]">排序</span>
            <input
              name="sort"
              type="number"
              defaultValue={0}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-orange-100"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[#666666]">状态</span>
            <select
              name="status"
              defaultValue="ENABLED"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-orange-100"
            >
              <option value="ENABLED">启用</option>
              <option value="DISABLED">停用</option>
            </select>
          </label>
          <button
            type="submit"
            className="self-end rounded-xl bg-[#FF7A00] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#ee7100]"
          >
            创建分类
          </button>
        </form>
      </Panel>

      {categories.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <Panel key={category.id}>
              <form action={updateCategoryAction} className="space-y-4">
                <input name="id" type="hidden" value={category.id} />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-orange-50 font-semibold text-[#FF7A00]">
                      {category.icon}
                    </div>
                    <div>
                      <div className="font-semibold">{category.name}</div>
                      <div className="text-sm text-[#666666]">{category.count} 个可售商品</div>
                    </div>
                  </div>
                  <StatusPill tone={category.status === "DISABLED" ? "gray" : "green"}>
                    {category.statusText ?? "启用"}
                  </StatusPill>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-[#666666]">分类名称</span>
                    <input
                      name="name"
                      required
                      defaultValue={category.name}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[#666666]">图标标识</span>
                    <input
                      name="icon"
                      defaultValue={category.iconRaw ?? category.icon}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[#666666]">排序</span>
                    <input
                      name="sort"
                      type="number"
                      defaultValue={category.sort ?? 0}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[#666666]">状态</span>
                    <select
                      name="status"
                      defaultValue={category.status ?? "ENABLED"}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-orange-100"
                    >
                      <option value="ENABLED">启用</option>
                      <option value="DISABLED">停用</option>
                    </select>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl border border-[#FF7A00] bg-white px-4 py-2 text-sm font-semibold text-[#FF7A00] hover:bg-orange-50"
                >
                  保存分类
                </button>
              </form>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>
          <div className="text-sm text-[#666666]">
            暂无分类数据，请先运行 seed 或检查 API 服务。
          </div>
        </Panel>
      )}
    </PageShell>
  );
}
