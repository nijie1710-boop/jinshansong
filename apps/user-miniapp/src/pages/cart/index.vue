<template>
  <view class="page cart-page">
    <view class="cart-hero">
      <view>
        <text class="eyebrow">FUZHOU QUICK BUY</text>
        <text class="hero-title">购物车</text>
        <text class="hero-subtitle">先挑好数码配件，结算时统一匹配附近门店。</text>
      </view>
      <view class="hero-badge">闪</view>
    </view>

    <view v-if="cartItems.length === 0" class="card empty-card">
      <view class="empty-icon">购</view>
      <text class="section-title">购物车还是空的</text>
      <text class="muted">去首页或分类页挑选充电线、充电头、手机壳等附近现货。</text>
      <button class="primary-button" @tap="openCategory">去选商品</button>
    </view>

    <view v-else class="cart-list">
      <view class="cart-toolbar card">
        <view class="select-all tapable" hover-class="tap-active" @tap="toggleAll">
          <view class="check" :class="{ active: allSelected }">✓</view>
          <text>全选</text>
        </view>
        <text class="muted">共 {{ cartItems.length }} 件商品</text>
      </view>

      <view v-for="item in cartItems" :key="item.skuId" class="card cart-item">
        <view
          class="check tapable"
          hover-class="tap-active"
          :class="{ active: isSelected(item.skuId) }"
          @tap="toggleItem(item.skuId)"
          >✓</view
        >
        <view
          class="item-image"
          hover-class="tap-active"
          :style="{ background: displayImageUrl(item.imageUrl) ? '#f7f8fa' : '#fff2e8' }"
          @tap="openProduct(item)"
        >
          <image
            v-if="displayImageUrl(item.imageUrl)"
            class="item-cover"
            :src="displayImageUrl(item.imageUrl)"
            mode="aspectFill"
          />
          <text v-if="isHttpImageBlocked(item.imageUrl)" class="image-note">商品图片</text>
          <text v-else-if="!displayImageUrl(item.imageUrl)">金闪送</text>
        </view>
        <view class="item-main">
          <view class="item-head tapable" hover-class="tap-active" @tap="openProduct(item)">
            <text class="item-name">{{ item.name }}</text>
            <text class="remove tapable" hover-class="tap-active" @tap.stop="removeItem(item.skuId)"
              >删除</text
            >
          </view>
          <text class="muted">
            {{ item.skuName || "默认规格" }} · {{ item.storeName || "附近门店" }}
          </text>
          <view class="item-bottom">
            <view>
              <text class="price">¥{{ item.price }}</text>
              <text class="stock">库存 {{ item.stock ?? "-" }}</text>
            </view>
            <view class="stepper">
              <text hover-class="tap-active" @tap="changeQuantity(item, -1)">−</text>
              <text class="qty">{{ item.quantity }}</text>
              <text hover-class="tap-active" @tap="changeQuantity(item, 1)">＋</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="cartItems.length > 0" class="mobile-fixed-bottom bottom-bar">
      <view>
        <text class="muted">已选 {{ selectedItems.length }} 件</text>
        <text class="payable">¥{{ totalAmount }}</text>
      </view>
      <button class="primary-button" :disabled="selectedItems.length === 0" @tap="checkout">
        去结算
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import { api, type ApiProduct } from "../../services/api";
import {
  readCartItems,
  removeCartItems,
  saveCartItems,
  saveCheckoutCartItems,
  updateCartItemQuantity,
  type CartItem
} from "../../services/cart";
import { createTapGuard, shortToast } from "../../services/interaction";
import { cachedLocationQuery } from "../../services/location";

const cartItems = ref<CartItem[]>([]);
const selectedSkuIds = ref<string[]>([]);
const canMutate = createTapGuard(180);
const canNavigate = createTapGuard(520);
let lastRemoteRefreshAt = 0;

const selectedItems = computed(() =>
  cartItems.value.filter((item) => selectedSkuIds.value.includes(item.skuId))
);
const allSelected = computed(
  () => cartItems.value.length > 0 && selectedSkuIds.value.length === cartItems.value.length
);
const totalAmount = computed(() =>
  selectedItems.value
    .reduce((sum, item) => sum + item.price * item.quantity, 0)
    .toFixed(2)
);

