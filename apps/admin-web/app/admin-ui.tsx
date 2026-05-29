import type { ReactNode } from "react";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2
  }).format(value);
}

export function PageShell({
  title,
  description,
  actions,
  children
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[24px] bg-white p-5 shadow-[0_18px_45px_rgba(16,24,32,0.07)] ring-1 ring-black/5 md:p-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FF7A00] via-[#FFB020] to-transparent" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-[26px] font-semibold tracking-normal">{title}</h1>
            {description ? (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#666666]">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function Panel({
  title,
  children,
  className = ""
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[22px] bg-white p-5 shadow-[0_14px_38px_rgba(16,24,32,0.06)] ring-1 ring-black/5 md:p-6 ${className}`}
    >
      {title ? (
        <div className="mb-4 flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-[#FF7A00]" />
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string | number;
  tone?: "default" | "orange" | "red" | "green";
}) {
  const toneClass =
    tone === "orange"
      ? "text-[#FF7A00]"
      : tone === "red"
        ? "text-red-600"
        : tone === "green"
          ? "text-emerald-600"
          : "text-[#111111]";
  const barClass =
    tone === "red"
      ? "bg-red-500"
      : tone === "green"
        ? "bg-emerald-500"
        : tone === "orange"
          ? "bg-[#FF7A00]"
          : "bg-[#FF7A00]/70";

  return (
    <div className="relative overflow-hidden rounded-[22px] bg-white p-5 shadow-[0_14px_38px_rgba(16,24,32,0.06)] ring-1 ring-black/5">
      <div className={`absolute left-0 top-0 h-full w-1 ${barClass}`} />
      <div className="text-sm font-medium text-[#666666]">{label}</div>
      <div className={`mt-2 text-[28px] font-semibold leading-tight ${toneClass}`}>{value}</div>
    </div>
  );
}

export function MiniBars({
  values,
  tone = "orange"
}: {
  values: readonly number[];
  tone?: "orange" | "blue";
}) {
  if (values.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl bg-[#F7F8FA] text-sm text-[#666666]">
        暂无趋势数据
      </div>
    );
  }

  const max = Math.max(1, ...values);
  const color = tone === "orange" ? "bg-[#FF7A00]" : "bg-blue-500";

  return (
    <div className="flex h-48 items-end gap-3 rounded-2xl bg-[#F7F8FA] px-4 pb-3 pt-5">
      {values.map((value, index) => (
        <div key={`${value}-${index}`} className="flex h-full flex-1 flex-col justify-end gap-2">
          <div
            className={`w-full rounded-t-lg ${color} shadow-sm`}
            style={{ height: `${Math.max(16, (value / max) * 160)}px` }}
          />
          <span className="text-center text-xs text-[#666666]">{index + 1}</span>
        </div>
      ))}
    </div>
  );
}

export function StatusPill({ children, tone = "orange" }: { children: ReactNode; tone?: string }) {
  const className =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "red"
        ? "bg-red-50 text-red-700"
        : tone === "gray"
          ? "bg-gray-100 text-gray-700"
          : "bg-orange-50 text-[#FF7A00]";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
