import { PageShell, Panel, StatusPill } from "../admin-ui";

export default function SettingsPage() {
  return (
    <PageShell title="后台设置" description="后台账号和权限的静态占位页。">
      <Panel>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-[#F7F8FA] p-4">
            <div className="font-semibold">admin</div>
            <div className="mt-2 text-sm text-[#666666]">超级管理员</div>
            <div className="mt-4">
              <StatusPill tone="green">启用</StatusPill>
            </div>
          </div>
          <div className="rounded-xl bg-[#F7F8FA] p-4">
            <div className="font-semibold">运营账号</div>
            <div className="mt-2 text-sm text-[#666666]">订单、商品、门店</div>
            <div className="mt-4">
              <StatusPill>待配置</StatusPill>
            </div>
          </div>
          <div className="rounded-xl bg-[#F7F8FA] p-4">
            <div className="font-semibold">财务账号</div>
            <div className="mt-2 text-sm text-[#666666]">财务统计、结算管理</div>
            <div className="mt-4">
              <StatusPill>待配置</StatusPill>
            </div>
          </div>
        </div>
      </Panel>
    </PageShell>
  );
}
