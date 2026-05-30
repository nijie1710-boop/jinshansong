<template>
  <view class="page detail-page">
    <view
      class="product-visual"
      :style="{ background: displayImageUrl(activeCoverUrl) ? '#f7f8fa' : product.imageTone }"
    >
      <image
        v-if="displayImageUrl(activeCoverUrl)"
        class="cover-image"
        :src="displayImageUrl(activeCoverUrl)"
        mode="aspectFill"
      />
      <view v-if="!displayImageUrl(activeCoverUrl)" class="visual-device"></view>
      <text v-if="isHttpImageBlocked(activeCoverUrl)" class="visual-brand visual-warning">
        HTTPS 后显示
      </text>
      <text v-else-if="!displayImageUrl(activeCoverUrl)" class="visual-brand">金闪送</text>
      <text class="visual-hint">门店现货 · 同城即达</text>
    </view>

    <view class="card product-summary">
      <view class="price-row">
        <text class="price big-price">¥{{ currentPrice }}</text>
        <text class="origin">¥{{ currentOriginPrice }}</text>
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
        <text
          >{{ productStoreLine }} 发货，预计 {{ product.deliveryEtaMinutes || 45 }} 分钟送达</text
        >
      </view>
      <view class="info-row">
        <text class="label">门店</text>
        <text>{{ storeNamesText }}</text>
      </view>
      <view class="info-row">
        <text class="label">库存</text>
        <text
          >附近 {{ product.storeCount || product.storeNames?.length || 1 }} 家门店现货
          {{ currentStock }} 件</text
        >
      </view>
      <view class="info-row">
        <text class="label">服务</text>
        <text>正品保障 · 售后无忧 · 缺货秒退</text>
      </view>
    </view>

    <view class="card section">
      <view class="section-head">
        <text class="section-title">规格选择</text>
        <text class="section-subtitle">SKU 图片跟随规格切换</text>
      </view>
      <view class="sku-grid">
        <view
          v-for="sku in visibleSkus"
          :key="sku.id"
          class="sku-card"
          :class="{ active: sku.id === selectedSkuId, disabled: sku.stock <= 0 }"
          @tap="selectSku(sku.id)"
        >
          <view class="sku-thumb" :style="{ background: displayImageUrl(sku.imageUrl) ? '#f7f8fa' : '#fff2e8' }">
            <image
              v-if="displayImageUrl(sku.imageUrl)"
              class="sku-thumb-image"
              :src="displayImageUrl(sku.imageUrl)"
              mode="aspectFill"
            />
            <text v-else>{{ isHttpImageBlocked(sku.imageUrl) ? "HTTPS" : "SKU" }}</text>
          </view>
          <view class="sku-copy">
            <text class="sku-name">{{ sku.name }}</text>
            <text class="sku-price">¥{{ sku.price }}</text>
            <text class="sku-left">{{ sku.stock > 0 ? `库存 ${sku.stock}` : "暂售罄" }}</text>
          </view>
        </view>
      </view>
      <text class="sku-stock"
        >已选：{{ selectedSku?.name || "默认规格" }} · 库存 {{ currentStock }} 件</text
      >
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
      <button class="cart-shortcut" @tap="openCart">购物车</button>
      <button class="ghost-button" @tap="addToCart">加入购物车</button>
      <button class="primary-button" :disabled="currentStock <= 0" @tap="buyNow">立即购买</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { api, type ApiProduct } from "../../services/api";
import { addCartItem } from "../../services/cart";
import { createTapGuard, shortToast } from "../../services/interaction";
import { cachedLocationQuery } from "../../services/location";

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
const selectedSkuId = ref("");
const canAddCart = createTapGuard(260);
const canBuy = createTapGuard(520);
const services = ["门店现货", "极速配送", "正品保障", "售后无忧"];
const storeNamesText = computed(() => {
  const names = product.value.storeNames ?? [];
  return names.length > 0 ? names.join("、") : "福州附近审核门店";
});
const productStoreLine = computed(() => {
  const storeName = product.value.nearestStoreName || "附近门店";
  return product.value.nearestStoreDistanceKm === null ||
    product.value.nearestStoreDistanceKm === undefined
    ? storeName
    : `${storeName} · ${product.value.nearestStoreDistanceKm}km`;
});
const visibleSkus = computed(() =>
  product.value.skus?.length
    ? product.value.skus
    : [
        {
          id: product.value.skuId,
          name: product.value.specs[0] || product.value.color || "默认规格",
          imageUrl: product.value.coverUrl,
          price: product.value.price,
          stock: product.value.stock
        }
      ]
);
const selectedSku = computed(
  () => visibleSkus.value.find((sku) => sku.id === selectedSkuId.value) ?? visibleSkus.value[0]
);
const activeCoverUrl = computed(() => selectedSku.value?.imageUrl || product.value.coverUrl);
const currentPrice = computed(() => selectedSku.value?.price ?? product.value.price);
const currentOriginPrice = computed(() => Math.round(currentPrice.value * 1.32 * 10) / 10);
const currentStock = computed(() => selectedSku.value?.stock ?? product.value.stock);

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
  if (!canBuy()) return;
  const skuId = selectedSku.value?.id || product.value.skuId || product.value.skus?.[0]?.id;
  if (!skuId) {
    shortToast("商品暂无库存");
    return;
  }

  uni.navigateTo({ url: `/pages/order/confirm?skuId=${skuId}` });
}

