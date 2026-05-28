<template>
  <view class="page home-page">
    <view class="topbar">
      <view class="location" @tap="chooseHomeLocation">
        <view class="brand-mark">
          <image class="brand-logo-image" src="/static/brand/logo-icon.png" mode="aspectFit" />
        </view>
        <view>
          <view class="city-row">
            <text class="location-pin">⌖</text>
            <text class="city">{{ currentCity }}</text>
            <text class="location-caret">›</text>
          </view>
          <text class="local-desc">{{ locationSubtitle }}</text>
        </view>
      </view>
      <view class="mini-actions">
        <button class="locate-button" @tap.stop="chooseHomeLocation">定位</button>
        <text>•••</text>
        <text>◎</text>
      </view>
    </view>

    <view class="search">
      <text class="search-icon">⌕</text>
      <input
        :value="searchKeyword"
        class="search-input"
        confirm-type="search"
        placeholder="搜索充电线、充电头、手机壳"
        @confirm="searchProducts"
        @input="setSearchKeyword"
      />
      <text v-if="searchKeyword" class="clear-search" @tap="clearSearch">×</text>
    </view>

    <view class="hero">
      <view class="hero-copy">
        <image class="hero-logo" src="/static/brand/logo-horizontal.png" mode="aspectFit" />
        <text class="hero-title">新人首单立减 5 元</text>
        <text class="hero-subtitle">福州同城数码配件 · 门店现货极速送</text>
        <view class="hero-button">立即领取</view>
      </view>
      <view class="hero-visual">
        <view class="speed-pill">30min</view>
        <view class="gift">
          <text>¥5</text>
        </view>
      </view>
    </view>

    <view class="promise-card card">
      <view v-for="item in promises" :key="item.title" class="promise-item">
        <view class="promise-icon">{{ item.icon }}</view>
        <text>{{ item.title }}</text>
      </view>
    </view>

    <view class="card category-card">
      <view class="section-head">
        <text class="section-title">商品分类</text>
        <text class="muted">附近品胜门店</text>
      </view>
      <view class="category-grid">
        <view v-for="category in categories" :key="category.id" class="category-item">
          <view class="category-icon">{{ category.icon }}</view>
          <text>{{ category.name }}</text>
        </view>
      </view>
    </view>

    <view class="activity-grid">
      <view v-for="activity in activities" :key="activity.title" class="activity-card">
        <text class="activity-title">{{ activity.title }}</text>
        <text class="activity-subtitle">{{ activity.subtitle }}</text>
      </view>
    </view>

    <view class="section-head">
      <text class="section-title">{{ searchKeyword ? "搜索结果" : "推荐商品" }}</text>
      <text class="muted">{{ searchKeyword ? `关键词：${searchKeyword}` : "30-60分钟送达" }}</text>
    </view>

    <view class="product-grid">
      <view v-if="displayProducts.length === 0" class="empty-card">
        <text class="section-title">{{ searchKeyword ? "没有找到相关商品" : "暂无可售商品" }}</text>
        <text class="muted">
          {{
            searchKeyword
              ? "换个关键词试试，例如充电线、充电头、手机壳"
              : "商家提交商品并由后台审核通过后会展示在这里"
          }}
        </text>
      </view>
      <view
        v-for="product in displayProducts"
        :key="product.id"
        class="product-card"
        @tap="openProduct(product.id)"
      >
        <view
          class="product-image"
          :style="{ background: displayImageUrl(product.coverUrl) ? '#f7f8fa' : product.imageTone }"
        >
          <image
            v-if="displayImageUrl(product.coverUrl)"
            class="product-cover"
            :src="displayImageUrl(product.coverUrl)"
            mode="aspectFill"
          />
          <view v-if="!displayImageUrl(product.coverUrl)" class="device-shape"></view>
          <text v-if="isHttpImageBlocked(product.coverUrl)" class="blocked-product-text"
            >HTTPS</text
          >
          <text v-else-if="!displayImageUrl(product.coverUrl)">金闪送</text>
        </view>
        <view class="product-body">
          <text class="product-name">{{ product.name }}</text>
          <text class="store-line">{{ product.nearestStoreName || "附近门店" }}</text>
          <text class="stock-line">现货 {{ product.stock }} 件 · 福州即时达</text>
          <view class="tag-row">
            <text class="tag">新人价</text>
            <text class="tag">30-60分钟</text>
          </view>
          <view class="product-bottom">
            <view>
              <text class="price">¥{{ product.price }}</text>
              <text class="origin">¥{{ product.originPrice }}</text>
            </view>
            <button class="cart-button" @tap.stop="buyProduct(product.skuId)">+</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onPullDownRefresh } from "@dcloudio/uni-app";
