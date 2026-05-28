<template>
  <view class="page pending-page">
    <view class="reminder-card">
      <view>
        <text class="section-title">新订单提示音</text>
        <text class="muted">{{ voiceReminderText }}</text>
      </view>
      <switch
        :checked="Boolean(store?.voiceReminderSwitch)"
        color="#FF7A00"
        :disabled="savingVoiceSwitch"
        @change="handleVoiceReminderChange"
      />
    </view>

    <view v-if="orders.length === 0" class="empty-card">
      <text class="section-title">暂无待接单</text>
      <text class="muted">完成一笔用户端模拟支付后，这里会实时展示待接单订单</text>
    </view>

    <view v-for="order in orders" :key="order.id" class="pending-card">
      <view class="order-top">
        <view>
          <text class="order-no">#{{ order.orderNo }}</text>
          <text class="muted">{{ order.distance }} · 30-60分钟</text>
        </view>
        <view class="countdown">
          <text class="countdown-label">剩余</text>
          <text>{{ formatCountdown(order.countdownSeconds) }}</text>
        </view>
      </view>

      <view class="customer-box">
        <text class="customer">{{ order.customer }} {{ order.phone }}</text>
        <text class="address">{{ order.address }}</text>
      </view>

      <view class="product-row">
        <view class="product-image">金闪送</view>
        <view class="product-info">
          <text class="product-name">{{ order.productName }}</text>
          <view class="product-meta">
            <text>{{ order.distance }}</text>
            <text>x{{ order.quantity }}</text>
            <text>骑手 {{ order.riderNo }}</text>
          </view>
        </view>
        <view class="price-box">
          <text class="price">¥{{ order.amount }}</text>
          <text class="muted">实付</text>
        </view>
      </view>

      <view class="actions">
        <button class="ghost-button" @tap="handleAction(order.id, 'reject')">拒单</button>
        <button class="primary-button" @tap="handleAction(order.id, 'accept')">接单</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onHide, onPullDownRefresh, onShow, onUnload } from "@dcloudio/uni-app";
import {
  api,
  getCachedMerchantStore,
  saveCachedMerchantStore,
  type MerchantOrder,
  type MerchantStore
} from "../../services/api";

const orders = ref<MerchantOrder[]>([]);
const store = ref<MerchantStore | null>(getCachedMerchantStore());
const savingVoiceSwitch = ref(false);
let countdownTimer: ReturnType<typeof setInterval> | undefined;
let refreshTimer: ReturnType<typeof setInterval> | undefined;
const voiceReminderText = computed(() =>
  store.value?.voiceReminderSwitch
    ? "模拟开启，收到新单时播放提示音"
    : "已关闭，新订单只在列表中展示"
);

function formatCountdown(seconds: number) {
  const min = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const sec = (seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

async function loadPendingOrders() {
  try {
    const [storeData, pendingOrders] = await Promise.all([api.me(), api.pendingOrders()]);
    store.value = storeData;
    saveCachedMerchantStore(storeData);
    orders.value = pendingOrders;
  } catch {
    orders.value = [];
    uni.showToast({ title: "待接单加载失败", icon: "none" });
  }
}

function getSwitchValue(event: Event) {
  return Boolean((event as unknown as { detail?: { value?: boolean } }).detail?.value);
}

async function handleVoiceReminderChange(event: Event) {
  const nextValue = getSwitchValue(event);
  const previousStore = store.value;
  if (previousStore) {
    store.value = { ...previousStore, voiceReminderSwitch: nextValue };
  }
  savingVoiceSwitch.value = true;

  try {
    const updated = await api.updateStoreSettings({ voiceReminderSwitch: nextValue });
    store.value = updated;
    saveCachedMerchantStore(updated);
    uni.showToast({ title: "提示音设置已保存", icon: "none" });
  } catch {
    store.value = previousStore;
    uni.showToast({ title: "保存失败，请先登录门店", icon: "none" });
  } finally {
    savingVoiceSwitch.value = false;
  }
}

function tickCountdown() {
  orders.value = orders.value.map((order) => ({
    ...order,
    countdownSeconds: Math.max(0, order.countdownSeconds - 1)
  }));
}

function startRealtimeRefresh() {
  stopRealtimeRefresh();
  countdownTimer = setInterval(tickCountdown, 1000);
  refreshTimer = setInterval(() => {
    void loadPendingOrders();
  }, 10000);
}

function stopRealtimeRefresh() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = undefined;
  }
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
}

