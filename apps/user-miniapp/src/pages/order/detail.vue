<template>
  <view class="page order-detail-page">
    <view class="status-card">
      <view>
        <text class="status-title">{{ order.status }}</text>
        <text class="status-subtitle">{{ statusHint }}</text>
      </view>
      <view class="eta">预计{{ order.eta }}</view>
    </view>

    <view class="card section">
      <text class="section-title">订单进度</text>
      <view class="progress">
        <view v-for="(step, index) in steps" :key="step" class="step">
          <view class="dot" :class="{ active: index <= activeStepIndex }">{{ index + 1 }}</view>
          <text>{{ step }}</text>
        </view>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">门店信息</text>
      <view class="store-row">
        <view>
          <text class="store-name">{{ order.storeName }}</text>
          <text class="muted">{{ order.storeAddress || "门店地址待同步" }}</text>
        </view>
        <text class="phone">☎</text>
      </view>
      <view class="button-row">
        <button class="ghost-button" @tap="callStore">联系门店</button>
        <button class="ghost-button" @tap="callRider">联系骑手</button>
      </view>
    </view>

    <view class="card product-card">
      <view class="product-image">
        <view class="mini-device"></view>
        <text>金闪送</text>
      </view>
      <view class="product-info">
        <text class="product-name">{{ order.productName }}</text>
        <text class="muted">骑手编号：{{ order.riderNo }} · x{{ order.quantity }}</text>
      </view>
      <text class="price">¥{{ order.goodsAmount }}</text>
    </view>

    <view class="card section">
      <text class="section-title">费用明细</text>
      <view class="fee-row">
        <text>商品金额</text>
        <text>¥{{ order.goodsAmount }}</text>
      </view>
      <view class="fee-row">
        <text>配送费</text>
        <text>¥{{ order.deliveryFeeCharged }}</text>
      </view>
      <view class="fee-row">
        <text>优惠金额</text>
        <text class="discount">-¥{{ order.userDiscountAmount }}</text>
      </view>
      <view class="fee-row total">
        <text>实付款</text>
        <text>¥{{ order.payableAmount }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onHide, onLoad, onPullDownRefresh, onShow, onUnload } from "@dcloudio/uni-app";
import { api, type ApiOrder } from "../../services/api";

const emptyOrder: ApiOrder = {
  id: "",
  orderNo: "-",
  status: "订单加载中",
  statusCode: "LOADING",
  payStatus: "UNPAID",
  pickStatus: "NOT_READY",
  productName: "订单商品",
  skuName: "",
  quantity: 0,
  goodsAmount: 0,
  deliveryFeeCharged: 0,
  userDiscountAmount: 0,
  payableAmount: 0,
  amount: 0,
  netProfit: 0,
  storeName: "-",
  storePhone: "",
  storeAddress: "",
  riderNo: "-",
  deliveryTask: null,
  receiver: "-",
  address: "-",
  createdAt: "",
  eta: "-"
};

const order = ref<ApiOrder>({ ...emptyOrder });
const currentId = ref("");
let pollTimer: ReturnType<typeof setInterval> | undefined;
const steps = ["已支付", "已接单", "已取货", "配送中", "已完成"];

const activeStepIndex = computed(() => {
  const status = order.value.statusCode;
  if (status === "COMPLETED") return 4;
  if (status === "DELIVERING") return 3;
  if (status === "RIDER_PICKED_UP") return 2;
  if (status === "READY_FOR_PICKUP") return 1;
  if (status === "STORE_ACCEPTED") return 1;
  if (status === "WAITING_STORE_ACCEPT" || status === "TRANSFERRED") return 0;
  return 0;
});

const statusHint = computed(() => {
  const status = order.value.statusCode;
  if (status === "WAITING_STORE_ACCEPT" || status === "TRANSFERRED")
    return "系统已匹配门店，等待商家接单";
  if (status === "STORE_ACCEPTED") return "商家已接单，正在备货";
  if (status === "READY_FOR_PICKUP") return "备货已完成，等待骑手取货";
  if (status === "RIDER_PICKED_UP" || status === "DELIVERING") return "骑手正在配送，请耐心等待";
  if (status === "COMPLETED") return "订单已送达，感谢使用金闪送";
  if (status === "REFUNDED") return "订单已退款";
  return "订单处理中";
});

