"use client";

import type { FormEvent } from "react";
import { useState } from "react";

const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
const API_BASE_URL = rawBaseUrl.endsWith("/api") ? rawBaseUrl : `${rawBaseUrl}/api`;

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (newPassword.length < 8) {
      setMessageTone("error");
      setMessage("新密码至少需要 8 位。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessageTone("error");
      setMessage("两次输入的新密码不一致。");
      return;
    }

    const token = window.localStorage.getItem("jss_admin_token") || "";
    if (!token) {
      setMessageTone("error");
      setMessage("请先登录后台管理系统。");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/auth/change-password`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": token
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "密码修改失败");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessageTone("success");
      setMessage("密码已更新，下次登录请使用新密码。");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "密码修改失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={handleSubmit}>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium text-[#555555]">当前密码</span>
        <input
          autoComplete="current-password"
          className="h-11 rounded-xl border border-black/10 bg-white px-3 outline-none focus:border-[#FF7A00]"
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="请输入当前密码"
          type="password"
          value={currentPassword}
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium text-[#555555]">新密码</span>
        <input
          autoComplete="new-password"
          className="h-11 rounded-xl border border-black/10 bg-white px-3 outline-none focus:border-[#FF7A00]"
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="至少 8 位"
          type="password"
          value={newPassword}
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium text-[#555555]">确认新密码</span>
        <input
          autoComplete="new-password"
          className="h-11 rounded-xl border border-black/10 bg-white px-3 outline-none focus:border-[#FF7A00]"
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="再次输入新密码"
          type="password"
          value={confirmPassword}
        />
      </label>
      <div className="flex items-end">
        <button
          className="h-11 rounded-xl bg-[#111111] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "保存中" : "修改密码"}
        </button>
      </div>
      {message ? (
        <div
          className={`md:col-span-4 rounded-xl px-3 py-2 text-sm ${
            messageTone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      ) : null}
    </form>
  );
}