async function handleAction(id: string, action: "accept" | "reject") {
  try {
    const updated = await api.action(id, action);
    uni.showToast({ title: action === "accept" ? "已接单" : "已拒单", icon: "success" });
    if (action === "accept") {
      setTimeout(() => {
        uni.navigateTo({ url: `/pages/order/detail?id=${updated.id}` });
      }, 400);
    } else {
      await loadPendingOrders();
    }
  } catch {
    uni.showToast({ title: "操作失败，请检查后端服务", icon: "none" });
  }
}

onMounted(() => {
  void loadPendingOrders();
});

onShow(() => {
  void loadPendingOrders();
  startRealtimeRefresh();
});

onHide(stopRealtimeRefresh);
onUnload(stopRealtimeRefresh);

onPullDownRefresh(() => {
  void loadPendingOrders().finally(() => {
    uni.stopPullDownRefresh();
  });
});
</script>

<style scoped>
.pending-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reminder-card {
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06);
}

.pending-card {
  border: 1px solid rgba(255, 122, 0, 0.08);
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(17, 17, 17, 0.08);
}

.empty-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  border-radius: 18px;
  padding: 18px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06);
}

.reminder-card,
.order-top,
.product-row,
.actions {
  display: flex;
  align-items: center;
}

.reminder-card,
.order-top {
  justify-content: space-between;
}

.reminder-card {
  padding: 14px;
}

.pending-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 13px;
}

.order-no {
  display: block;
  margin-bottom: 4px;
  font-size: 15px;
  font-weight: 800;
}

.countdown {
  display: flex;
  min-width: 70px;
  flex-direction: column;
  align-items: center;
  border-radius: 14px;
  padding: 6px 9px;
  background: linear-gradient(135deg, #ff7a00, #ffb020);
  color: #ffffff;
  text-align: center;
  font-size: 17px;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(255, 122, 0, 0.2);
}

.countdown-label {
  margin-bottom: 2px;
  font-size: 10px;
  font-weight: 600;
  opacity: 0.86;
}

.customer-box {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.customer {
  font-weight: 800;
}

.address {
  color: #666666;
  font-size: 13px;
  line-height: 1.4;
}

.product-row {
  gap: 9px;
  border-radius: 16px;
  padding: 8px;
  background: #fffaf4;
}

.product-image {
  display: flex;
  width: 54px;
  height: 54px;
  flex: 0 0 54px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255, 122, 0, 0.1), rgba(255, 176, 32, 0.22)), #ffffff;
  color: #ff7a00;
  font-size: 10px;
  font-weight: 800;
}

.product-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

.product-name {
  overflow: hidden;
  font-weight: 800;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  color: #666666;
  font-size: 12px;
}

.product-meta text {
  border-radius: 999px;
  padding: 2px 6px;
  background: #ffffff;
}

.price-box {
  display: flex;
  align-items: flex-end;
  align-self: stretch;
  justify-content: center;
  flex-direction: column;
  min-width: 45px;
}

.actions {
  gap: 10px;
  padding-top: 2px;
}

.actions button {
  flex: 1;
  height: 46px;
  font-size: 15px;
}

.actions .primary-button {
  background: #ff7a00;
  box-shadow: 0 10px 20px rgba(255, 122, 0, 0.24);
}

.actions .ghost-button {
  border: 1.5px solid #ff7a00;
}
</style>