async function loadOrder() {
  try {
    if (currentId.value) {
      order.value = await api.order(currentId.value);
      return;
    }
    const orders = await api.myOrders();
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
    void loadOrder();
  }, 5000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }
}

function makePhoneCall(phoneNumber: string, emptyTitle: string) {
  if (!phoneNumber) {
    uni.showToast({ title: emptyTitle, icon: "none" });
    return;
  }

  uni.makePhoneCall({
    phoneNumber,
    fail() {
      uni.showToast({ title: "请在微信内拨号联系", icon: "none" });
    }
  });
}

function callStore() {
  makePhoneCall(order.value.storePhone, "门店电话待同步");
}

function callRider() {
  makePhoneCall(order.value.deliveryTask?.riderPhone ?? "", "骑手电话待配送平台回传");
}

onLoad((query) => {
  currentId.value = typeof query?.id === "string" ? query.id : "";
  void loadOrder().then(startPolling);
});

onShow(() => {
  if (currentId.value) {
    void loadOrder().then(startPolling);
  }
});

onHide(stopPolling);
onUnload(stopPolling);

onPullDownRefresh(() => {
  void loadOrder().finally(() => {
    uni.stopPullDownRefresh();
  });
});
</script>

<style scoped>
.order-detail-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background:
    radial-gradient(circle at 100% 0%, rgba(255, 122, 0, 0.16), transparent 24%),
    #f7f8fa;
}

.status-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 106px;
  overflow: hidden;
  border-radius: 24px;
  padding: 18px;
  background:
    radial-gradient(circle at 92% 8%, rgba(255, 255, 255, 0.25), transparent 30%),
    linear-gradient(135deg, #ff7a00, #ff9f1a);
  color: #ffffff;
  box-shadow: 0 12px 28px rgba(255, 122, 0, 0.2);
}

.status-card::after {
  position: absolute;
  right: -20px;
  bottom: -34px;
  width: 116px;
  height: 116px;
  border-radius: 34px;
  background: rgba(255, 255, 255, 0.14);
  transform: rotate(-16deg);
  content: "";
}

.status-title {
  display: block;
  font-size: 24px;
  font-weight: 800;
}

.status-subtitle {
  display: block;
  margin-top: 6px;
  font-size: 12px;
}

.eta {
  border-radius: 999px;
  padding: 7px 10px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 12px;
  font-weight: 700;
}

.progress {
  position: relative;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 5px;
}

.progress::before {
  position: absolute;
  top: 11px;
  right: 10%;
  left: 10%;
  height: 2px;
  background: #f1f1f1;
  content: "";
}

.step {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #666666;
  font-size: 11px;
}

.dot {
  display: flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f1f1f1;
  color: #999999;
  font-size: 11px;
  font-weight: 800;
}

.dot.active {
  background: #ff7a00;
  color: #ffffff;
}

.store-row,
.product-card,
.fee-row,
.button-row {
  display: flex;
  align-items: center;
}

.store-row,
.fee-row {
  justify-content: space-between;
}

.store-name {
  display: block;
  margin-bottom: 5px;
  font-weight: 800;
}

.phone {
  display: flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fff2e8;
  color: #ff7a00;
  font-weight: 800;
}

.button-row {
  gap: 10px;
}

.button-row button {
  flex: 1;
}

.product-card {
  gap: 10px;
  align-items: flex-start;
}

.product-image {
  position: relative;
  display: flex;
  width: 68px;
  height: 68px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 18px;
  background:
    radial-gradient(circle at 70% 20%, rgba(255, 255, 255, 0.82), transparent 28%),
    linear-gradient(135deg, #fff2e8, #ffffff);
  color: #ff7a00;
  font-size: 11px;
  font-weight: 800;
}

.mini-device {
  position: absolute;
  width: 32px;
  height: 42px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.88);
  transform: rotate(-18deg);
}

.product-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

.product-name {
  font-weight: 800;
}

.discount {
  color: #ff3b30;
}

.total {
  border-top: 1px solid #f1f1f1;
  padding-top: 10px;
  font-size: 16px;
  font-weight: 800;
}
</style>
