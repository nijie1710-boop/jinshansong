<template>
  <view class="page merchant-home">
    <view class="merchant-hero">
      <view class="hero-top">
        <view class="brand-line">
          <view class="brand-badge">
            <image class="brand-logo-image" src="/static/brand/logo-icon.png" mode="aspectFit" />
          </view>
          <view>
            <text class="app-name">金闪送商家端</text>
            <text class="store-name">{{ storeName }}</text>
          </view>
        </view>
        <text class="online" :class="{ paused: !acceptingOrders }">{{ storeStatusText }}</text>
      </view>
      <view class="sound-state">新订单提示音：{{ voiceReminderText }}</view>
    </view>

    <view v-if="!hasMerchantAccess" class="audit-card">
      <view>
        <text class="section-title">商家入驻审核后使用</text>
        <text class="muted">提交入驻申请并由后台审核通过后，才能接单和上架商品。</text>
      </view>
      <button class="primary-button" @tap="goLogin">去申请入驻</button>
    </view>

    <view v-if="hasMerchantAccess" class="store-switch-card">
      <view>
        <text class="store-switch-label">当前经营门店</text>
        <text class="store-switch-name">{{ storeName }}</text>
      </view>
      <picker
        :range="storeOptionNames"
        :value="selectedStoreIndex"
        :disabled="storeOptions.length <= 1 || Boolean(switchingStoreCode)"
        @change="handleStorePickerChange"
      >
        <view class="store-switch-action">
          {{ storeOptions.length > 1 ? "切换门店" : "单门店" }}
        </view>
      </picker>
    </view>

    <view v-if="hasMerchantAccess" class="stats-grid">
      <view
        v-for="item in stats"
        :key="item.label"
        class="stat-card tappable"
        @tap="handleStatTap(item)"
      >
        <text class="stat-value">{{ item.value }}</text>
        <text class="muted">{{ item.label }}</text>
      </view>
    </view>

    <view v-if="hasMerchantAccess" class="delivery-status-card" :class="deliveryStatusClass">
      <view>
        <text class="section-title">配送发单状态</text>
        <text class="muted">{{ deliveryHint }}</text>
      </view>
      <text class="delivery-state">{{ deliveryStatusText }}</text>
    </view>

    <view v-if="hasMerchantAccess" class="action-card">
      <button
        class="ghost-button"
        :disabled="!acceptingOrders || savingAcceptSwitch"
        @tap="toggleAcceptOrders(false)"
      >
        暂停接单
      </button>
      <button
        class="primary-button"
        :disabled="acceptingOrders || savingAcceptSwitch"
        @tap="toggleAcceptOrders(true)"
      >
        开启接单
      </button>
    </view>

    <view v-if="hasMerchantAccess" class="quick-grid">
      <view class="quick-card" @tap="goProductManage">
        <view class="quick-icon">货</view>
        <view>
          <text class="quick-title">商品上架</text>
          <text class="muted">新增门店现货</text>
        </view>
      </view>
      <view class="quick-card" @tap="goPending">
        <view class="quick-icon">单</view>
        <view>
          <text class="quick-title">待接单</text>
          <text class="muted">3分钟倒计时</text>
        </view>
      </view>
    </view>

    <view v-if="hasMerchantAccess" class="section-head">
      <text class="section-title">待接单订单</text>
      <text class="muted">{{ orders.length }} 单待处理</text>
    </view>

    <view v-if="hasMerchantAccess && orders.length === 0" class="empty-card">
      <text class="section-title">暂无待接单</text>
      <text class="muted">用户完成支付后，新订单会出现在这里</text>
    </view>

    <view v-for="order in hasMerchantAccess ? orders : []" :key="order.id" class="order-card">
      <view class="order-top">
        <text class="order-no">#{{ order.orderNo }}</text>
        <view class="countdown">
          <text class="countdown-label">剩余</text>
          <text>{{ formatCountdown(order.countdownSeconds) }}</text>
        </view>
      </view>
      <text class="muted">{{ order.customer }} {{ order.phone }}</text>
      <text class="address">{{ order.address }}</text>
      <view class="product-line">
        <view class="product-image">金闪送</view>
        <view class="product-info">
          <text class="product-name">{{ order.productName }}</text>
          <view class="product-meta">
            <text>{{ order.distance }}</text>
            <text>x{{ order.quantity }}</text>
          </view>
        </view>
        <view class="price-box">
          <text class="price">¥{{ order.amount }}</text>
          <text class="muted">实付</text>
        </view>
      </view>
      <view class="button-row">
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
  getCachedMerchantStores,
  saveCachedMerchantStores,
  saveCachedMerchantStore,
  saveMerchantSession,
  type MerchantOrder,
  type MerchantStats,
  type MerchantStore
} from "../../services/api";

