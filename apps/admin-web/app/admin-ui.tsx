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
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          {description ? <p className="mt-1 text-sm text-[#666666]">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(17,17,17,0.05)] ring-1 ring-black/5">
      {title ? <h2 className="mb-4 text-base font-semibold">{title}</h2> : null}
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

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(17,17,17,0.05)] ring-1 ring-black/5">
      <div className="text-sm text-[#666666]">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
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
    <div className="flex h-48 items-end gap-3">
      {values.map((value, index) => (
        <div key={`${value}-${index}`} className="flex h-full flex-1 flex-col justify-end gap-2">
          <div
            className={`w-full rounded-t-md ${color}`}
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
