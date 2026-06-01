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
        <view class="menu-main">
          <text class="menu-icon">{{ item.icon }}</text>
          <text class="menu-title">{{ item.title }}</text>
        </view>
        <text class="muted">›</text>
      </view>
    </view>

    <view class="account-actions">
      <button class="primary-button" @tap="refreshProfile">刷新我的数据</button>
      <button class="danger-button" @tap="switchAccount">退出登录 / 切换账号</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import {
  api,
  clearUserSession,
  getCachedUserProfile,
  saveCachedUserProfile,
  type ApiCoupon,
  type UserProfile
} from "../../services/api";

type MenuItem = { title: string; url?: string; icon: string };

const menus: MenuItem[] = [
  { title: "地址管理", url: "/pages/address/list", icon: "址" },
  { title: "优惠券", url: "/pages/coupon/index", icon: "券" },
  { title: "分享有礼", url: "/pages/share/index", icon: "礼" },
  { title: "关于我们", url: "/pages/about/index", icon: "关" },
  { title: "联系客服", url: "/pages/support/index", icon: "客" },
  { title: "隐私协议", url: "/pages/legal/index?type=privacy", icon: "隐" },
  { title: "用户协议", url: "/pages/legal/index?type=terms", icon: "协" }
];
const profile = ref<UserProfile | null>(getCachedUserProfile());
const profileStats = ref({
  orderCount: 0,
  couponCount: 0,
  referralCount: 0
});

const profileName = computed(() => profile.value?.nickname || "金闪送用户");
const profilePhone = computed(() => {
  const phone = profile.value?.phone || "";
  if (!phone) {
    return "未绑定手机号";
  }
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
});
const stats = computed(() => [
  { label: "订单", value: String(profileStats.value.orderCount) },
  { label: "优惠券", value: String(profileStats.value.couponCount) },
  { label: "分享奖励", value: String(profileStats.value.referralCount) }
]);

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

function refreshProfile() {
  void loadProfile();
}

function switchAccount() {
  uni.showModal({
    title: "切换账号",
    content: "退出当前用户登录后，可重新授权其他微信账号。",
    confirmText: "退出",
    confirmColor: "#ff3b30",
    success(result) {
      if (!result.confirm) {
        return;
      }
      clearUserSession();
      profile.value = null;
      profileStats.value = {
        orderCount: 0,
        couponCount: 0,
        referralCount: 0
      };
      uni.reLaunch({ url: "/pages/login/index" });
    }
  });
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
  gap: 12px;
  border-bottom: 1px solid #f1f1f1;
  padding: 13px 0;
}

.menu-row:last-child {
  border-bottom: 0;
}

.menu-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.menu-icon {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  flex: 0 0 32px;
  border-radius: 12px;
  background: #fff2e8;
  color: #ff7a00;
  font-size: 13px;
  font-weight: 900;
}

.menu-title {
  color: #111111;
  font-size: 14px;
  font-weight: 800;
}

.account-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.account-actions > button,
.profile-page > .primary-button {
  width: 100%;
}

.danger-button {
  height: 44px;
  border: 1px solid rgba(255, 59, 48, 0.35);
  border-radius: 999px;
  background: #ffffff;
  color: #ff3b30;
  font-size: 14px;
  font-weight: 900;
}
</style>
