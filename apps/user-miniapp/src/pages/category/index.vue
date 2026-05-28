<template>
  <view class="page category-page">
    <view class="search">搜索附近门店现货</view>

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
          <text class="muted">附近品胜门店 · 30-60分钟送达</text>
        </view>

        <view v-if="products.length === 0" class="empty-card">
          <text class="section-title">暂无可售商品</text>
          <text class="muted">等待商家提交商品并通过后台审核</text>
        </view>

        <view
          v-for="product in filteredProducts"
          :key="product.id"
          class="product-card"
          @tap="openProduct(product.id)"
        >
          <view
            class="product-image"
            :style="{ background: product.coverUrl ? '#f7f8fa' : product.imageTone }"
          >
            <image
              v-if="product.coverUrl"
              class="product-cover"
              :src="product.coverUrl"
              mode="aspectFill"
            />
            <text v-if="!product.coverUrl">金闪送</text>
          </view>
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text class="store-line">{{ product.nearestStoreName || "附近门店" }}</text>
            <text class="muted">库存 {{ product.stock }} · 已售 {{ product.sales }}</text>
            <view class="tag-row">
              <text class="tag">30-60分钟</text>
              <text class="tag">门店现货</text>
            </view>
            <view class="bottom">
              <text class="price">¥{{ product.price }}</text>
              <button class="add-button" @tap.stop="buyProduct(product.skuId)">+</button>
            </view>
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

const categories = ref<ApiCategory[]>([]);
const products = ref<ApiProduct[]>([]);
const activeCategoryId = ref(categories.value[0]?.id ?? "");

const filteredProducts = computed(() => {
  const matched = products.value.filter((product) => product.categoryId === activeCategoryId.value);
  return matched.length > 0 ? matched : products.value;
});

function openProduct(id: string) {
  uni.navigateTo({ url: `/pages/product/detail?id=${id}` });
}

function buyProduct(skuId: string) {
  uni.navigateTo({ url: `/pages/order/confirm?skuId=${skuId}` });
}

async function loadCategoryData() {
  try {
    const [categoryData, productData] = await Promise.all([api.categories(), api.products()]);
    categories.value = categoryData;
    products.value = productData;
    activeCategoryId.value = categoryData[0]?.id ?? "";
  } catch {
    categories.value = [];
    products.value = [];
    activeCategoryId.value = "";
    uni.showToast({ title: "商品数据加载失败", icon: "none" });
  }
}

onMounted(loadCategoryData);

onPullDownRefresh(() => {
  void loadCategoryData().finally(() => {
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
  border-radius: 999px;
  padding: 12px 15px;
  background: #ffffff;
  color: #999999;
  font-size: 13px;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.05);
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
</style>
