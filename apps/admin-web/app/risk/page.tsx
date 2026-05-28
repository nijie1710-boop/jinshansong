import { PageShell, Panel, StatusPill } from "../admin-ui";
import { getRiskGroups } from "../lib/api";
import { ignoreRiskAction, resolveRiskAction } from "./actions";

export default async function RiskPage() {
  const riskGroups = await getRiskGroups();
  const groups = [
    { title: "异常用户", items: riskGroups.users },
    { title: "异常订单", items: riskGroups.orders },
    { title: "异常骑手号", items: riskGroups.riders },
    { title: "异常推广码", items: riskGroups.promoters }
  ];

  return (
    <PageShell
      title="风控中心"
      description="按异常用户、异常订单、异常骑手号、异常推广码四类展示。"
    >
      <div className="grid gap-4 md:grid-cols-4">
        {groups.map((group) => (
          <MetricBox key={group.title} title={group.title} count={group.items.length} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <Panel key={group.title} title={group.title}>
            <div className="space-y-3">
              {group.items.length === 0 ? (
                <div className="rounded-lg bg-[#F7F8FA] p-4 text-sm text-[#666666]">
                  暂无打开中的异常事件
                </div>
              ) : (
                group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-lg bg-[#F7F8FA] p-3 xl:flex-row xl:items-center xl:justify-between"
                  >
                    <div>
                      <div className="font-medium">{item.target}</div>
                      <div className="mt-1 text-sm text-[#666666]">{item.label}</div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <StatusPill tone={item.level === "高" ? "red" : "orange"}>
                        {item.level}风险
                      </StatusPill>
                      <form action={resolveRiskAction}>
                        <input name="id" type="hidden" value={item.id} />
                        <button className="rounded-full bg-[#FF7A00] px-3 py-1.5 text-xs font-semibold text-white">
                          已处理
                        </button>
                      </form>
                      <form action={ignoreRiskAction}>
                        <input name="id" type="hidden" value={item.id} />
                        <button className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#666666]">
                          忽略
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        ))}
      </div>
    </PageShell>
  );
}

function MetricBox({ title, count }: { title: string; count: number }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="text-sm text-[#666666]">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-[#FF7A00]">{count}</div>
    </div>
  );
}