const orders = ref<MerchantOrder[]>([]);
const store = ref<MerchantStore | null>(getCachedMerchantStore());
const storeOptions = ref<MerchantStore[]>(initialStoreOptions());
const savingAcceptSwitch = ref(false);
const switchingStoreCode = ref("");
const merchantStats = ref<MerchantStats>({
  pending: 0,
  todayOrders: 0,
  waitingShipment: 0,
  pendingSettlement: 0
});
let countdownTimer: ReturnType<typeof setInterval> | undefined;
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let pendingSnapshotReady = false;
let lastPendingOrderIds = new Set<string>();
const storeName = computed(() => store.value?.name ?? orders.value[0]?.storeName ?? "待审核门店");
const hasMerchantAccess = computed(() => Boolean(store.value?.code));
const acceptingOrders = computed(() => Boolean(store.value?.acceptOrderSwitch));
const storeStatusText = computed(() => {
  if (!hasMerchantAccess.value) {
    return "待审核";
  }
  return acceptingOrders.value ? "接单中" : "暂停接单";
});
const voiceReminderText = computed(() => (store.value?.voiceReminderSwitch ? "已开启" : "已关闭"));
const deliveryStatusText = computed(() => store.value?.deliverySummary?.statusText ?? "配送未检查");
const deliveryStatusClass = computed(() => {
  const status = store.value?.deliverySummary?.status;
  if (status === "READY") return "ready";
  if (status === "MOCK_ONLY") return "mock";
  return "warning";
});
const deliveryHint = computed(() => {
  if (store.value?.deliverySummary?.readyForBusiness) {
    return "已具备真实平台发单条件";
  }
  if (store.value?.deliverySummary?.status === "MOCK_ONLY") {
    return "当前可接单联调；配送平台绑定完成后可发起正式配送";
  }
  return "请联系平台后台完成配送平台绑定";
});
const stats = computed(() => [
  { label: "待接单", value: String(merchantStats.value.pending), target: "pending" },
  { label: "今日订单", value: String(merchantStats.value.todayOrders), target: "orders" },
  { label: "待发货", value: String(merchantStats.value.waitingShipment), target: "accepted" },
  { label: "待结算", value: `¥${merchantStats.value.pendingSettlement}`, target: "reconciliation" }
]);
const storeOptionNames = computed(() =>
  storeOptions.value.length > 0 ? storeOptions.value.map((item) => item.name) : [storeName.value]
);
const selectedStoreIndex = computed(() =>
  Math.max(
    0,
    storeOptions.value.findIndex((item) => item.code === store.value?.code)
  )
);

function dedupeStores(stores: MerchantStore[]) {
  return Array.from(
    new Map(stores.filter((item) => item.code).map((item) => [item.code, item])).values()
  );
}

function initialStoreOptions() {
  return dedupeStores([
    ...(getCachedMerchantStores() || []),
    ...(store.value?.code ? [store.value] : [])
  ]);
}

