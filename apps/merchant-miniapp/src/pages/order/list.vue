<template>
  <view class="page order-page">
    <view class="tabs">
      <button class="tab" :class="{ active: activeTab === 'pending' }" @tap="activeTab = 'pending'">
        <text>待接单</text>
        <text class="tab-count">{{ countByTab("pending") }}</text>
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'accepted' }"
        @tap="activeTab = 'accepted'"
      >
        <text>已接单</text>
        <text class="tab-count">{{ countByTab("accepted") }}</text>
      </button>
      <button class="tab" :class="{ active: activeTab === 'pickup' }" @tap="activeTab = 'pickup'">
        <text>待取货</text>
        <text class="tab-count">{{ countByTab("pickup") }}</text>
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'completed' }"
        @tap="activeTab = 'completed'"
      >
        <text>已完成</text>
        <text class="tab-count">{{ countByTab("completed") }}</text>
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'cancelled' }"
        @tap="activeTab = 'cancelled'"
      >
        <text>已取消</text>
        <text class="tab-count">{{ countByTab("cancelled") }}</text>
      </button>
    </view>

    <view v-if="filteredOrders.length === 0" class="empty-card">
      <text class="section-title">暂无订单</text>
      <text class="muted">{{ emptyText }}</text>
    </view>

    <view v-for="order in filteredOrders" :key="order.id" class="order-card">
      <view class="order-top">
        <text class="order-no">#{{ order.orderNo }}</text>
        <text class="tag">{{ order.status }}</text>
      </view>
      <view class="body">
        <view class="product-image">金闪送</view>
        <view class="info">
          <text class="product-name">{{ order.productName }}</text>
          <text class="muted">{{ order.customer }} {{ order.phone }}</text>
          <text class="muted">{{ order.distance }} · {{ order.address }}</text>
        </view>
      </view>
      <view class="order-foot">
        <text class="price">¥{{ order.amount }}</text>
        <navigator class="primary-button nav-button" :url="`/pages/order/detail?id=${order.id}`">
          查看订单
        </navigator>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import { api, type MerchantOrder } from "../../services/api";

type TabKey = "pending" | "accepted" | "pickup" | "completed" | "cancelled";

const tabs: { key: TabKey; label: string; statuses: string[]; emptyText: string }[] = [
  {
    key: "pending",
    label: "待接单",
    statuses: ["PAID", "WAITING_STORE_ACCEPT", "TRANSFERRED"],
    emptyText: "待用户完成模拟支付后，这里会出现待接单订单"
  },
  {
    key: "accepted",
    label: "已接单",
    statuses: ["STORE_ACCEPTED"],
    emptyText: "接单后但未备货完成的订单会显示在这里"
  },
  {
    key: "pickup",
    label: "待取货",
    statuses: ["READY_FOR_PICKUP", "RIDER_PICKED_UP", "DELIVERING"],
    emptyText: "备货完成、等待骑手取货或配送中的订单会显示在这里"
  },
  {
    key: "completed",
    label: "已完成",
    statuses: ["COMPLETED"],
    emptyText: "完成配送后的订单会显示在这里"
  },
  {
    key: "cancelled",
    label: "已取消",
    statuses: ["CANCELLED", "REFUNDED", "EXCEPTION"],
    emptyText: "取消、退款或异常订单会显示在这里"
  }
];

const activeTab = ref<TabKey>("pending");
const orders = ref<MerchantOrder[]>([]);

const currentTab = computed(() => tabs.find((tab) => tab.key === activeTab.value) ?? tabs[0]);
const filteredOrders = computed(() =>
  orders.value.filter((order) => currentTab.value.statuses.includes(order.statusCode))
);
const emptyText = computed(() => currentTab.value.emptyText);

function countByTab(key: TabKey) {
  const tab = tabs.find((item) => item.key === key);
  if (!tab) return 0;
  return orders.value.filter((order) => tab.statuses.includes(order.statusCode)).length;
}

async function loadOrders() {
  try {
    orders.value = await api.orders();
  } catch {
    orders.value = [];
    uni.showToast({ title: "订单加载失败", icon: "none" });
  }
}

onMounted(loadOrders);
onShow(loadOrders);

onPullDownRefresh(() => {
  void loadOrders().finally(() => {
    uni.stopPullDownRefresh();
  });
});
</script>

<style scoped>
.order-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tabs {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  border-radius: 18px;
  padding: 7px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06);
}

.tab {
  display: flex;
  min-width: 62px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  background: transparent;
  color: #666666;
  font-size: 13px;
  line-height: 1;
}

.tab::after {
  display: none;
}

.tab.active {
  background: #fff2e8;
  color: #ff7a00;
  font-weight: 800;
}

.tab-count {
  display: flex;
  min-width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #f7f8fa;
  color: #999999;
  font-size: 10px;
  font-weight: 800;
}

.tab.active .tab-count {
  background: #ff7a00;
  color: #ffffff;
}

.order-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 18px;
  padding: 14px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06);
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

.order-top,
.body,
.order-foot {
  display: flex;
  align-items: center;
}

.order-top,
.order-foot {
  justify-content: space-between;
}

.order-no,
.product-name {
  font-weight: 800;
}

.body {
  gap: 10px;
}

.product-image {
  display: flex;
  width: 60px;
  height: 60px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: #fff2e8;
  color: #ff7a00;
  font-size: 10px;
  font-weight: 800;
}

.info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

.order-foot .nav-button {
  display: flex;
  width: 118px;
  height: 36px;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  text-decoration: none;
}
</style>