function addToCart() {
  if (!canAddCart()) return;
  const skuId = selectedSku.value?.id || product.value.skuId || product.value.skus?.[0]?.id;
  if (!skuId || currentStock.value <= 0) {
    shortToast("商品暂无库存");
    return;
  }

  addCartItem({
    skuId,
    productId: product.value.id,
    name: product.value.name,
    skuName: selectedSku.value?.name || "",
    imageUrl: activeCoverUrl.value,
    price: currentPrice.value,
    stock: currentStock.value,
    storeName: product.value.nearestStoreName || product.value.storeNames?.[0] || "",
    quantity: 1
  });
  shortToast("已加入购物车", "success");
}

function openCart() {
  uni.switchTab({ url: "/pages/cart/index" });
}

function selectSku(skuId: string) {
  const sku = visibleSkus.value.find((item) => item.id === skuId);
  if (!sku || sku.stock <= 0) {
    shortToast("该规格暂无库存");
    return;
  }
  selectedSkuId.value = sku.id;
}

function syncSelectedSku() {
  const firstSellable = visibleSkus.value.find((sku) => sku.stock > 0) ?? visibleSkus.value[0];
  selectedSkuId.value = firstSellable?.id || "";
}

onLoad(async (query) => {
  const id = typeof query?.id === "string" ? query.id : "";
  try {
    if (id) {
      product.value = await api.product(id, cachedLocationQuery());
      syncSelectedSku();
      return;
    }
    const products = await api.products(cachedLocationQuery());
    product.value = products[0] ?? product.value;
    syncSelectedSku();
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
  background: radial-gradient(circle at 50% 0%, rgba(255, 176, 32, 0.16), transparent 24%), #f7f8fa;
}

.product-visual {
  position: relative;
  display: flex;
  height: 302px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0 0 28px 28px;
  margin: -12px -12px 0;
}

.cover-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.visual-device {
  width: 142px;
  height: 170px;
  border-radius: 34px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow:
    inset 0 0 0 1px rgba(255, 122, 0, 0.12),
    0 24px 54px rgba(17, 17, 17, 0.08);
  transform: rotate(-18deg);
}

.product-visual::after {
  position: absolute;
  right: 34px;
  bottom: 58px;
  width: 120px;
  height: 22px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.64);
  box-shadow: inset 0 0 0 1px rgba(255, 122, 0, 0.08);
  transform: rotate(23deg);
  content: "";
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
  margin-top: -28px;
  position: relative;
  z-index: 2;
}

.price-row,
.tag-row,
.info-row,
.bottom-bar {
  display: flex;
  align-items: center;
}

.price-row {
  gap: 8px;
}

.big-price {
  font-size: 27px;
}

.origin {
  color: #999999;
  font-size: 12px;
  text-decoration: line-through;
}

.product-title {
  font-size: 20px;
  font-weight: 800;
  line-height: 1.35;
}

.tag-row {
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
  padding: 8px 15px;
  color: #666666;
  font-size: 13px;
}

.chip.active {
  border-color: #ff7a00;
  background: #fff2e8;
  color: #ff7a00;
  font-weight: 700;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.section-subtitle {
  color: #999999;
  font-size: 11px;
  font-weight: 700;
}

.sku-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.sku-card {
  display: flex;
  min-width: 0;
  gap: 9px;
  border: 1px solid #eeeeee;
  border-radius: 16px;
  padding: 8px;
  background: #ffffff;
}

.sku-card.active {
  border-color: rgba(255, 122, 0, 0.48);
  background: #fff7ed;
  box-shadow: 0 8px 18px rgba(255, 122, 0, 0.08);
}

.sku-card.disabled {
  opacity: 0.48;
}

.sku-thumb {
  display: flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  flex: 0 0 48px;
  overflow: hidden;
  border-radius: 14px;
  color: #ff7a00;
  font-size: 10px;
  font-weight: 900;
}

.sku-thumb-image {
  width: 100%;
  height: 100%;
}

.sku-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.sku-name {
  overflow: hidden;
  color: #111111;
  font-size: 12px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sku-price {
  color: #ff3b30;
  font-size: 13px;
  font-weight: 900;
}

.sku-left,
.sku-stock {
  color: #666666;
  font-size: 11px;
}

.sku-stock {
  display: block;
  margin-top: 9px;
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
  border-radius: 14px;
  padding: 10px;
  background: #f7f8fa;
  color: #666666;
  font-size: 13px;
}

.service-dot {
  color: #0f9f6e;
  font-weight: 800;
}

.bottom-bar {
  gap: 10px;
  padding: 12px 12px calc(12px + env(safe-area-inset-bottom));
  background: #ffffff;
  box-shadow: 0 -10px 30px rgba(17, 17, 17, 0.08);
}

.bottom-bar button:not(.cart-shortcut) {
  flex: 1;
}

.cart-shortcut {
  width: 62px;
  border: 1px solid #ffe0bf;
  border-radius: 999px;
  background: #fff7ed;
  color: #ff7a00;
  font-size: 12px;
  font-weight: 900;
}
</style>
