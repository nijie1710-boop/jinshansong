<template>
  <view class="page merchant-detail-page">
    <view class="status-card">
      <view>
        <text class="status-title">{{ order.status }}</text>
        <text class="status-subtitle">{{ statusHint }}</text>
      </view>
      <text class="status-pill">{{ deliveryPillText }}</text>
    </view>

    <view class="card section">
      <text class="section-title">订单信息</text>
      <view class="info-row">
        <text>订单号</text>
        <text>{{ order.orderNo }}</text>
      </view>
      <view class="info-row">
        <text>收货人</text>
        <text>{{ order.customer }} {{ order.phone }}</text>
      </view>
      <view class="address-box">
        <text>收货地址</text>
        <text class="muted">{{ order.address }}</text>
      </view>
    </view>

    <view class="card product-card">
      <view class="product-image">金闪送</view>
      <view class="product-info">
        <text class="product-name">{{ order.productName }}</text>
        <text class="muted">骑手编号：{{ order.riderNo }} · x{{ order.quantity }}</text>
        <text class="price">¥{{ order.amount }}</text>
      </view>
    </view>

    <view class="card section">
      <view class="section-head">
        <text class="section-title">第三方聚合配送</text>
        <text :class="['delivery-badge', hasDeliveryTask ? 'active' : '']">
          {{ deliveryStatusText }}
        </text>
      </view>
      <view v-if="hasDeliveryTask" class="delivery-grid">
        <view class="delivery-item">
          <text>配送平台</text>
          <text>{{ deliveryProviderName }}</text>
        </view>
        <view class="delivery-item">
          <text>配送单号</text>
          <text>{{ deliveryProviderOrderNo }}</text>
        </view>
        <view class="delivery-item">
          <text>骑手</text>
          <text>{{ deliveryRiderName }}</text>
        </view>
        <view class="delivery-item">
          <text>骑手电话</text>
          <text>{{ deliveryRiderPhone }}</text>
        </view>
        <view class="delivery-item">
          <text>配送费</text>
          <text>¥{{ deliveryFee }}</text>
        </view>
        <view class="delivery-item">
          <text>距离</text>
          <text>{{ deliveryDistance }}</text>
        </view>
      </view>
      <view v-else class="delivery-empty">
        <text>商家接单后会自动呼叫聚合配送平台。</text>
      </view>
      <button
        v-if="deliveryFailed"
        class="retry-button"
        :disabled="retryingDelivery"
        @tap="retryDelivery"
      >
        {{ retryingDelivery ? "重发中..." : "重发配送单" }}
      </button>
    </view>

    <view class="card section">
      <text class="section-title">履约动作</text>
      <view class="timeline">
        <text :class="{ active: activeStep >= 0 }">已接单</text>
        <text :class="{ active: activeStep >= 1 }">备货完成</text>
        <text :class="{ active: activeStep >= 2 }">骑手取货</text>
        <text :class="{ active: activeStep >= 3 }">完成配送</text>
      </view>
    </view>

    <view class="actions">
      <button
        v-if="primaryAction"
        class="primary-button"
        :disabled="acting"
        @tap="handlePrimaryAction"
      >
        {{ acting ? "处理中..." : primaryAction.label }}
      </button>
      <button class="ghost-button" @tap="reloadOrder">刷新订单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onHide, onLoad, onPullDownRefresh, onShow, onUnload } from "@dcloudio/uni-app";
import { api, type MerchantOrder } from "../../services/api";

const emptyOrder: MerchantOrder = {
  id: "",
  orderNo: "-",
  status: "订单加载中",
  statusCode: "LOADING",
  customer: "-",
  phone: "",
  address: "-",
  productName: "订单商品",
  skuName: "",
  quantity: 0,
  amount: 0,
  payableAmount: 0,
  goodsAmount: 0,
  distance: "-",
  countdownSeconds: 0,
  deliveryTask: null,
  riderNo: "-",
  storeName: "-",
  createdAt: ""
};

const order = ref<MerchantOrder>({ ...emptyOrder });
const currentId = ref("");
const acting = ref(false);
const retryingDelivery = ref(false);
let pollTimer: ReturnType<typeof setInterval> | undefined;

const statusHint = computed(() => {
  if (order.value.statusCode === "STORE_ACCEPTED") {
    return order.value.deliveryTask ? "已呼叫聚合配送，请尽快备货" : "请尽快备货，等待骑手取货";
  }
  if (order.value.statusCode === "READY_FOR_PICKUP") return "备货已完成，已通知聚合平台可取货";
  if (order.value.statusCode === "RIDER_PICKED_UP") return "骑手已取货，等待完成配送";
  if (order.value.statusCode === "COMPLETED") return "订单已完成，可在后台查看净利润";
  return "订单履约中";
});

const deliveryPillText = computed(() => {
  return order.value.deliveryTask?.providerName || order.value.deliveryTask?.provider || "聚合配送";
});

const hasDeliveryTask = computed(() => Boolean(order.value.deliveryTask));
const deliveryStatusText = computed(() => order.value.deliveryTask?.statusText ?? "待发单");
const deliveryProviderName = computed(
  () => order.value.deliveryTask?.providerName || order.value.deliveryTask?.provider || "-"
);
const deliveryProviderOrderNo = computed(() => order.value.deliveryTask?.providerOrderNo || "-");
const deliveryRiderName = computed(() => order.value.deliveryTask?.riderName || "待分配");
const deliveryRiderPhone = computed(() => order.value.deliveryTask?.riderPhone || "-");
const deliveryFee = computed(() => order.value.deliveryTask?.fee ?? 0);
const deliveryFailed = computed(() => order.value.deliveryTask?.status === "FAILED");

