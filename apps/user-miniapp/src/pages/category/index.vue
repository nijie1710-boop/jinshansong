<template>
  <view class="page category-page">
    <view class="search">
      <text class="search-icon">⌕</text>
      <input
        :value="keyword"
        class="search-input"
        confirm-type="search"
        placeholder="搜索附近门店现货"
        @confirm="searchProducts"
        @input="setKeyword"
      />
      <text v-if="keyword" class="clear-search" @tap="clearKeyword">×</text>
    </view>

    <view class="layout">
      <view class="side">
        <view
          v-for="category in categories"
          :key="category.id"
          class="side-item"
          :class="{ active: category.id === activeCategoryId }"
          @tap="activeCategoryId = category.id"
        >
          {{ category.name }}
        </view>
      </view>

      <view class="list">
        <view class="feature-card">
          <text class="section-title">数码配件</text>
          <text class="muted">按当前位置匹配最近有货门店</text>
        </view>

        <view v-if="filteredProducts.length === 0" class="empty-card">
          <text class="section-title">{{ keyword ? "没有找到相关商品" : "暂无可售商品" }}</text>
          <text class="muted">
            {{ keyword ? "换个关键词试试" : "附近暂未找到可售商品，请稍后再试" }}
          </text>
        </view>

        <view
          v-for="product in filteredProducts"
          :key="product.id"
          class="product-card"
          :class="{ 'sold-out': product.stock <= 0 }"
          @tap="openProduct(product.id)"
        >
          <view
            class="product-image"
            :style="{
              background: displayImageUrl(product.coverUrl) ? '#f7f8fa' : product.imageTone
            }"
          >
            <image
              v-if="displayImageUrl(product.coverUrl)"
              class="product-cover"
              :src="displayImageUrl(product.coverUrl)"
              mode="aspectFill"
            />
            <text v-if="isHttpImageBlocked(product.coverUrl)" class="blocked-product-text">
              商品图片
            </text>
            <text v-else-if="!displayImageUrl(product.coverUrl)">金泽快送</text>
          </view>
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text class="store-line">{{ productStoreLine(product) }}</text>
            <text class="muted">{{ productEtaLine(product) }}</text>
            <view class="tag-row">
              <text class="tag">30-60分钟</text>
              <text class="tag">门店现货</text>
            </view>
            <view class="bottom">
              <text class="price">¥{{ product.price }}</text>
              <button
                class="add-button"
                :disabled="product.stock <= 0"
                @tap.stop="addProductToCart(product)"
              >
                {{ product.stock > 0 ? "+" : "缺" }}
              </button>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import { api, type ApiCategory, type ApiProduct } from "../../services/api";
import { addCartItem } from "../../services/cart";
import { createTapGuard, shortToast } from "../../services/interaction";
import { cachedLocationQuery } from "../../services/location";

const categories = ref<ApiCategory[]>([]);
const products = ref<ApiProduct[]>([]);
const activeCategoryId = ref(categories.value[0]?.id ?? "");
const keyword = ref("");
const ACTIVE_CATEGORY_STORAGE_KEY = "jss_active_category_id";
const canAddCart = createTapGuard(260);
const canNavigate = createTapGuard(420);

