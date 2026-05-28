import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "金闪送后台管理",
  description: "福州同城数码配件即时闪购平台后台 MVP"
};

const navItems = [
  { href: "/dashboard", label: "数据看板" },
  { href: "/orders", label: "订单管理" },
  { href: "/products", label: "商品管理" },
  { href: "/categories", label: "分类管理" },
  { href: "/stores", label: "门店管理" },
  { href: "/promotions", label: "优惠活动" },
  { href: "/configs", label: "系统配置" },
  { href: "/finance", label: "财务统计" },
  { href: "/finance/settlements", label: "模拟结算" },
  { href: "/risk", label: "风控中心" },
  { href: "/settings", label: "后台设置" }
];

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="flex min-h-screen">
          <aside className="hidden w-64 shrink-0 bg-[#101820] p-5 text-white shadow-2xl lg:block">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
                <img className="size-9 object-contain" src="/brand/logo-icon.png" alt="金闪送" />
              </div>
              <div>
                <div className="text-lg font-semibold">金闪送</div>
                <div className="text-xs text-white/55">后台管理</div>
              </div>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-xl px-3 py-2.5 text-sm text-white/75 hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          <main className="min-w-0 flex-1">
            <header className="border-b border-black/5 bg-white/90 px-6 py-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-[#666666]">福州同城数码配件即时闪购平台</div>
                  <div className="text-xl font-semibold">第一阶段 MVP</div>
                </div>
                <Link
                  className="rounded-full border border-black/10 px-4 py-2 text-sm"
                  href="/login"
                >
                  admin
                </Link>
              </div>
            </header>
            <div className="p-6">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