function displayImageUrl(url?: string) {
  const value = (url || "").trim();
  // #ifdef MP-WEIXIN
  if (value.startsWith("http://")) {
    return "";
  }
  // #endif
  return value;
}

function isHttpImageBlocked(url?: string) {
  const value = (url || "").trim();
  // #ifdef MP-WEIXIN
  return value.startsWith("http://");
  // #endif
  return false;
}

function isSelected(skuId: string) {
  return selectedSkuIds.value.includes(skuId);
}

function syncSelectedWithItems(items: CartItem[]) {
  const availableIds = new Set(items.map((item) => item.skuId));
  const nextSelected = selectedSkuIds.value.filter((skuId) => availableIds.has(skuId));
  selectedSkuIds.value = nextSelected.length ? nextSelected : items.map((item) => item.skuId);
}

function loadCart() {
  const items = readCartItems();
  cartItems.value = items;
  syncSelectedWithItems(items);
}

async function refreshCartFromProducts() {
  lastRemoteRefreshAt = Date.now();
  const items = readCartItems();
  if (items.length === 0) {
    cartItems.value = [];
    selectedSkuIds.value = [];
    return;
  }

  const refreshed = await Promise.all(
    items.map(async (item) => {
      try {
        const product: ApiProduct = await api.product(item.productId || item.skuId, cachedLocationQuery());
        const sku = product.skus?.find((entry) => entry.id === item.skuId);
        if (!sku) {
          return { ...item, stock: 0 };
        }
        return {
          ...item,
          productId: product.id,
          name: product.name,
          skuName: sku.name,
          imageUrl: sku.imageUrl || product.coverUrl || item.imageUrl,
          price: sku.price,
          stock: sku.stock,
          storeName: product.nearestStoreName || product.storeNames?.[0] || item.storeName,
          quantity: Math.min(item.quantity, Math.max(1, sku.stock))
        };
      } catch {
        return { ...item, stock: 0 };
      }
    })
  );

  saveCartItems(refreshed);
  cartItems.value = refreshed;
  syncSelectedWithItems(refreshed);
}

function toggleItem(skuId: string) {
  if (!canMutate()) return;
  selectedSkuIds.value = isSelected(skuId)
    ? selectedSkuIds.value.filter((item) => item !== skuId)
    : [...selectedSkuIds.value, skuId];
}

function toggleAll() {
  if (!canMutate()) return;
  selectedSkuIds.value = allSelected.value ? [] : cartItems.value.map((item) => item.skuId);
}

function changeQuantity(item: CartItem, delta: number) {
  if (!canMutate()) return;
  const max = item.stock && item.stock > 0 ? item.stock : 99;
  const nextQuantity = Math.min(max, Math.max(1, item.quantity + delta));
  cartItems.value = updateCartItemQuantity(item.skuId, nextQuantity);
}

function removeItem(skuId: string) {
  if (!canMutate()) return;
  cartItems.value = removeCartItems([skuId]);
  selectedSkuIds.value = selectedSkuIds.value.filter((item) => item !== skuId);
  shortToast("已移除");
}

function openCategory() {
  if (!canNavigate()) return;
  uni.switchTab({ url: "/pages/category/index" });
}

function openProduct(item: CartItem) {
  if (!canNavigate()) return;
  uni.navigateTo({ url: `/pages/product/detail?id=${item.productId || item.skuId}` });
}

function checkout() {
  if (!canNavigate()) return;
  const items = selectedItems.value.filter((item) => item.stock === undefined || item.stock > 0);
  if (items.length === 0) {
    shortToast("请选择有库存商品");
    return;
  }
  saveCheckoutCartItems(items);
  uni.navigateTo({ url: "/pages/order/confirm?fromCart=1" });
}

onShow(() => {
  loadCart();
  if (Date.now() - lastRemoteRefreshAt > 15000) {
    void refreshCartFromProducts().catch(() => {
      shortToast("购物车刷新失败");
    });
  }
});