const filteredProducts = computed(() => {
  const categoryMatched = activeCategoryId.value
    ? products.value.filter((product) => product.categoryId === activeCategoryId.value)
    : products.value;
  const baseList = activeCategoryId.value ? categoryMatched : products.value;
  const normalizedKeyword = keyword.value.trim().toLowerCase();

  if (!normalizedKeyword) {
    return baseList;
  }

  return baseList.filter((product) =>
    [
      product.name,
      product.categoryName,
      product.description,
      product.nearestStoreName,
      ...(product.tags ?? []),
      ...(product.specs ?? [])
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedKeyword)
  );
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

function productStoreLine(product: ApiProduct) {
  const storeName = product.nearestStoreName || "附近门店";
  return product.nearestStoreDistanceKm === null || product.nearestStoreDistanceKm === undefined
    ? storeName
    : `${storeName} · ${product.nearestStoreDistanceKm}km`;
}

function productEtaLine(product: ApiProduct) {
  if (product.stock <= 0) {
    return "附近门店暂售罄";
  }
  return `库存 ${product.stock} · ${product.deliveryEtaMinutes || 45}分钟达`;
}

function setKeyword(event: Event) {
  keyword.value = String((event as Event & { detail?: { value?: string } }).detail?.value ?? "");
}

function clearKeyword() {
  keyword.value = "";
  void loadCategoryData();
}

function searchProducts() {
  void loadCategoryData(keyword.value);
}

function openProduct(id: string) {
  if (!canNavigate()) return;
  uni.navigateTo({ url: `/pages/product/detail?id=${id}` });
}

function addProductToCart(product: ApiProduct) {
  if (!canAddCart()) return;
  const sku = product.skus?.find((item) => item.id === product.skuId) ?? product.skus?.[0];
  const skuId = sku?.id || product.skuId;
  if (!skuId || product.stock <= 0) {
    shortToast("商品暂无库存");
    return;
  }

  addCartItem({
    skuId,
    productId: product.id,
    name: product.name,
    skuName: sku?.name || product.specs?.[0] || product.color,
    imageUrl: sku?.imageUrl || product.coverUrl,
    price: sku?.price ?? product.price,
    stock: sku?.stock ?? product.stock,
    storeName: product.nearestStoreName || product.storeNames?.[0] || "",
    quantity: 1
  });
  shortToast("已加入购物车", "success");
}

function applyStoredCategory() {
  const storedCategoryId = uni.getStorageSync(ACTIVE_CATEGORY_STORAGE_KEY);
  if (
    typeof storedCategoryId === "string" &&
    categories.value.some((category) => category.id === storedCategoryId)
  ) {
    activeCategoryId.value = storedCategoryId;
    uni.removeStorageSync(ACTIVE_CATEGORY_STORAGE_KEY);
  }
}

async function loadCategoryData(searchKeyword = "") {
  try {
    const [categoryData, productData] = await Promise.all([
      api.categories(),
      api.products({ keyword: searchKeyword.trim(), ...cachedLocationQuery() })
    ]);
    categories.value = categoryData;
    products.value = productData;
    if (!categoryData.some((category) => category.id === activeCategoryId.value)) {
      activeCategoryId.value = categoryData[0]?.id ?? "";
    }
    applyStoredCategory();
  } catch {
    categories.value = [];
    products.value = [];
    activeCategoryId.value = "";
    uni.showToast({ title: "商品数据加载失败", icon: "none" });
  }
}

onMounted(loadCategoryData);
onShow(() => {
  applyStoredCategory();
  void loadCategoryData(keyword.value);
});

onPullDownRefresh(() => {
  void loadCategoryData(keyword.value).finally(() => {
    uni.stopPullDownRefresh();
  });
});
</script>

<style scoped>
.category-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search {
  display: flex;
  align-items: center;
  gap: 7px;
  border-radius: 999px;
  padding: 8px 14px;
  background: #ffffff;
  color: #999999;
  font-size: 13px;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.05);
}

.search-icon {
  color: #ff7a00;
  font-size: 15px;
  font-weight: 800;
}

.search-input {
  min-width: 0;
  flex: 1;
  height: 28px;
  color: #111111;
  font-size: 13px;
}

.clear-search {
  display: flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f2f3f5;
  color: #999999;
  font-size: 16px;
  line-height: 1;
}

.layout {
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 10px;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.side-item {
  border-radius: 14px;
  padding: 11px 6px;
  background: #ffffff;
  color: #666666;
  text-align: center;
  font-size: 12px;
  box-shadow: 0 6px 18px rgba(17, 17, 17, 0.04);
}

.side-item.active {
  background: #fff2e8;
  color: #ff7a00;
  font-weight: 800;
}

.list {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
}

.feature-card,
.product-card {
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06);
}

.feature-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 14px;
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

.product-card {
  display: flex;
  gap: 10px;
  padding: 10px;
}

.product-card.sold-out {
  opacity: 0.72;
}

.product-image {
  position: relative;
  display: flex;
  width: 78px;
  height: 86px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 15px;
  color: #ff7a00;
  font-size: 11px;
  font-weight: 800;
  overflow: hidden;
}

.product-cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.blocked-product-text {
  position: relative;
  z-index: 1;
  color: #ff7a00;
  font-size: 10px;
  font-weight: 900;
}

.product-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

.product-name {
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
}

.store-line {
  overflow: hidden;
  color: #111111;
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-row,
.bottom {
  display: flex;
  align-items: center;
  gap: 5px;
}

.tag-row {
  flex-wrap: wrap;
}

.bottom {
  justify-content: space-between;
}

.add-button {
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #ff7a00;
  color: #ffffff;
  font-size: 18px;
}

.add-button[disabled] {
  background: #e5e7eb;
  color: #999999;
}
</style>
