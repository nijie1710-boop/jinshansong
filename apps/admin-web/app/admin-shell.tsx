"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navGroups = [
  {
    title: "经营",
    items: [
      { href: "/dashboard", label: "数据看板", mark: "看" },
      { href: "/orders", label: "订单管理", mark: "单" },
      { href: "/products", label: "商品管理", mark: "品" },
      { href: "/categories", label: "分类管理", mark: "类" },
      { href: "/stores", label: "门店管理", mark: "店" }
    ]
  },
  {
    title: "配置",
    items: [
      { href: "/promotions", label: "优惠活动", mark: "惠" },
      { href: "/configs", label: "系统配置", mark: "配" },
      { href: "/settings", label: "后台设置", mark: "设" }
    ]
  },
  {
    title: "财务与风控",
    items: [
      { href: "/finance", label: "财务统计", mark: "财" },
      { href: "/finance/settlements", label: "结算管理", mark: "结" },
      { href: "/risk", label: "风控中心", mark: "控" }
    ]
  }
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[248px] shrink-0 border-r border-white/10 bg-[#101820] text-white shadow-2xl lg:sticky lg:top-0 lg:block lg:h-screen">
          <div className="flex h-full flex-col p-5">
            <div className="mb-7 rounded-[22px] bg-white/8 p-4 ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
                  <img className="size-10 object-contain" src="/brand/logo-icon.png" alt="金闪送" />
                </div>
                <div>
                  <div className="text-lg font-semibold">金闪送</div>
                  <div className="mt-0.5 text-xs text-white/55">运营管理后台</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/70">
                <div className="rounded-xl bg-white/8 px-3 py-2">福州同城</div>
                <div className="rounded-xl bg-white/8 px-3 py-2">数码闪购</div>
              </div>
            </div>

            <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
              {navGroups.map((group) => (
                <div key={group.title}>
                  <div className="mb-2 px-2 text-[11px] font-semibold text-white/35">
                    {group.title}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const active =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

                      return (
                        <Link
                          aria-current={active ? "page" : undefined}
                          className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
                            active
                              ? "bg-white text-[#111111] shadow-sm"
                              : "text-white/72 hover:bg-white/10 hover:text-white"
                          }`}
                          href={item.href}
                          key={item.href}
                        >
                          <span
                            className={`flex size-7 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${
                              active
                                ? "bg-[#FFF1E5] text-[#FF7A00]"
                                : "bg-white/8 text-white/70 group-hover:bg-white/12"
                            }`}
                          >
                            {item.mark}
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-5 rounded-2xl bg-[#FF7A00] p-4 text-sm shadow-lg shadow-orange-950/20">
              <div className="font-semibold">预部署环境</div>
              <div className="mt-1 text-xs text-white/78">本地真实接口联调，等待 HTTPS 与支付配置。</div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-black/5 bg-white/92 px-5 py-4 backdrop-blur xl:px-8">
            <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm text-[#666666]">福州同城数码配件即时闪购平台</div>
                <div className="mt-0.5 text-xl font-semibold">运营管理台</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden rounded-full bg-[#FFF7ED] px-3 py-1.5 text-xs font-medium text-[#A14A00] md:block">
                  本地预览
                </div>
                <Link
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:border-[#FF7A00]/35 hover:text-[#FF7A00]"
                  href="/login"
                >
                  admin
                </Link>
              </div>
            </div>
            <div className="mx-auto mt-4 max-w-[1500px] overflow-x-auto lg:hidden">
              <div className="flex min-w-max gap-2 pb-1">
                {navGroups.flatMap((group) =>
                  group.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

                    return (
                      <Link
                        aria-current={active ? "page" : undefined}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                          active
                            ? "bg-[#FF7A00] text-white shadow-sm"
                            : "bg-[#F7F8FA] text-[#666666]"
                        }`}
                        href={item.href}
                        key={item.href}
                      >
                        {item.label}
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-[1500px] px-5 py-6 xl:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
