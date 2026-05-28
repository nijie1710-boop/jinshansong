<template>
  <view class="page coupon-page">
    <view class="claim-card">
      <view>
        <text class="section-title">分享奖励券</text>
        <text class="muted">MVP 使用模拟老带新领取，后续接真实分享回流。</text>
      </view>
      <button class="primary-button" :disabled="claiming" @tap="claimReferralCoupon">
        {{ claiming ? "领取中" : "模拟领取" }}
      </button>
    </view>

    <view v-if="coupons.length === 0" class="empty-card">
      <text class="section-title">暂无优惠券</text>
      <text class="muted">新人首单、满减、老带新奖励会展示在这里</text>
    </view>

    <view
      v-for="coupon in coupons"
      :key="coupon.id"
      class="coupon-card"
      :class="{ disabled: !coupon.usable }"
    >
      <view class="amount">
        <text class="currency">¥</text>
        <text class="number">{{ coupon.amount }}</text>
      </view>
      <view class="coupon-info">
        <view class="coupon-title-row">
          <text class="title">{{ coupon.title }}</text>
          <text class="status" :class="{ inactive: !coupon.usable }">{{ coupon.statusText }}</text>
        </view>
        <text class="muted">{{ coupon.threshold }} · {{ coupon.expires }}</text>
      </view>
      <button class="use-button" :disabled="!coupon.usable" @tap="goUse">去使用</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import { api, type ApiCoupon } from "../../services/api";

const coupons = ref<ApiCoupon[]>([]);
const claiming = ref(false);

async function loadCoupons() {
  try {
    coupons.value = await api.coupons();
  } catch {
    coupons.value = [];
    uni.showToast({ title: "优惠券加载失败", icon: "none" });
  }
}

async function claimReferralCoupon() {
  if (claiming.value) {
    return;
  }

  claiming.value = true;
  try {
    await api.claimReferralCoupon();
    uni.showToast({ title: "已领取", icon: "success" });
    await loadCoupons();
  } catch {
    uni.showToast({ title: "领取失败或已达上限", icon: "none" });
  } finally {
    claiming.value = false;
  }
}

function goUse() {
  uni.switchTab({ url: "/pages/category/index" });
}

onMounted(loadCoupons);
onShow(loadCoupons);

onPullDownRefresh(() => {
  void loadCoupons().finally(() => {
    uni.stopPullDownRefresh();
  });
});
</script>

<style scoped>
.coupon-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.claim-card,
.empty-card,
.coupon-card {
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06);
}

.claim-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  background: linear-gradient(135deg, #ffffff, #fff2e8);
}

.claim-card .muted {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.4;
}

.claim-card button {
  width: 104px;
  height: 38px;
  font-size: 13px;
}

.empty-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 18px;
}

.coupon-card {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
  padding: 16px;
  background:
    radial-gradient(circle at right center, #f7f8fa 0 11px, transparent 12px),
    linear-gradient(135deg, #fff2e8, #ffffff);
}

.coupon-card.disabled {
  opacity: 0.62;
}

.amount {
  min-width: 68px;
  color: #ff3b30;
}

.currency {
  font-size: 14px;
}

.number {
  font-size: 34px;
  font-weight: 800;
}

.coupon-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

.coupon-title-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.title {
  overflow: hidden;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 2px 6px;
  background: #fff2e8;
  color: #ff7a00;
  font-size: 11px;
}

.status.inactive {
  background: #f1f1f1;
  color: #666666;
}

.use-button {
  height: 32px;
  border-radius: 999px;
  padding: 0 12px;
  background: #ff7a00;
  color: #ffffff;
  font-size: 12px;
  line-height: 32px;
}

.use-button::after {
  border: 0;
}
</style>
