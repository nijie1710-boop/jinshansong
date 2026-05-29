<template>
  <view class="page detail-page">
    <view
      class="product-visual"
      :style="{ background: displayImageUrl(product.coverUrl) ? '#f7f8fa' : product.imageTone }"
    >
      <image
        v-if="displayImageUrl(product.coverUrl)"
        class="cover-image"
        :src="displayImageUrl(product.coverUrl)"
        mode="aspectFill"
      />
      <view v-if="!displayImageUrl(product.coverUrl)" class="visual-device"></view>
      <text v-if="isHttpImageBlocked(product.coverUrl)" class="visual-brand visual-warning">
        HTTPS 后显示
      </text>
      <text v-else-if="!displayImageUrl(product.coverUrl)" class="visual-brand">金闪送</text>
      <text class="visual-hint">门店现货 · 同城即达</text>
    </view>

    <view class="card product-summary">
      <view class="price-row">
        <text class="price big-price">¥{{ product.price }}</text>
        <text class="origin">¥{{ product.originPrice }}</text>
      </view>
      <text class="product-title">{{ product.name }}</text>
      <view class="tag-row">
        <text v-for="tag in product.tags" :key="tag" class="tag">{{ tag }}</text>
        <text class="tag green">正品保障</text>
      </view>
    </view>

    <view class="card section">
      <view class="info-row">
        <text class="label">配送</text>
        <text>{{ product.nearestStoreName || "附近门店" }} 发货，30-60分钟送达</text>
      </view>
      <view class="info-row">
        <text class="label">门店</text>
        <text>{{ storeNamesText }}</text>
      </view>
      <view class="info-row">
        <text class="label">库存</text>
        <text
          >附近 {{ product.storeCount || product.storeNames?.length || 1 }} 家门店现货
          {{ product.stock }} 件</text
        >
      </view>
      <view class="info-row">
        <text class="label">服务</text>
        <text>正品保障 · 售后无忧 · 缺货秒退</text>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">规格选择</text>
      <view class="chip-row">
        <text v-for="spec in product.specs" :key="spec" class="chip active">{{ spec }}</text>
      </view>
      <view class="chip-row">
        <text class="chip active">{{ product.color }}</text>
        <text class="chip">黑色</text>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">商品说明</text>
      <text class="description">{{ product.description || "商家暂未填写详细说明" }}</text>
    </view>

    <view v-if="product.detailImageUrls.length > 0" class="card section">
      <text class="section-title">商品详情</text>
      <view v-for="url in product.detailImageUrls" :key="url" class="detail-image-wrap">
        <image
          v-if="displayImageUrl(url)"
          class="detail-image"
          :src="displayImageUrl(url)"
          mode="widthFix"
        />
        <view v-else class="blocked-detail-image">HTTPS 图片接入后展示</view>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">商品服务</text>
      <view class="service-grid">
        <view v-for="item in services" :key="item" class="service-item">
          <text class="service-dot">✓</text>
          <text>{{ item }}</text>
        </view>
      </view>
    </view>

    <view class="mobile-fixed-bottom bottom-bar">
      <button class="ghost-button" @tap="addToCart">加入购物车</button>
      <button class="primary-button" :disabled="product.stock <= 0" @tap="buyNow">立即购买</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { api, type ApiProduct } from "../../services/api";

const CART_STORAGE_KEY = "jss_cart_items";
const emptyProduct: ApiProduct = {
  id: "",
  skuId: "",
  slug: "",
  name: "商品加载中",
  categoryId: null,
  categoryName: "",
  price: 0,
  originPrice: 0,
  settlePrice: 0,
  sales: 0,
  stock: 0,
  storeCount: 0,
  tags: [],
  specs: [],
  color: "默认",
  description: "",
  coverUrl: "",
  detailImageUrls: [],
  imageTone: "linear-gradient(135deg, #fff2e8, #ffffff)",
  storeNames: [],
  nearestStoreName: "",
  skus: []
};

const product = ref<ApiProduct>({ ...emptyProduct });
const services = ["门店现货", "极速配送", "正品保障", "售后无忧"];
const storeNamesText = computed(() => {
  const names = product.value.storeNames ?? [];
  return names.length > 0 ? names.join("、") : "福州附近审核门店";
});

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

