"use client";

import {
  BadgePercent,
  Bell,
  ChartNoAxesCombined,
  LayoutDashboard,
  PackageCheck,
  Search,
  Settings,
  ShieldAlert,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Tags,
  WalletCards,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navGroups = [
  {
    title: "经营中台",
    items: [
      { href: "/dashboard", label: "数据看板", icon: LayoutDashboard },
      { href: "/orders", label: "订单管理", icon: ShoppingBag },
      { href: "/products", label: "商品管理", icon: PackageCheck },
      { href: "/categories", label: "分类管理", icon: Tags },
      { href: "/stores", label: "门店管理", icon: Store }
    ]
  },
  {
    title: "运营配置",
    items: [
      { href: "/promotions", label: "优惠活动", icon: BadgePercent },
      { href: "/configs", label: "系统配置", icon: SlidersHorizontal },
      { href: "/settings", label: "后台设置", icon: Settings }
    ]
  },
  {
    title: "财务与风控",
    items: [
      { href: "/finance", label: "财务统计", icon: ChartNoAxesCombined },
      { href: "/finance/settlements", label: "结算管理", icon: WalletCards },
      { href: "/risk", label: "风控中心", icon: ShieldAlert }
    ]
  }
] satisfies {
  title: string;
  items: { href: string; label: string; icon: LucideIcon }[];
}[];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[252px] shrink-0 border-r border-white/10 bg-[#0D1720] text-white shadow-2xl lg:sticky lg:top-0 lg:block lg:h-screen">
          <div className="flex h-full flex-col p-4">
            <div className="mb-4 rounded-[22px] bg-white/[0.06] p-3.5 ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
                  <img className="size-9 object-contain" src="/brand/logo-icon.png" alt="金闪送" />
                </div>
                <div>
                  <div className="text-lg font-semibold">金闪送</div>
                  <div className="mt-0.5 text-xs text-white/55">福州即时闪购运营台</div>
                </div>
              </div>
              <div className="mt-3 rounded-2xl bg-[#FF7A00] px-3 py-2.5 shadow-lg shadow-orange-950/20">
                <div className="text-sm font-semibold">本地真实接口联调</div>
                <div className="mt-0.5 text-xs text-white/78">订单、商品、门店数据已互通</div>
              </div>
            </div>

            <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.22)_transparent] [scrollbar-width:thin]">
              {navGroups.map((group) => (
                <div key={group.title}>
                  <div className="mb-2 px-2 text-[11px] font-semibold tracking-wide text-white/35">
                    {group.title}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

                      return (
                        <Link
                          aria-current={active ? "page" : undefined}
                          className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
                            active
                              ? "bg-white font-semibold shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
                              : "text-white/70 hover:bg-white/[0.08] hover:text-white"
                          }`}
                          href={item.href}
                          key={item.href}
                          style={active ? { color: "#111111" } : undefined}
                        >
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${
                              active
                                ? "bg-[#FFF1E5] text-[#FF7A00]"
                                : "bg-white/[0.07] text-white/64 group-hover:bg-white/[0.12]"
                            }`}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span
                            className={`min-w-0 flex-1 truncate ${
                              active ? "text-[#111111]" : "text-inherit"
                            }`}
                            style={active ? { color: "#111111" } : undefined}
                          >
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-4 rounded-[20px] bg-white/[0.06] p-3.5 text-sm ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <span className="text-white/68">上线状态</span>
                <span className="rounded-full bg-[#FFB020]/20 px-2 py-1 text-xs text-[#FFD38A]">
                  预部署
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FFB020]" />
              </div>
              <div className="mt-2 text-xs text-white/45">待补 HTTPS、支付、对象存储</div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-black/5 bg-white/[0.92] px-5 py-3 backdrop-blur-xl xl:px-8">
            <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#FF7A00]">FUZHOU DIGITAL QUICK COMMERCE</div>
                <div className="mt-0.5 text-lg font-semibold">运营管理台</div>
              </div>
              <div className="hidden min-w-[320px] max-w-[520px] flex-1 items-center gap-2 rounded-2xl bg-[#F5F6F8] px-3 py-2 text-sm text-[#999999] ring-1 ring-black/5 md:flex">
                <Search className="size-4 text-[#FF7A00]" />
                <span>搜索订单号、手机号、门店、商品</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="hidden items-center gap-2 rounded-full bg-[#ECFDF5] px-3 py-1.5 text-xs font-medium text-emerald-700 md:flex">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  API 正常
                </div>
                <button
                  className="flex size-10 items-center justify-center rounded-full bg-[#F5F6F8] text-[#666666] ring-1 ring-black/5"
                  type="button"
                >
                  <Bell className="size-4" />
                </button>
                <Link
                  className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:border-[#FF7A00]/35 hover:text-[#FF7A00]"
                  href="/login"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-[#FFF1E5] text-xs font-semibold text-[#FF7A00]">
                    A
                  </span>
                  <span className="hidden sm:inline">admin</span>
                </Link>
              </div>
            </div>
            <div className="mx-auto mt-3 max-w-[1480px] overflow-x-auto lg:hidden">
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
          <div className="mx-auto max-w-[1480px] px-5 py-6 xl:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
