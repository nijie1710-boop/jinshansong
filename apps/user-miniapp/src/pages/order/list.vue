<template>
  <view class="page order-page">
    <view class="tabs">
      <text class="tab active">全部</text>
      <text class="tab">配送中</text>
      <text class="tab">已完成</text>
      <text class="tab">退款</text>
    </view>

    <view v-if="orders.length === 0" class="empty-card">
      <text class="section-title">暂无订单</text>
      <text class="muted">从首页选择商品后可体验完整下单流程</text>
    </view>

    <view v-for="order in orders" :key="order.id" class="order-card">
      <view class="order-head">
        <text class="order-no">{{ order.orderNo }}</text>
        <text class="status">{{ order.status }}</text>
      </view>
      <view class="product-row">
        <view class="product-image">金泽快送</view>
        <view class="product-info">
          <text class="product-name">{{ order.productName }}</text>
          <text class="muted">x{{ order.quantity }} · {{ order.storeName }}</text>
          <text class="muted">{{ order.createdAt }}</text>
        </view>
      </view>
      <view class="order-foot">
        <text class="pay">实付 ¥{{ order.payableAmount }}</text>
        <button class="ghost-button" @tap="openOrder(order.id)">查看详情</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import { api, type ApiOrder } from "../../services/api";

const orders = ref<ApiOrder[]>([]);

function openOrder(id: string) {
  uni.navigateTo({ url: `/pages/order/detail?id=${id}` });
}

async function loadOrders() {
  try {
    orders.value = await api.myOrders();
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
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-radius: 18px;
  padding: 6px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06);
}

.tab {
  border-radius: 999px;
  padding: 8px 0;
  color: #666666;
  text-align: center;
  font-size: 13px;
}

.tab.active {
  background: #fff2e8;
  color: #ff7a00;
  font-weight: 800;
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

.order-head,
.product-row,
.order-foot {
  display: flex;
  align-items: center;
}

.order-head,
.order-foot {
  justify-content: space-between;
}

.order-no {
  color: #666666;
  font-size: 12px;
}

.status {
  color: #ff7a00;
  font-weight: 800;
}

.product-row {
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
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

.product-name {
  font-weight: 800;
}

.pay {
  font-weight: 800;
}

.order-foot button {
  width: 96px;
}
</style>