function buyNow() {
  const skuId = product.value.skuId || product.value.skus?.[0]?.id;
  if (!skuId) {
    uni.showToast({ title: "商品暂无库存", icon: "none" });
    return;
  }

  uni.navigateTo({ url: `/pages/order/confirm?skuId=${skuId}` });
}

function addToCart() {
  const skuId = product.value.skuId || product.value.skus?.[0]?.id;
  if (!skuId || product.value.stock <= 0) {
    uni.showToast({ title: "商品暂无库存", icon: "none" });
    return;
  }

  const cached = uni.getStorageSync(CART_STORAGE_KEY);
  const items = Array.isArray(cached) ? cached : [];
  const nextItems = [
    {
      skuId,
      productId: product.value.id,
      name: product.value.name,
      price: product.value.price,
      quantity: 1,
      addedAt: new Date().toISOString()
    },
    ...items.filter((item) => item?.skuId !== skuId)
  ].slice(0, 20);
  uni.setStorageSync(CART_STORAGE_KEY, nextItems);
  uni.showToast({ title: "已加入购物车", icon: "success" });
}

onLoad(async (query) => {
  const id = typeof query?.id === "string" ? query.id : "";
  try {
    if (id) {
      product.value = await api.product(id);
      return;
    }
    const products = await api.products();
    product.value = products[0] ?? product.value;
  } catch {
    product.value = { ...emptyProduct, name: "商品加载失败" };
    uni.showToast({ title: "商品加载失败", icon: "none" });
  }
});
</script>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 90px;
}

.product-visual {
  position: relative;
  display: flex;
  height: 286px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0 0 24px 24px;
  margin: -12px -12px 0;
}

.cover-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.visual-device {
  width: 132px;
  height: 160px;
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow:
    inset 0 0 0 1px rgba(255, 122, 0, 0.12),
    0 24px 54px rgba(17, 17, 17, 0.08);
  transform: rotate(-18deg);
}

.visual-brand {
  position: absolute;
  color: #ff7a00;
  font-size: 26px;
  font-weight: 800;
}

.visual-warning {
  font-size: 16px;
}

.visual-hint {
  position: absolute;
  bottom: 28px;
  color: #666666;
  font-size: 12px;
}

.product-summary {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.price-row,
.tag-row,
.chip-row,
.info-row,
.bottom-bar {
  display: flex;
  align-items: center;
}

.price-row {
  gap: 8px;
}

.big-price {
  font-size: 24px;
}

.origin {
  color: #999999;
  font-size: 12px;
  text-decoration: line-through;
}

.product-title {
  font-size: 19px;
  font-weight: 800;
  line-height: 1.35;
}

.tag-row,
.chip-row {
  flex-wrap: wrap;
  gap: 7px;
}

.tag.green {
  background: #e9fbf2;
  color: #0f9f6e;
}

.info-row {
  align-items: flex-start;
  gap: 12px;
  color: #111111;
  font-size: 13px;
  line-height: 1.45;
}

.label {
  flex: 0 0 34px;
  color: #666666;
}

.chip {
  border-radius: 999px;
  border: 1px solid #e8e8e8;
  padding: 8px 14px;
  color: #666666;
  font-size: 13px;
}

.chip.active {
  border-color: #ff7a00;
  background: #fff2e8;
  color: #ff7a00;
  font-weight: 700;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.description {
  color: #666666;
  font-size: 13px;
  line-height: 1.55;
}

.detail-image {
  width: 100%;
  border-radius: 14px;
  background: #f7f8fa;
}

.detail-image-wrap {
  overflow: hidden;
  border-radius: 14px;
}

.blocked-detail-image {
  display: flex;
  min-height: 160px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: #fff7ed;
  color: #ff7a00;
  font-size: 13px;
  font-weight: 800;
}

.service-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #666666;
  font-size: 13px;
}

.service-dot {
  color: #0f9f6e;
  font-weight: 800;
}

.bottom-bar {
  gap: 10px;
  padding: 12px;
  background: #ffffff;
  box-shadow: 0 -10px 30px rgba(17, 17, 17, 0.08);
}

.bottom-bar button {
  flex: 1;
}
</style>
