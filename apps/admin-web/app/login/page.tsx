"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const API_BASE_URL = rawBaseUrl
  ? rawBaseUrl.endsWith("/api")
    ? rawBaseUrl
    : `${rawBaseUrl}/api`
  : "/api";

export default function LoginPage() {
  const router = useRouter();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ account, password })
      });

      if (!response.ok) {
        throw new Error("登录失败");
      }

      const session = (await response.json()) as { token: string; account: string; role: string };
      window.localStorage.setItem("jss_admin_token", session.token);
      window.localStorage.setItem("jss_admin_account", session.account);
      window.localStorage.setItem("jss_admin_role", session.role);
      document.cookie = `jss_admin_token=${encodeURIComponent(
        session.token
      )}; path=/; max-age=2592000; SameSite=Lax`;
      router.push("/dashboard");
    } catch {
      setError("账号或密码错误，或后端服务未启动");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 md:grid-cols-[1.1fr_0.9fr]">
      <div className="flex min-h-[520px] flex-col justify-between bg-gradient-to-br from-[#FF7A00] to-[#FFB020] p-10 text-white">
        <div>
          <div className="mb-6 flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
            <img className="size-14 object-contain" src="/brand/logo-icon.png" alt="金泽快送" />
          </div>
          <img
            className="mb-4 h-20 w-52 rounded-2xl bg-white/90 object-contain p-1"
            src="/brand/logo-horizontal.png"
            alt="金泽快送"
          />
          <h1 className="text-4xl font-semibold tracking-normal">金泽快送</h1>
          <p className="mt-3 max-w-sm text-white/85">福州同城数码配件即时闪购平台后台管理系统</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-white/15 p-4">极速送达</div>
          <div className="rounded-xl bg-white/15 p-4">正品保障</div>
          <div className="rounded-xl bg-white/15 p-4">门店履约</div>
        </div>
      </div>

      <div className="p-10">
        <h2 className="text-2xl font-semibold">后台登录</h2>
        <p className="mt-2 text-sm text-[#666666]">
          管理员账号已接入数据库权限，登录后可访问运营、商品、订单和财务后台。
        </p>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <input
            className="w-full rounded-lg border border-black/10 px-4 py-3"
            onChange={(event) => setAccount(event.target.value)}
            placeholder="请输入管理员账号"
            value={account}
          />
          <input
            className="w-full rounded-lg border border-black/10 px-4 py-3"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入管理员密码"
            type="password"
            value={password}
          />
          {error ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          ) : null}
          <button
            className="w-full rounded-lg bg-[#FF7A00] px-4 py-3 font-semibold text-white shadow-sm disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </section>
  );
}