import { api, type ApiCategory, type ApiProduct } from "../../services/api";

const LOCATION_CACHE_KEY = "jss_home_location";

const categories = ref<ApiCategory[]>([]);
const products = ref<ApiProduct[]>([]);
const searchKeyword = ref("");
const currentCity = ref("福州市");
const currentDistrict = ref("台江区");
const currentLocationName = ref("本地数码闪购");

const promises = [
  { icon: "盾", title: "正品保障" },
  { icon: "店", title: "附近门店" },
  { icon: "闪", title: "极速配送" },
  { icon: "服", title: "售后无忧" }
];

const activities = [
  { title: "新人专享", subtitle: "首单立减5元" },
  { title: "满19免配送", subtitle: "同城闪购" },
  { title: "满29减3", subtitle: "高频配件" }
];

const displayProducts = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return products.value;
  }

  return products.value.filter((product) => {
    const searchable = [
      product.name,
      product.categoryName,
      product.description,
      product.nearestStoreName,
      ...(product.tags ?? []),
      ...(product.specs ?? [])
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(keyword);
  });
});

const locationSubtitle = computed(() => {
  if (currentDistrict.value) {
    return `${currentDistrict.value} · ${currentLocationName.value}`;
  }
  return currentLocationName.value;
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

function loadCachedLocation() {
  const cached = uni.getStorageSync(LOCATION_CACHE_KEY);
  if (!cached || typeof cached !== "object") {
    return;
  }

  const location = cached as {
    city?: string;
    district?: string;
    name?: string;
  };
  currentCity.value = location.city || "福州市";
  currentDistrict.value = location.district || "台江区";
  currentLocationName.value = location.name || "本地数码闪购";
}

function saveHomeLocation(location: {
  city: string;
  district: string;
  name: string;
  latitude?: number;
  longitude?: number;
}) {
  currentCity.value = location.city;
  currentDistrict.value = location.district;
  currentLocationName.value = location.name;
  uni.setStorageSync(LOCATION_CACHE_KEY, location);
}

function parseFuzhouLocation(result: {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}) {
  const districts = ["鼓楼区", "台江区", "仓山区", "晋安区", "马尾区", "长乐区"];
  const addressText = [result.address, result.name].filter(Boolean).join("");
  const district = districts.find((item) => addressText.includes(item)) || currentDistrict.value;
  const city = addressText.includes("福州") ? "福州市" : currentCity.value || "福州市";
  const name = result.name || result.address || "已定位当前位置";

  saveHomeLocation({
    city,
    district,
    name,
    latitude: result.latitude,
    longitude: result.longitude
  });
}

function chooseHomeLocation() {
  const fallbackToCurrentLocation = () => {
    uni.getLocation({
      type: "gcj02",
      success(result) {
        saveHomeLocation({
          city: currentCity.value || "福州市",
          district: currentDistrict.value || "台江区",
          name: "已定位当前位置",
          latitude: result.latitude,
          longitude: result.longitude
        });
        uni.showToast({ title: "已记录当前位置", icon: "none" });
      },
      fail() {
        uni.showToast({ title: "H5 预览请手动验收，微信内需授权定位", icon: "none" });
      }
    });
  };

  if (typeof uni.chooseLocation !== "function") {
    fallbackToCurrentLocation();
    return;
  }

  uni.chooseLocation({
    success(result) {
      parseFuzhouLocation({
        name: result.name,
        address: result.address,
        latitude: result.latitude,
        longitude: result.longitude
      });
      uni.showToast({ title: "已切换定位", icon: "success" });
    },
    fail() {
      fallbackToCurrentLocation();
    }
  });
}

function setSearchKeyword(event: Event) {
  searchKeyword.value = String(
    (event as Event & { detail?: { value?: string } }).detail?.value ?? ""
  );
}

function clearSearch() {
  searchKeyword.value = "";
  void loadHomeData();
}

function searchProducts() {
  void loadHomeData(searchKeyword.value);
}

function openProduct(id: string) {
  uni.navigateTo({ url: `/pages/product/detail?id=${id}` });
}

function buyProduct(skuId: string) {
  uni.navigateTo({ url: `/pages/order/confirm?skuId=${skuId}` });
}

async function loadHomeData(keyword = "") {
  try {
    const [categoryData, productData] = await Promise.all([
      api.categories(),
      api.products(keyword.trim())
    ]);
    categories.value = categoryData;
    products.value = productData;
  } catch {
    categories.value = [];
    products.value = [];
    uni.showToast({ title: "商品数据加载失败", icon: "none" });
  }
}

onMounted(() => {
  loadCachedLocation();
  void loadHomeData();
});

onPullDownRefresh(() => {
  void loadHomeData(searchKeyword.value).finally(() => {
    uni.stopPullDownRefresh();
  });
});
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.topbar,
.location,
.mini-actions,
.section-head,
.product-bottom {
  display: flex;
  align-items: center;
}

.topbar,
.section-head,
.product-bottom {
  justify-content: space-between;
}

.location {
  gap: 9px;
  font-weight: 700;
}

.brand-mark {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(255, 122, 0, 0.16);
}

.brand-logo-image {
  width: 30px;
  height: 30px;
}

.city-row {
  display: flex;
  align-items: center;
  gap: 3px;
}

.location-pin,
.location-caret {
  color: #ff7a00;
  font-weight: 900;
}

.location-pin {
  font-size: 13px;
}

.city {
  font-size: 16px;
}

.location-caret {
  transform: rotate(90deg);
  font-size: 15px;
}

.local-desc {
  display: block;
  margin-top: 2px;
  color: #666666;
  font-size: 11px;
  font-weight: 500;
}

.mini-actions {
  gap: 8px;
  border-radius: 999px;
  padding: 4px 9px;
  background: #ffffff;
  color: #111111;
  box-shadow: 0 4px 14px rgba(17, 17, 17, 0.06);
}

.locate-button {
  display: flex;
  height: 24px;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0 8px;
  border-radius: 999px;
  background: #fff2e8;
  color: #ff7a00;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.locate-button::after {
  border: 0;
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

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  min-height: 126px;
  border-radius: 20px;
  padding: 16px;
  background:
    radial-gradient(circle at 82% 20%, rgba(255, 255, 255, 0.85), transparent 26%),
    linear-gradient(135deg, #fff1e5 0%, #ffd09a 52%, #ff7a00 100%);
  box-shadow: 0 12px 30px rgba(255, 122, 0, 0.18);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 7px;
}

.hero-logo {
  width: 116px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
}

.hero-title {
  font-size: 21px;
  font-weight: 800;
}

.hero-subtitle {
  max-width: 210px;
  color: #7a3c00;
  font-size: 12px;
}

.hero-button {
  border-radius: 999px;
  padding: 6px 12px;
  background: #ff7a00;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}

.hero-visual {
  position: relative;
  display: flex;
  width: 104px;
  height: 104px;
  align-items: center;
  justify-content: center;
}

.speed-pill {
  position: absolute;
  top: 2px;
  right: 0;
  z-index: 2;
  border-radius: 999px;
  padding: 4px 7px;
  background: #111111;
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
}

.gift {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 84px;
  height: 84px;
  border-radius: 24px;
  background: linear-gradient(145deg, #ff5a1f, #ffb020);
  color: #ffffff;
  font-size: 28px;
  font-weight: 800;
  transform: rotate(-8deg);
  box-shadow: 0 10px 24px rgba(255, 90, 31, 0.28);
}

.promise-card {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 12px 8px;
}

.promise-item,
.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  color: #111111;
  font-size: 12px;
}

.promise-icon,
.category-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: #fff2e8;
  color: #ff7a00;
  font-weight: 800;
}

.promise-icon {
  width: 32px;
  height: 32px;
}

.category-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  row-gap: 14px;
}

.category-icon {
  width: 44px;
  height: 44px;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
}

.activity-card {
  min-height: 74px;
  border-radius: 16px;
  padding: 11px;
  background: linear-gradient(135deg, #fff2e8, #ffffff);
  box-shadow: 0 8px 20px rgba(17, 17, 17, 0.05);
}

.activity-title {
  display: block;
  color: #ff7a00;
  font-size: 14px;
  font-weight: 800;
}

.activity-subtitle {
  display: block;
  margin-top: 5px;
  color: #7a3c00;
  font-size: 11px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.empty-card {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 7px;
  border-radius: 18px;
  padding: 18px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06);
}

.product-card {
  overflow: hidden;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06);
}

.product-image {
  position: relative;
  display: flex;
  height: 112px;
  align-items: center;
  justify-content: center;
  color: #ff7a00;
  font-size: 12px;
  font-weight: 800;
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

.device-shape {
  position: absolute;
  width: 56px;
  height: 74px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: inset 0 0 0 1px rgba(255, 122, 0, 0.12);
  transform: rotate(-18deg);
}

.product-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px;
}

.product-name {
  min-height: 38px;
  font-size: 14px;
  font-weight: 700;
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

.stock-line {
  color: #666666;
  font-size: 11px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.origin {
  margin-left: 4px;
  color: #999999;
  font-size: 11px;
  text-decoration: line-through;
}

.cart-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff7a00, #ffb020);
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}
</style>