const deliveryDistance = computed(() => {
  const distance = order.value.deliveryTask?.distanceKm;
  return distance === null || distance === undefined ? order.value.distance : `${distance}km`;
});

const activeStep = computed(() => {
  if (order.value.statusCode === "COMPLETED") return 3;
  if (order.value.statusCode === "RIDER_PICKED_UP") return 2;
  if (order.value.statusCode === "READY_FOR_PICKUP") return 1;
  if (order.value.statusCode === "STORE_ACCEPTED") return 0;
  return -1;
});

const primaryAction = computed<null | { action: "ready" | "pickup" | "complete"; label: string }>(
  () => {
    if (order.value.statusCode === "STORE_ACCEPTED") return { action: "ready", label: "备货完成" };
    if (order.value.statusCode === "READY_FOR_PICKUP")
      return { action: "pickup", label: "骑手已取货" };
    if (order.value.statusCode === "RIDER_PICKED_UP")
      return { action: "complete", label: "完成订单" };
    return null;
  }
);

async function reloadOrder() {
  try {
    if (currentId.value) {
      order.value = await api.order(currentId.value);
      return;
    }
    const orders = await api.orders();
    order.value = orders[0] ?? order.value;
    currentId.value = order.value.id;
  } catch {
    order.value = { ...emptyOrder, status: "订单加载失败" };
    uni.showToast({ title: "订单加载失败", icon: "none" });
  }
}

function shouldPoll() {
  return !["COMPLETED", "REFUNDED", "CANCELLED"].includes(order.value.statusCode);
}

function startPolling() {
  stopPolling();
  if (!currentId.value || !shouldPoll()) {
    return;
  }
  pollTimer = setInterval(() => {
    if (!shouldPoll()) {
      stopPolling();
      return;
    }
    void reloadOrder();
  }, 5000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }
}

async function handleAction(action: "ready" | "pickup" | "complete") {
  if (acting.value) {
    return;
  }
  acting.value = true;
  try {
    order.value = await api.action(order.value.id, action);
    uni.showToast({ title: "操作成功", icon: "success" });
    if (shouldPoll()) {
      startPolling();
    } else {
      stopPolling();
    }
  } catch {
    uni.showToast({ title: "操作失败，请检查后端服务", icon: "none" });
  } finally {
    acting.value = false;
  }
}

function handlePrimaryAction() {
  const next = primaryAction.value;
  if (next) {
    void handleAction(next.action);
  }
}

async function retryDelivery() {
  if (!order.value.id || retryingDelivery.value) {
    return;
  }
  retryingDelivery.value = true;
  try {
    order.value = await api.retryDelivery(order.value.id);
    uni.showToast({ title: "已重发配送单", icon: "success" });
  } catch {
    uni.showToast({ title: "重发失败，请联系后台", icon: "none" });
  } finally {
    retryingDelivery.value = false;
  }
}

onLoad((query) => {
  currentId.value = typeof query?.id === "string" ? query.id : "";
  void reloadOrder().then(startPolling);
});

onShow(() => {
  if (currentId.value) {
    void reloadOrder().then(startPolling);
  }
});

onHide(stopPolling);
onUnload(stopPolling);

onPullDownRefresh(() => {
  void reloadOrder().finally(() => {
    uni.stopPullDownRefresh();
  });
});
</script>

<style scoped>
.merchant-detail-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 20px;
  padding: 18px;
  background: linear-gradient(135deg, #ff7a00, #ff9f1a);
  color: #ffffff;
  box-shadow: 0 12px 28px rgba(255, 122, 0, 0.2);
}

.status-title {
  display: block;
  font-size: 22px;
  font-weight: 800;
}

.status-subtitle {
  display: block;
  margin-top: 5px;
  font-size: 12px;
}

.status-pill {
  border-radius: 999px;
  padding: 7px 10px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 12px;
}

.info-row,
.product-card,
.actions,
.section-head {
  display: flex;
  align-items: center;
}

.info-row {
  justify-content: space-between;
  font-size: 14px;
}

.address-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}

.section-head {
  justify-content: space-between;
}

.product-card {
  gap: 10px;
}

.product-image {
  display: flex;
  width: 68px;
  height: 68px;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: #fff2e8;
  color: #ff7a00;
  font-size: 11px;
  font-weight: 800;
}

.product-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

.product-name {
  font-weight: 800;
}

.timeline {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;
}

.timeline text {
  border-radius: 999px;
  padding: 7px 0;
  background: #f7f8fa;
  color: #666666;
  text-align: center;
  font-size: 12px;
}

.timeline .active {
  background: #fff2e8;
  color: #ff7a00;
  font-weight: 800;
}

.delivery-badge {
  border-radius: 999px;
  padding: 5px 9px;
  background: #f2f3f5;
  color: #666666;
  font-size: 11px;
  font-weight: 800;
}

.delivery-badge.active {
  background: #fff2e8;
  color: #ff7a00;
}

.delivery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.delivery-item {
  display: flex;
  min-height: 54px;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  border-radius: 14px;
  background: #f7f8fa;
  padding: 10px;
  font-size: 12px;
}

.delivery-item text:first-child {
  color: #666666;
}

.delivery-item text:last-child {
  color: #111111;
  font-weight: 800;
}

.delivery-empty {
  border-radius: 14px;
  background: #fff7ed;
  padding: 12px;
  color: #a35400;
  font-size: 12px;
}

.retry-button {
  margin-top: 10px;
  border-radius: 999px;
  background: #ff7a00;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
}

.actions {
  gap: 10px;
}

.actions button {
  flex: 1;
}
</style>
