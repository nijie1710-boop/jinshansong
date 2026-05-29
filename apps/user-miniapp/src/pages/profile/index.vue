<template>
  <view class="page profile-page">
    <view class="profile-card">
      <view class="avatar">
        <image class="avatar-logo" src="/static/brand/logo-icon.png" mode="aspectFit" />
      </view>
      <view>
        <text class="name">{{ profileName }}</text>
        <text class="muted">{{ profilePhone }}</text>
      </view>
    </view>

    <view class="stats">
      <view v-for="item in stats" :key="item.label">
        <text class="stat-value">{{ item.value }}</text>
        <text class="muted">{{ item.label }}</text>
      </view>
    </view>

    <view class="menu">
      <view v-for="item in menus" :key="item.title" class="menu-row" @tap="handleMenu(item)">
        <text>{{ item.title }}</text>
        <text class="muted">›</text>
      </view>
    </view>

    <button class="primary-button" @tap="goLogin">微信授权登录</button>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import {
  api,
  getCachedUserProfile,
  saveCachedUserProfile,
  type ApiCoupon,
  type UserProfile
} from "../../services/api";

type MenuItem = { title: string; url?: string };

const menus: MenuItem[] = [
  { title: "地址管理", url: "/pages/address/list" },
  { title: "优惠券", url: "/pages/coupon/index" },
  { title: "分享有礼", url: "/pages/share/index" },
  { title: "客服与售后", url: "/pages/support/index" }
];
const profile = ref<UserProfile | null>(getCachedUserProfile());
const profileStats = ref({
  orderCount: 0,
  couponCount: 0,
  referralCount: 0
});

const profileName = computed(() => profile.value?.nickname || "金闪送用户");
const profilePhone = computed(() => {
  const phone = profile.value?.phone || "13800000000";
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
});
const stats = computed(() => [
  { label: "订单", value: String(profileStats.value.orderCount) },
  { label: "优惠券", value: String(profileStats.value.couponCount) },
  { label: "分享奖励", value: String(profileStats.value.referralCount) }
]);

function goLogin() {
  uni.navigateTo({ url: "/pages/login/index" });
}

function handleMenu(item: MenuItem) {
  if (item.url) {
    uni.navigateTo({ url: item.url });
    return;
  }

  uni.navigateTo({ url: "/pages/support/index" });
}

function referralCoupons(coupons: ApiCoupon[]) {
  return coupons.filter((coupon) => coupon.type === "REFERRAL_COUPON");
}

async function loadProfile() {
  try {
    const [user, orders, coupons] = await Promise.all([api.me(), api.myOrders(), api.coupons()]);
    profile.value = user;
    saveCachedUserProfile(user);
    profileStats.value = {
      orderCount: orders.length,
      couponCount: coupons.filter((coupon) => coupon.usable).length,
      referralCount: referralCoupons(coupons).length
    };
  } catch {
    uni.showToast({ title: "我的数据加载失败", icon: "none" });
  }
}

onMounted(loadProfile);
onShow(loadProfile);

onPullDownRefresh(() => {
  void loadProfile().finally(() => {
    uni.stopPullDownRefresh();
  });
});
</script>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-card,
.stats,
.menu {
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06);
}

.profile-card,
.stats,
.menu-row {
  display: flex;
  align-items: center;
}

.profile-card {
  gap: 12px;
  padding: 18px;
  background: linear-gradient(135deg, #ffffff, #fff2e8);
}

.avatar {
  display: flex;
  width: 58px;
  height: 58px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(255, 122, 0, 0.18);
}

.avatar-logo {
  width: 48px;
  height: 48px;
}

.name {
  display: block;
  font-size: 20px;
  font-weight: 800;
}

.stats {
  justify-content: space-around;
  padding: 16px;
  text-align: center;
}

.stat-value {
  display: block;
  margin-bottom: 3px;
  font-size: 22px;
  font-weight: 800;
}

.menu {
  flex-direction: column;
  padding: 0 14px;
}

.menu-row {
  width: 100%;
  justify-content: space-between;
  border-bottom: 1px solid #f1f1f1;
  padding: 15px 0;
}

.menu-row:last-child {
  border-bottom: 0;
}

.profile-page > .primary-button {
  width: 100%;
}
</style>