onPullDownRefresh(() => {
  void refreshCartFromProducts().finally(() => {
    uni.stopPullDownRefresh();
  });
});
</script>

<style scoped>
.cart-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 92px;
  background:
    radial-gradient(circle at 18% 0%, rgba(255, 176, 32, 0.2), transparent 25%),
    #f7f8fa;
}

.cart-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 118px;
  overflow: hidden;
  border-radius: 0 0 28px 28px;
  margin: -12px -12px 0;
  padding: 22px 20px;
  background: linear-gradient(135deg, #ff7a00, #ffb020);
  color: #ffffff;
}

.eyebrow,
.hero-subtitle,
.muted,
.stock {
  display: block;
  font-size: 12px;
}

.eyebrow {
  margin-bottom: 8px;
  opacity: 0.72;
  font-weight: 900;
}

.hero-title {
  display: block;
  font-size: 26px;
  font-weight: 900;
}

.hero-subtitle {
  margin-top: 7px;
  opacity: 0.88;
}

.hero-badge {
  display: flex;
  width: 64px;
  height: 64px;
  align-items: center;
  justify-content: center;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.2);
  font-size: 28px;
  font-weight: 900;
  transform: rotate(-12deg);
}

.empty-card {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 12px;
  padding: 28px 18px;
  text-align: center;
}

.empty-icon {
  display: flex;
  width: 72px;
  height: 72px;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  background: #fff2e8;
  color: #ff7a00;
  font-size: 26px;
  font-weight: 900;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cart-toolbar,
.select-all,
.cart-item,
.item-head,
.item-bottom,
.stepper,
.bottom-bar {
  display: flex;
  align-items: center;
}

.cart-toolbar,
.item-head,
.item-bottom,
.bottom-bar {
  justify-content: space-between;
}

.select-all {
  gap: 8px;
  color: #111111;
  font-weight: 800;
}

.check {
  display: flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  flex: 0 0 22px;
  border: 1px solid #e8e8e8;
  border-radius: 50%;
  background: #ffffff;
  color: transparent;
  font-size: 12px;
  font-weight: 900;
}

.check.active {
  border-color: #ff7a00;
  background: #ff7a00;
  color: #ffffff;
}

.cart-item {
  gap: 10px;
  align-items: flex-start;
}

.item-image {
  position: relative;
  display: flex;
  width: 76px;
  height: 76px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex: 0 0 76px;
  border-radius: 18px;
  color: #ff7a00;
  font-size: 11px;
  font-weight: 900;
}

.item-cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.image-note {
  position: relative;
  z-index: 1;
}

.item-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 7px;
}

.item-name {
  display: -webkit-box;
  overflow: hidden;
  color: #111111;
  font-size: 14px;
  font-weight: 900;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.remove {
  flex: 0 0 auto;
  color: #ff7a00;
  font-size: 12px;
  font-weight: 800;
}

.price {
  display: block;
  color: #ff3b30;
  font-size: 17px;
  font-weight: 900;
}

.stock {
  margin-top: 2px;
  color: #999999;
}

.stepper {
  overflow: hidden;
  border: 1px solid #f0e7df;
  border-radius: 999px;
  background: #fffaf4;
}

.stepper text {
  display: flex;
  width: 32px;
  height: 28px;
  align-items: center;
  justify-content: center;
  color: #ff7a00;
  font-size: 14px;
  font-weight: 900;
}

.stepper .qty {
  width: 36px;
  color: #111111;
  font-size: 13px;
}

.bottom-bar {
  gap: 16px;
  padding: 12px 12px calc(12px + env(safe-area-inset-bottom));
  background: #ffffff;
  box-shadow: 0 -10px 30px rgba(17, 17, 17, 0.08);
}

.payable {
  display: block;
  color: #ff3b30;
  font-size: 22px;
  font-weight: 900;
}

.bottom-bar button {
  width: 172px;
}

.tapable,
.item-image,
.stepper text {
  transition: transform 0.12s ease, opacity 0.12s ease;
}

.tap-active {
  transform: scale(0.96);
  opacity: 0.72;
}
</style>
