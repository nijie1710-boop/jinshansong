import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "./admin-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "金泽快送后台管理",
  description: "福州同城数码配件即时闪购平台后台"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