function formatCountdown(seconds: number) {
  const min = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const sec = (seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

function goProductManage() {
  uni.switchTab({ url: "/pages/product/manage" });
}

function goPending() {
  uni.navigateTo({ url: "/pages/order/pending" });
}

function goLogin() {
  uni.navigateTo({ url: "/pages/login/index" });
}

function openOrderTab(tab: "all" | "pending" | "accepted") {
  uni.setStorageSync("jss_merchant_order_tab", tab);
  uni.switchTab({ url: "/pages/order/list" });
}

function handleStatTap(item: { target: string }) {
  if (item.target === "pending") {
    uni.navigateTo({ url: "/pages/order/pending" });
    return;
  }
  if (item.target === "accepted") {
    openOrderTab("accepted");
    return;
  }
  if (item.target === "reconciliation") {
    uni.switchTab({ url: "/pages/reconciliation/index" });
    return;
  }
  openOrderTab("all");
}

function syncStore(storeData: MerchantStore) {
  store.value = storeData;
  saveCachedMerchantStore(storeData);
  storeOptions.value = dedupeStores([storeData, ...storeOptions.value]);
  saveCachedMerchantStores(storeOptions.value);
}

async function loadMerchantHome() {
  store.value = getCachedMerchantStore();
  if (!hasMerchantAccess.value) {
    orders.value = [];
    pendingSnapshotReady = false;
    lastPendingOrderIds = new Set();
    merchantStats.value = {
      pending: 0,
      todayOrders: 0,
      waitingShipment: 0,
      pendingSettlement: 0
    };
    return;
  }

  try {
    const [storeData, pendingOrders, statsData, manageableStores] = await Promise.all([
      api.me(),
      api.pendingOrders(),
      api.stats(),
      api.stores().catch(() => [] as MerchantStore[])
    ]);
    notifyNewPendingOrders(pendingOrders, Boolean(storeData.voiceReminderSwitch));
    syncStore(storeData);
    storeOptions.value = dedupeStores([storeData, ...manageableStores]);
    saveCachedMerchantStores(storeOptions.value);
    orders.value = pendingOrders;
    merchantStats.value = statsData;
  } catch {
    orders.value = [];
    uni.showToast({ title: "商家数据加载失败", icon: "none" });
  }
}

async function handleStorePickerChange(event: { detail?: { value?: number | string } }) {
  const index = Number(event.detail?.value ?? 0);
  const target = storeOptions.value[index];
  if (!target?.code || target.code === store.value?.code || switchingStoreCode.value) {
    return;
  }

  switchingStoreCode.value = target.code;
  try {
    const session = await api.switchStore(target.code);
    saveMerchantSession(session);
    storeOptions.value = dedupeStores(session.stores?.length ? session.stores : [session.store]);
    saveCachedMerchantStores(storeOptions.value);
    syncStore(session.store);
    orders.value = [];
    pendingSnapshotReady = false;
    lastPendingOrderIds = new Set();
    await loadMerchantHome();
    uni.showToast({ title: `已切换到${session.store.name}`, icon: "none" });
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : "门店切换失败",
      icon: "none"
    });
  } finally {
    switchingStoreCode.value = "";
  }
}

function notifyNewPendingOrders(pendingOrders: MerchantOrder[], voiceEnabled: boolean) {
  const nextIds = new Set(pendingOrders.map((order) => order.id));
  const newOrders = pendingOrders.filter((order) => !lastPendingOrderIds.has(order.id));
  lastPendingOrderIds = nextIds;

  if (!pendingSnapshotReady) {
    pendingSnapshotReady = true;
    return;
  }
  if (newOrders.length === 0 || !voiceEnabled) {
    return;
  }

  uni.vibrateShort?.({ type: "medium" });
  uni.showToast({ title: `叮，新订单 ${newOrders.length} 单`, icon: "none" });
}

