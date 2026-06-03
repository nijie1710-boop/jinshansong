<template>
  <view class="page reconciliation-page">
    <view class="summary-card">
      <text class="muted">本周待结算金额</text>
      <text class="amount">¥{{ data.pendingAmount }}</text>
      <text class="muted">{{ data.period || "本周" }} · 商品货款 + 履约佣金</text>
    </view>

    <view class="card withdraw-card">
      <view class="withdraw-head">
        <view>
          <text class="section-title">提现处理</text>
          <text class="muted">平台审核通过后人工打款到商家账户</text>
        </view>
        <text class="status-chip">{{ withdrawal.latest?.statusText || "可申请" }}</text>
      </view>
      <view class="withdraw-balance">
        <view>
          <text class="muted">当前可申请</text>
          <text class="withdraw-amount">¥{{ withdrawal.availableAmount }}</text>
        </view>
        <button
          class="withdraw-button"
          :disabled="!withdrawal.canApply || applying"
          @tap="applyWithdrawal"
        >
          {{ applying ? "提交中..." : "申请提现" }}
        </button>
      </view>
      <view class="withdraw-grid">
        <view>
          <text>¥{{ withdrawal.pendingReviewAmount }}</text>
          <text class="muted">待审核</text>
        </view>
        <view>
          <text>¥{{ withdrawal.approvedAmount }}</text>
          <text class="muted">待打款</text>
        </view>
        <view>
          <text>¥{{ withdrawal.paidAmount }}</text>
          <text class="muted">已打款</text>
        </view>
      </view>
    </view>

    <view class="metric-grid">
      <view v-for="item in metrics" :key="item.label" class="metric-card">
        <text class="metric-value">{{ item.value }}</text>
        <text class="muted">{{ item.label }}</text>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">结算明细</text>
      <view v-if="data.items.length === 0" class="empty-row">
        <text class="muted">暂无已完成订单，完成配送后会生成待结算明细</text>
      </view>
      <view v-for="item in data.items" :key="item.orderId" class="bill-row">
        <view>
          <text class="date">{{ item.date }}</text>
          <text class="muted">{{ item.orderNo }} · {{ item.productName }}</text>
        </view>
        <view class="right">
          <text class="price">¥{{ item.amount }}</text>
          <text :class="item.status === '待结算' ? 'pending' : 'settled'">{{ item.status }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onMounted } from "vue";
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import { api, type MerchantReconciliation } from "../../services/api";

const data = ref<MerchantReconciliation>({
  period: "",
  store: { id: "", code: "", name: "" },
  pendingAmount: 0,
  settledAmount: 0,
  weeklyOrderCount: 0,
  goodsAmount: 0,
  weeklyCommission: 0,
  withdrawal: {
    availableAmount: 0,
    pendingReviewAmount: 0,
    approvedAmount: 0,
    paidAmount: 0,
    canApply: false,
    latest: null
  },
  items: []
});
const applying = ref(false);

const withdrawal = computed(
  () =>
    data.value.withdrawal ?? {
      availableAmount: 0,
      pendingReviewAmount: 0,
      approvedAmount: 0,
      paidAmount: 0,
      canApply: false,
      latest: null
    }
);

const metrics = computed(() => [
  { label: "本周订单数", value: String(data.value.weeklyOrderCount) },
  { label: "商品货款", value: `¥${data.value.goodsAmount}` },
  { label: "履约佣金", value: `¥${data.value.weeklyCommission}` }
]);

async function loadReconciliation() {
  try {
    data.value = await api.reconciliation();
  } catch {
    data.value = { ...data.value, items: [] };
    uni.showToast({ title: "对账数据加载失败", icon: "none" });
  }
}

async function applyWithdrawal() {
  if (!withdrawal.value.canApply || applying.value) {
    return;
  }

  applying.value = true;
  try {
    data.value = await api.applyWithdrawal();
    uni.showToast({ title: "提现申请已提交", icon: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提现申请失败";
    uni.showToast({ title: message, icon: "none" });
  } finally {
    applying.value = false;
  }
}

onMounted(loadReconciliation);
onShow(loadReconciliation);

onPullDownRefresh(() => {
  void loadReconciliation().finally(() => {
    uni.stopPullDownRefresh();
  });
});
</script>

<style scoped>
.reconciliation-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  border-radius: 20px;
  padding: 18px;
  background: linear-gradient(135deg, #ff7a00, #ffb020);
  color: #ffffff;
  box-shadow: 0 12px 28px rgba(255, 122, 0, 0.2);
}

.summary-card .muted {
  color: rgba(255, 255, 255, 0.84);
}

.amount {
  font-size: 32px;
  font-weight: 800;
}

.withdraw-card {
  gap: 14px;
}

.withdraw-head,
.withdraw-balance,
.withdraw-grid {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.withdraw-head {
  gap: 10px;
}

.status-chip {
  border-radius: 999px;
  background: #fff2e8;
  color: #ff7a00;
  padding: 5px 9px;
  font-size: 12px;
  font-weight: 800;
}

.withdraw-amount {
  display: block;
  margin-top: 4px;
  font-size: 26px;
  font-weight: 900;
}

.withdraw-button {
  width: 116px;
  height: 42px;
  border-radius: 999px;
  background: #ff7a00;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
  line-height: 42px;
}

.withdraw-button[disabled] {
  background: #f1f1f1;
  color: #9a9a9a;
}

.withdraw-grid {
  border-radius: 16px;
  background: #f7f8fa;
  padding: 12px;
  text-align: center;
}

.withdraw-grid view {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  font-weight: 800;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.metric-card {
  border-radius: 18px;
  padding: 12px 6px;
  background: #ffffff;
  text-align: center;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06);
}

.metric-value {
  display: block;
  margin-bottom: 4px;
  font-size: 16px;
  font-weight: 800;
}

.bill-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f1f1f1;
  padding-bottom: 11px;
}

.bill-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.empty-row {
  border-radius: 14px;
  padding: 12px;
  background: #f7f8fa;
}

.date {
  display: block;
  margin-bottom: 4px;
  font-weight: 800;
}

.right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.pending {
  color: #ff7a00;
}

.settled {
  color: #0f9f6e;
}
</style>
