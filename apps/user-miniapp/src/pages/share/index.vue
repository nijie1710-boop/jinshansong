<template>
  <view class="page share-page">
    <view class="share-hero">
      <text class="eyebrow">金闪送分享有礼</text>
      <text class="title">邀请好友下单，奖励券实时入账</text>
      <text class="muted">好友完成首单后，奖励券会自动进入你的账户。</text>
      <button class="primary-button" :disabled="claiming" @tap="claimReferralCoupon">
        {{ claiming ? "领取中" : "领取奖励券" }}
      </button>
    </view>

    <view class="card section">
      <view class="section-head">
        <text class="section-title">奖励券记录</text>
        <text class="muted">{{ referralCoupons.length }} 张</text>
      </view>

      <view v-if="referralCoupons.length === 0" class="empty-row">
        <text class="muted">暂无分享奖励券，邀请好友下单后会展示在这里。</text>
      </view>

      <view v-for="coupon in referralCoupons" :key="coupon.id" class="coupon-row">
        <view>
          <text class="coupon-title">{{ coupon.title }}</text>
          <text class="muted">{{ coupon.expires }}</text>
        </view>
        <text class="amount">¥{{ coupon.amount }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import { api, type ApiCoupon } from "../../services/api";

const coupons = ref<ApiCoupon[]>([]);
const claiming = ref(false);
const referralCoupons = computed(() =>
  coupons.value.filter((coupon) => coupon.type === "REFERRAL_COUPON")
);

async function loadCoupons() {
  try {
    coupons.value = await api.coupons();
  } catch {
    coupons.value = [];
    uni.showToast({ title: "奖励券加载失败", icon: "none" });
  }
}

async function claimReferralCoupon() {
  if (claiming.value) {
    return;
  }

  claiming.value = true;
  try {
    await api.claimReferralCoupon();
    uni.showToast({ title: "奖励券已到账", icon: "success" });
    await loadCoupons();
  } catch {
    uni.showToast({ title: "领取失败或已达上限", icon: "none" });
  } finally {
    claiming.value = false;
  }
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
.share-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.share-hero {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 22px;
  padding: 20px;
  background:
    radial-gradient(circle at 86% 12%, rgba(255, 255, 255, 0.24), transparent 28%),
    linear-gradient(135deg, #ff7a00, #ffb020);
  color: #ffffff;
  box-shadow: 0 14px 30px rgba(255, 122, 0, 0.22);
}

.eyebrow {
  font-size: 12px;
  opacity: 0.88;
}

.title {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.28;
}

.share-hero .muted {
  color: rgba(255, 255, 255, 0.86);
  font-size: 13px;
  line-height: 1.45;
}

.share-hero .primary-button {
  margin-top: 4px;
  width: 100%;
  background: #ffffff;
  color: #ff7a00;
}

.section-head,
.coupon-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.empty-row {
  border-radius: 14px;
  padding: 14px;
  background: #f7f8fa;
}

.coupon-row {
  border-top: 1px solid #f1f1f1;
  padding: 14px 0 0;
}

.coupon-title {
  display: block;
  margin-bottom: 5px;
  font-weight: 800;
}

.amount {
  color: #ff3b30;
  font-size: 22px;
  font-weight: 800;
}
</style>