async function toggleAcceptOrders(enabled: boolean) {
  if (savingAcceptSwitch.value || acceptingOrders.value === enabled) {
    return;
  }

  const previousStore = store.value;
  if (previousStore) {
    store.value = { ...previousStore, acceptOrderSwitch: enabled };
  }
  savingAcceptSwitch.value = true;

  try {
    const updated = await api.updateStoreSettings({ acceptOrderSwitch: enabled });
    syncStore(updated);
    uni.showToast({ title: enabled ? "已开启接单" : "已暂停接单", icon: "success" });
  } catch {
    store.value = previousStore;
    uni.showToast({ title: "接单状态保存失败", icon: "none" });
  } finally {
    savingAcceptSwitch.value = false;
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
    void loadMerchantHome();
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
      await loadMerchantHome();
    }
  } catch {
    uni.showToast({ title: "操作失败，请检查后端服务", icon: "none" });
  }
}

onMounted(() => {
  void loadMerchantHome();
});

onShow(() => {
  store.value = getCachedMerchantStore();
  void loadMerchantHome();
  startRealtimeRefresh();
});

onHide(stopRealtimeRefresh);
onUnload(stopRealtimeRefresh);

onPullDownRefresh(() => {
  void loadMerchantHome().finally(() => {
    uni.stopPullDownRefresh();
  });
});
</script>

<style scoped>
.merchant-home {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background:
    radial-gradient(circle at 100% 0%, rgba(255, 122, 0, 0.18), transparent 24%),
    #f7f8fa;
}

.merchant-hero {
  position: relative;
  overflow: hidden;
  border-radius: 0 0 28px 28px;
  margin: -12px -12px 0;
  padding: 20px 16px 54px;
  background:
    radial-gradient(circle at 90% 0%, rgba(255, 255, 255, 0.24), transparent 30%),
    radial-gradient(circle at 100% 90%, rgba(255, 255, 255, 0.16), transparent 26%),
    linear-gradient(135deg, #ff7a00, #ff9f1a);
  color: #ffffff;
}

.merchant-hero::after {
  position: absolute;
  right: -22px;
  bottom: -36px;
  width: 128px;
  height: 128px;
  border-radius: 36px;
  background: rgba(255, 255, 255, 0.13);
  transform: rotate(-16deg);
  content: "";
}

.hero-top,
.brand-line,
.stats-grid,
.order-top,
.product-line,
.button-row,
.section-head,
.action-card {
  display: flex;
  align-items: center;
}

.hero-top,
.order-top,
.section-head {
  justify-content: space-between;
}

.app-name {
  display: block;
  font-size: 13px;
}

.brand-line {
  gap: 10px;
}

.brand-badge {
  display: flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(145, 64, 0, 0.16);
}

.brand-logo-image {
  width: 34px;
  height: 34px;
}

.store-name {
  display: block;
  margin-top: 5px;
  font-size: 20px;
  font-weight: 800;
}

.online {
  border-radius: 999px;
  padding: 6px 10px;
  background: #ffffff;
  color: #0f9f6e;
  font-size: 12px;
  font-weight: 800;
}

.online.paused {
  color: #ff7a00;
}

.sound-state {
  margin-top: 14px;
  border-radius: 12px;
  padding: 10px 11px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 12px;
  backdrop-filter: blur(10px);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 0;
}

.stat-card,
.action-card,
.audit-card,
.store-switch-card,
.delivery-status-card,
.order-card {
  border: 1px solid rgba(17, 17, 17, 0.025);
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(17, 17, 17, 0.065);
}

.store-switch-card {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: -42px;
  padding: 14px;
}

.store-switch-label,
.store-switch-name {
  display: block;
}

.store-switch-label {
  color: #999999;
  font-size: 11px;
}

.store-switch-name {
  margin-top: 4px;
  color: #111111;
  font-size: 15px;
  font-weight: 900;
}

.store-switch-action {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 8px 10px;
  background: #fff2e8;
  color: #ff7a00;
  font-size: 12px;
  font-weight: 900;
}

.audit-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: -34px;
  padding: 16px;
}

.audit-card .muted {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.45;
}

.audit-card button {
  width: 100%;
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

.stat-card {
  padding: 12px 6px;
  text-align: center;
}

.stat-card.tappable {
  position: relative;
}

.stat-card.tappable:active,
.quick-card:active {
  transform: scale(0.98);
  opacity: 0.86;
}

.stat-value {
  display: block;
  margin-bottom: 4px;
  font-size: 17px;
  font-weight: 800;
}

.action-card {
  gap: 10px;
  padding: 12px;
}

.delivery-status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid rgba(255, 122, 0, 0.1);
  padding: 15px;
}

.delivery-status-card .muted {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.45;
}

.delivery-status-card.mock {
  background: linear-gradient(135deg, #ffffff, #fff8ed);
}

.delivery-status-card.ready {
  border-color: rgba(16, 185, 129, 0.18);
  background: linear-gradient(135deg, #ffffff, #ecfdf5);
}

.delivery-status-card.warning {
  border-color: rgba(239, 68, 68, 0.14);
}

.delivery-state {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 7px 10px;
  background: #fff3e3;
  color: #ff7a00;
  font-size: 12px;
  font-weight: 800;
}

.delivery-status-card.ready .delivery-state {
  background: #ecfdf5;
  color: #059669;
}

.delivery-status-card.warning .delivery-state {
  background: #fef2f2;
  color: #dc2626;
}

.action-card button {
  flex: 1;
}

.action-card button[disabled] {
  opacity: 0.45;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.quick-card {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(17, 17, 17, 0.025);
  border-radius: 20px;
  padding: 13px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(17, 17, 17, 0.06);
}

.quick-icon {
  display: flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255, 122, 0, 0.12), rgba(255, 176, 32, 0.22));
  color: #ff7a00;
  font-weight: 800;
}

.quick-title {
  display: block;
  margin-bottom: 4px;
  font-weight: 800;
}

.quick-card .muted {
  font-size: 12px;
}

.order-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 9px;
  border: 1px solid rgba(255, 122, 0, 0.08);
  border-radius: 20px;
  padding: 13px;
  box-shadow: 0 12px 30px rgba(17, 17, 17, 0.08);
}

.order-card::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, #ff7a00, #ffb020);
  content: "";
}

.order-no,
.product-name {
  font-weight: 800;
}

.countdown {
  display: flex;
  min-width: 76px;
  flex-direction: column;
  align-items: center;
  border-radius: 14px;
  padding: 6px 9px;
  background: linear-gradient(135deg, #ff7a00, #ffb020);
  color: #ffffff;
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 8px 18px rgba(255, 122, 0, 0.2);
}

.countdown-label {
  margin-bottom: 4px;
  font-size: 10px;
  font-weight: 600;
  opacity: 0.86;
}

.address {
  color: #111111;
  font-size: 13px;
  line-height: 1.4;
}

.product-line {
  gap: 9px;
  border-radius: 16px;
  padding: 8px;
  background: linear-gradient(135deg, #fffaf4, #ffffff);
}

.product-image {
  display: flex;
  width: 54px;
  height: 54px;
  flex: 0 0 54px;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
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
  gap: 4px;
}

.product-name {
  overflow: hidden;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-meta {
  display: flex;
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
  min-width: 45px;
  flex-direction: column;
  align-items: flex-end;
  align-self: stretch;
  justify-content: center;
}

.button-row {
  gap: 10px;
}

.button-row button {
  flex: 1;
  height: 46px;
}

.button-row .primary-button {
  background: linear-gradient(135deg, #ff7a00, #ff9f1a);
  box-shadow: 0 10px 20px rgba(255, 122, 0, 0.24);
}

.button-row .ghost-button {
  border: 1.5px solid #ff7a00;
}
</style>
