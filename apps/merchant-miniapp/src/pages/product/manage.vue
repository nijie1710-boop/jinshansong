<template>
  <view class="page product-manage-page">
    <view class="product-hero">
      <view>
        <text class="hero-kicker">金闪送门店商品</text>
        <text class="hero-title">上架附近现货</text>
        <text class="hero-subtitle">上传主图、详情图、价格和说明，后台审核通过后用户端展示。</text>
      </view>
      <view class="hero-mark">闪</view>
    </view>

    <view v-if="!hasMerchantAccess" class="audit-gate card">
      <view>
        <text class="section-title">请先完成入驻审核</text>
        <text class="muted">后台审核通过后，商家才能上架商品和调整库存。</text>
      </view>
      <button class="primary-button" @tap="goLogin">去申请入驻</button>
    </view>

    <view v-if="hasMerchantAccess" class="stats-grid">
      <view
        class="stat-card"
        :class="{ active: productFilter === 'all' }"
        @tap="focusProductList('all')"
      >
        <text class="stat-value">{{ products.length }}</text>
        <text class="muted">门店商品</text>
      </view>
      <view
        class="stat-card"
        :class="{ active: productFilter === 'stock' }"
        @tap="focusProductList('stock')"
      >
        <text class="stat-value">{{ totalStock }}</text>
        <text class="muted">现货库存</text>
      </view>
      <view
        class="stat-card"
        :class="{ active: productFilter === 'available' }"
        @tap="focusProductList('available')"
      >
        <text class="stat-value">{{ availableCount }}</text>
        <text class="muted">可售商品</text>
      </view>
    </view>

    <view v-if="hasMerchantAccess" class="current-store-card" @tap="goSettings">
      <view>
        <text class="current-store-label">当前上架门店</text>
        <text class="current-store-name">{{ merchantStore?.name || "已审核门店" }}</text>
      </view>
      <text class="current-store-action">切换门店 ›</text>
    </view>

    <view v-if="hasMerchantAccess" class="card audit-flow-card">
      <view class="section-head">
        <text class="section-title">上架审核流程</text>
        <text class="muted">三端数据互通</text>
      </view>
      <view class="flow-steps">
        <view class="flow-step active">
          <text class="flow-index">1</text>
          <text>提交商品资料</text>
        </view>
        <view class="flow-step" :class="{ active: pendingCount > 0 || visibleCount > 0 }">
          <text class="flow-index">2</text>
          <text>后台审核</text>
        </view>
        <view class="flow-step" :class="{ active: visibleCount > 0 }">
          <text class="flow-index">3</text>
          <text>用户端展示</text>
        </view>
      </view>
      <view class="audit-summary">
        <text>待审核 {{ pendingCount }}</text>
        <text>已驳回 {{ rejectedCount }}</text>
        <text>用户可见 {{ visibleCount }}</text>
      </view>
    </view>

    <view v-if="hasMerchantAccess" class="card form-card">
      <view class="section-head">
        <text class="section-title">新增商品</text>
        <text class="muted">提交后台审核</text>
      </view>
      <view class="form-note">
        <text
          >主图会展示在用户端首页和商品详情页；修改图片、说明、规格或销售价后会重新进入审核。</text
        >
      </view>
      <view class="upload-readiness-card">
        <text class="upload-readiness-title">图片上传提示</text>
        <text
          >当前验收环境会把图片保存到本地后端并直接预览；正式版需切换 HTTPS
          图片域名后再提交审核。</text
        >
      </view>

      <view class="readiness-card">
        <view class="readiness-head">
          <text class="upload-readiness-title">提交前检查</text>
          <text class="gross-margin" :class="{ danger: isGrossMarginNegative }">
            单件毛利 ¥{{ grossMarginPreviewText }}
          </text>
        </view>
        <view class="readiness-grid">
          <view
            v-for="item in formReadinessItems"
            :key="item.label"
            class="readiness-item"
            :class="{ ok: item.ok }"
          >
            <text>{{ item.ok ? "✓" : "!" }}</text>
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="image-editor-card">
        <view class="image-editor-head">
          <view>
            <text class="field-label">图片素材</text>
            <text class="image-editor-sub">主图用于列表首屏，详情图用于商品详情页展示。</text>
          </view>
          <text class="review-chip">提交审核</text>
        </view>

        <view class="upload-tile cover-tile" @tap="chooseCoverImage">
          <image
            v-if="displayImageUrl(form.coverUrl)"
            class="preview-image"
            :src="displayImageUrl(form.coverUrl)"
            mode="aspectFill"
          />
          <view v-else-if="isHttpImageBlocked(form.coverUrl)" class="blocked-image-note">
            <text>HTTPS 后显示</text>
            <text>本地 HTTP 图片已保存</text>
          </view>
          <view v-else class="upload-inner">
            <text class="upload-plus">+</text>
            <text>{{ uploading ? "上传中..." : "上传商品主图" }}</text>
            <text class="upload-hint">用户端列表和详情页展示</text>
          </view>
          <view class="upload-caption">
            <text>商品主图</text>
            <text>列表 / 详情首屏</text>
          </view>
        </view>

        <view class="section-head compact">
          <text class="field-label">详情图</text>
          <text class="muted">{{ form.detailImageUrls.length }} / {{ MAX_DETAIL_IMAGES }} 张</text>
        </view>
        <view class="detail-images">
          <view v-for="(url, index) in form.detailImageUrls" :key="url" class="detail-image-item">
            <image
              v-if="displayImageUrl(url)"
              class="detail-image"
              :src="displayImageUrl(url)"
              mode="aspectFill"
            />
            <view v-else class="blocked-detail-note">HTTPS 后显示</view>
            <text class="remove-image" @tap.stop="removeDetailImage(index)">×</text>
          </view>
          <view
            v-if="form.detailImageUrls.length < MAX_DETAIL_IMAGES"
            class="detail-upload"
            @tap="chooseDetailImages"
          >
            <text>+</text>
            <text>{{ uploading ? "上传中" : "详情图" }}</text>
          </view>
        </view>
      </view>

      <view class="field">
        <text class="field-label">商品名称</text>
        <input
          v-model="form.name"
          adjust-position
          class="field-input"
          confirm-type="next"
          cursor-spacing="20"
          maxlength="36"
          placeholder="例如 Type-C 快充线 1m"
        />
      </view>

      <view class="field">
        <text class="field-label">分类</text>
        <picker
          :range="categoryNames"
          :value="selectedCategoryIndex"
          @change="handleCategoryChange"
        >
          <view class="picker-box">{{ selectedCategoryLabel }}</view>
        </picker>
      </view>

      <view class="field-grid">
        <view class="field">
          <text class="field-label">规格</text>
          <input
            v-model="form.skuName"
            adjust-position
            class="field-input"
            confirm-type="next"
            cursor-spacing="20"
            maxlength="24"
            placeholder="默认规格"
          />
        </view>
        <view class="field">
          <text class="field-label">库存</text>
          <input
            v-model="form.stock"
            adjust-position
            class="field-input"
            confirm-type="next"
            cursor-spacing="20"
            maxlength="5"
            placeholder="20"
            type="number"
          />
        </view>
      </view>

      <view class="field-grid">
        <view class="field">
          <text class="field-label">销售价</text>
          <input
            v-model="form.salePrice"
            adjust-position
            class="field-input"
            confirm-type="next"
            cursor-spacing="20"
            maxlength="8"
            placeholder="19.9"
            type="digit"
          />
        </view>
        <view class="field">
          <text class="field-label">结算价</text>
          <input
            v-model="form.settlePrice"
            adjust-position
            class="field-input"
            confirm-type="next"
            cursor-spacing="20"
            maxlength="8"
            placeholder="16.9"
            type="digit"
          />
        </view>
      </view>

      <view class="sku-config-card">
        <view class="section-head compact">
          <text class="field-label">多 SKU 规格</text>
          <text class="sku-add" @tap="addSkuRow">+ 添加 SKU</text>
        </view>
        <view class="sku-base-row">
          <view class="sku-thumb" @tap="chooseBaseSkuImage">
            <image
              v-if="displayImageUrl(form.imageUrl)"
              class="sku-thumb-image"
              :src="displayImageUrl(form.imageUrl)"
              mode="aspectFill"
            />
            <text v-else>SKU图</text>
          </view>
          <view>
            <text class="sku-row-title">SKU 1：{{ form.skuName || "默认规格" }}</text>
            <text class="muted">
              ¥{{ form.salePrice }} · 库存 {{ form.stock }} · 用户端可切换购买
            </text>
          </view>
        </view>
        <view v-for="row in skuRows" :key="row.id" class="sku-row-card">
          <view class="sku-row-head">
            <text class="sku-row-title">扩展 SKU</text>
            <text class="remove-sku" @tap="removeSkuRow(row.id)">删除</text>
          </view>
          <view class="sku-row-body">
            <view class="sku-thumb" @tap="chooseSkuRowImage(row.id)">
              <image
                v-if="displayImageUrl(row.imageUrl)"
                class="sku-thumb-image"
                :src="displayImageUrl(row.imageUrl)"
                mode="aspectFill"
              />
              <text v-else>SKU图</text>
            </view>
            <view class="sku-inputs">
              <input
                v-model="row.skuName"
                adjust-position
                class="field-input"
                confirm-type="next"
                cursor-spacing="20"
                maxlength="24"
                placeholder="例如 1m 黑色"
              />
              <view class="sku-mini-grid">
                <input
                  v-model="row.salePrice"
                  adjust-position
                  class="field-input"
                  confirm-type="next"
                  cursor-spacing="20"
                  maxlength="8"
                  placeholder="售价"
                  type="digit"
                />
                <input
                  v-model="row.settlePrice"
                  adjust-position
                  class="field-input"
                  confirm-type="next"
                  cursor-spacing="20"
                  maxlength="8"
                  placeholder="结算"
                  type="digit"
                />
                <input
                  v-model="row.stock"
                  adjust-position
                  class="field-input"
                  confirm-type="done"
                  cursor-spacing="20"
                  maxlength="5"
                  placeholder="库存"
                  type="number"
                />
              </view>
            </view>
          </view>
        </view>
        <text class="sku-help">
          适合充电线长度/颜色、充电头功率、手机壳型号等多规格；用户端商品详情会展示这些 SKU。
        </text>
      </view>

      <view class="field">
        <text class="field-label">商品说明</text>
        <textarea
          v-model="form.description"
          adjust-position
          class="field-textarea"
          confirm-type="done"
          cursor-spacing="24"
          maxlength="180"
          placeholder="适配型号、材质、包装内容、售后说明等"
        />
      </view>

      <button class="primary-button submit-button" :disabled="submitting" @tap="submitProduct">
        {{ submitting ? "提交中..." : "提交商品审核" }}
      </button>
    </view>

    <view v-if="hasMerchantAccess" id="product-list" class="section-head">
      <text class="section-title">{{ productListTitle }}</text>
      <text class="muted">{{ filteredProducts.length }} / {{ products.length }} 件</text>
    </view>

    <view v-if="hasMerchantAccess && filteredProducts.length === 0" class="empty-card">
      <text class="section-title">暂无商品</text>
      <text class="muted">{{ productListEmptyText }}</text>
    </view>

    <view
      v-for="product in hasMerchantAccess ? filteredProducts : []"
      :key="product.storeSkuId"
      class="product-card"
    >
      <view class="product-row">
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
        <view class="product-info">
          <view class="product-title-row">
            <text class="product-name">{{ product.name }}</text>
            <text class="status-pill" :class="productStatusClass(product)">
              {{ productStatusLabel(product) }}
            </text>
          </view>
          <text class="muted">{{ product.categoryName }} · {{ product.skuName }}</text>
          <view class="price-line">
            <text class="price">¥{{ product.salePrice }}</text>
            <text class="muted">结算 ¥{{ product.settlePrice }}</text>
            <text class="muted">毛利 ¥{{ product.grossMargin ?? "-" }}</text>
          </view>
          <text class="visibility-line" :class="{ hidden: !product.visibleToUser }">
            {{ product.visibleToUser ? "用户端已可见" : "用户端暂不可见" }}
          </text>
          <text class="visibility-reason">
            {{ product.visibilityStatusText || "请确认审核、库存和上下架状态" }}
          </text>
          <text class="muted">详情图 {{ product.detailImageUrls.length }} 张</text>
          <text v-if="product.reviewRemark" class="review-remark">
            {{ product.reviewRemark }}
          </text>
        </view>
      </view>

      <view v-if="editingStoreSkuId === product.storeSkuId" class="meta-editor">
        <view class="image-editor-card">
          <view class="image-editor-head">
            <view>
              <text class="field-label">图片与展示</text>
              <text class="image-editor-sub">主图影响列表展示，SKU 图影响用户选择规格后的展示。</text>
            </view>
            <text class="review-chip">需重审</text>
          </view>

          <view class="cover-sku-grid">
            <view class="upload-tile compact-upload" @tap="chooseEditCoverImage">
              <image
                v-if="displayImageUrl(editForm.coverUrl)"
                class="preview-image"
                :src="displayImageUrl(editForm.coverUrl)"
                mode="aspectFill"
              />
              <view v-else-if="isHttpImageBlocked(editForm.coverUrl)" class="blocked-image-note">
                <text>HTTPS 后显示</text>
                <text>本地 HTTP 图片已保存</text>
              </view>
              <view v-else class="upload-inner">
                <text class="upload-plus">+</text>
                <text>{{ uploading ? "上传中..." : "上传主图" }}</text>
              </view>
              <view class="upload-caption">
                <text>商品主图</text>
                <text>列表/详情首屏</text>
              </view>
            </view>

            <view class="upload-tile compact-upload" @tap="chooseEditSkuImage">
              <image
                v-if="displayImageUrl(editForm.imageUrl)"
                class="preview-image"
                :src="displayImageUrl(editForm.imageUrl)"
                mode="aspectFill"
              />
              <view v-else class="upload-inner">
                <text class="upload-plus">+</text>
                <text>{{ uploading ? "上传中..." : "上传 SKU 图" }}</text>
              </view>
              <view class="upload-caption">
                <text>当前 SKU 图</text>
                <text>规格切换展示</text>
              </view>
            </view>
          </view>

          <view class="section-head compact">
            <text class="field-label">详情图</text>
            <text class="muted">
              {{ editForm.detailImageUrls.length }} / {{ MAX_DETAIL_IMAGES }} 张
            </text>
          </view>
          <view class="detail-images">
            <view
              v-for="(url, index) in editForm.detailImageUrls"
              :key="url"
              class="detail-image-item"
            >
              <image
                v-if="displayImageUrl(url)"
                class="detail-image"
                :src="displayImageUrl(url)"
                mode="aspectFill"
              />
              <view v-else class="blocked-detail-note">HTTPS 后显示</view>
              <text class="remove-image" @tap.stop="removeEditDetailImage(index)">×</text>
            </view>
            <view
              v-if="editForm.detailImageUrls.length < MAX_DETAIL_IMAGES"
              class="detail-upload"
              @tap="chooseEditDetailImages"
            >
              <text>+</text>
              <text>{{ uploading ? "上传中" : "详情图" }}</text>
            </view>
          </view>
        </view>

        <view class="field">
          <text class="field-label">商品说明</text>
          <textarea
            v-model="editForm.description"
            adjust-position
            class="field-textarea"
            confirm-type="done"
            cursor-spacing="24"
            maxlength="180"
            placeholder="适配型号、材质、包装内容、售后说明等"
          />
        </view>

        <view class="button-row">
          <button class="ghost-button" @tap="cancelEditProduct">取消</button>
          <button class="primary-button" @tap="saveProductMeta(product)">提交审核</button>
        </view>
      </view>

      <view class="edit-grid">
        <view class="edit-field">
          <text>库存</text>
          <input
            adjust-position
            class="mini-input"
            confirm-type="done"
            cursor-spacing="20"
            maxlength="5"
            type="number"
            :value="drafts[product.storeSkuId]?.stock"
            @input="setDraft(product.storeSkuId, 'stock', $event)"
          />
        </view>
        <view class="edit-field">
          <text>销售价</text>
          <input
            adjust-position
            class="mini-input"
            confirm-type="done"
            cursor-spacing="20"
            maxlength="8"
            type="digit"
            :value="drafts[product.storeSkuId]?.salePrice"
            @input="setDraft(product.storeSkuId, 'salePrice', $event)"
          />
        </view>
        <view class="edit-field">
          <text>结算价</text>
          <input
            adjust-position
            class="mini-input"
            confirm-type="done"
            cursor-spacing="20"
            maxlength="8"
            type="digit"
            :value="drafts[product.storeSkuId]?.settlePrice"
            @input="setDraft(product.storeSkuId, 'settlePrice', $event)"
          />
        </view>
      </view>

      <view class="button-row">
        <button class="ghost-button" @tap="beginEditProduct(product)">编辑资料</button>
        <button class="ghost-button" @tap="restock(product)">补货 +10</button>
        <button
          v-if="product.status === 'ON_SALE'"
          class="outline-button"
          @tap="toggleSaleStatus(product, 'OFF_SALE')"
        >
          下架
        </button>
        <button v-else class="outline-button" @tap="toggleSaleStatus(product, 'ON_SALE')">
          上架
        </button>
        <button class="primary-button" @tap="saveProduct(product)">保存调整</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onMounted } from "vue";
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import {
  ApiRequestError,
  api,
  clearMerchantSession,
  getCachedMerchantStore,
  getMerchantToken,
  type MerchantCategory,
  type MerchantProduct,
  type MerchantSkuPayload,
  type MerchantStore
} from "../../services/api";

type Draft = {
  stock: string;
  salePrice: string;
  settlePrice: string;
};

type ProductFilter = "all" | "stock" | "available";
type SkuFormRow = {
  id: string;
  skuName: string;
  salePrice: string;
  settlePrice: string;
  stock: string;
  imageUrl: string;
};

const categories = ref<MerchantCategory[]>([]);
const products = ref<MerchantProduct[]>([]);
const merchantStore = ref<MerchantStore | null>(getCachedMerchantStore());
const MAX_DETAIL_IMAGES = 12;
const selectedCategoryIndex = ref(0);
const submitting = ref(false);
const uploading = ref(false);
const drafts = ref<Record<string, Draft>>({});
const editingStoreSkuId = ref("");
const productFilter = ref<ProductFilter>("all");
const skuRows = ref<SkuFormRow[]>([]);

const form = reactive({
  name: "",
  skuName: "默认规格",
  description: "",
  salePrice: "19.9",
  settlePrice: "16.9",
  stock: "20",
  imageUrl: "",
  coverUrl: "",
  detailImageUrls: [] as string[]
});

const editForm = reactive({
  description: "",
  imageUrl: "",
  coverUrl: "",
  detailImageUrls: [] as string[]
});

const categoryNames = computed(() => categories.value.map((category) => category.name));
const selectedCategoryLabel = computed(
  () => categoryNames.value[selectedCategoryIndex.value] ?? "选择分类"
);
const totalStock = computed(() => products.value.reduce((sum, product) => sum + product.stock, 0));
const availableCount = computed(() => products.value.filter((product) => product.available).length);
const filteredProducts = computed(() => {
  if (productFilter.value === "stock") {
    return products.value.filter((product) => product.stock > 0);
  }
  if (productFilter.value === "available") {
    return products.value.filter((product) => product.available);
  }
  return products.value;
});
const productListTitle = computed(() => {
  if (productFilter.value === "stock") return "有库存商品";
  if (productFilter.value === "available") return "可售商品";
  return "门店商品";
});
const productListEmptyText = computed(() => {
  if (productFilter.value === "stock") return "当前没有现货库存商品，可补货后再查看。";
  if (productFilter.value === "available")
    return "当前没有用户端可售商品，请确认库存、上下架和审核状态。";
  return "新增后会写入同一套后端数据库，并同步到用户端商品列表。";
});
const pendingCount = computed(
  () => products.value.filter((product) => product.reviewStatus === "PENDING").length
);
const rejectedCount = computed(
  () => products.value.filter((product) => product.reviewStatus === "REJECTED").length
);
const visibleCount = computed(
  () => products.value.filter((product) => product.visibleToUser).length
);
const hasMerchantAccess = computed(() => Boolean(merchantStore.value?.code && getMerchantToken()));
const grossMarginPreview = computed(() => {
  const salePrice = Number(form.salePrice);
  const settlePrice = Number(form.settlePrice || form.salePrice);
  if (!Number.isFinite(salePrice) || !Number.isFinite(settlePrice)) {
    return 0;
  }
  return Math.round((salePrice - settlePrice) * 100) / 100;
});
const isGrossMarginNegative = computed(() => grossMarginPreview.value < 0);
const grossMarginPreviewText = computed(() => grossMarginPreview.value.toFixed(2));
const formReadinessItems = computed(() => [
  { label: "商品名称", ok: Boolean(form.name.trim()) },
  { label: "主图", ok: Boolean(form.coverUrl) },
  { label: "销售价", ok: Number(form.salePrice) > 0 },
  { label: "结算价", ok: Number(form.settlePrice || form.salePrice) > 0 },
  { label: "库存", ok: Number(form.stock) > 0 },
  { label: "商品说明", ok: Boolean(form.description.trim()) },
  { label: "SKU", ok: buildSkuPayload({ silent: true }).length > 0 }
]);

function displayImageUrl(url?: string) {
  const value = (url || "").trim();
  return value;
}

function isHttpImageBlocked(url?: string) {
  void url;
  return false;
}

function getInputValue(event: unknown) {
  return String((event as { detail?: { value?: string } }).detail?.value ?? "");
}

function setDraft(storeSkuId: string, key: keyof Draft, event: unknown) {
  const current = drafts.value[storeSkuId];
  if (!current) return;
  drafts.value = {
    ...drafts.value,
    [storeSkuId]: {
      ...current,
      [key]: getInputValue(event)
    }
  };
}

function resetDrafts(items: MerchantProduct[]) {
  drafts.value = items.reduce<Record<string, Draft>>((result, product) => {
    result[product.storeSkuId] = {
      stock: String(product.stock),
      salePrice: String(product.salePrice),
      settlePrice: String(product.settlePrice)
    };
    return result;
  }, {});
}

function handleCategoryChange(event: { detail?: { value?: number | string } }) {
  selectedCategoryIndex.value = Number(event.detail?.value ?? 0);
}

function newSkuRow(): SkuFormRow {
  return {
    id: `sku-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    skuName: "",
    salePrice: "",
    settlePrice: "",
    stock: "",
    imageUrl: ""
  };
}

function addSkuRow() {
  if (skuRows.value.length >= 11) {
    uni.showToast({ title: "最多支持 12 个 SKU", icon: "none" });
    return;
  }
  skuRows.value = [...skuRows.value, newSkuRow()];
}

function removeSkuRow(id: string) {
  skuRows.value = skuRows.value.filter((row) => row.id !== id);
}

function buildSkuPayload(options: { silent?: boolean } = {}) {
  const rows: SkuFormRow[] = [
    {
      id: "base",
      skuName: form.skuName,
      salePrice: form.salePrice,
      settlePrice: form.settlePrice,
      stock: form.stock,
      imageUrl: form.imageUrl
    },
    ...skuRows.value
  ];
  const usedNames = new Set<string>();
  const payload: MerchantSkuPayload[] = [];

  for (const row of rows) {
    const skuName = row.skuName.trim();
    const salePrice = Number(row.salePrice);
    const settlePrice = Number(row.settlePrice || row.salePrice);
    const stock = Number(row.stock || 0);

    if (!skuName && row.id !== "base") {
      continue;
    }
    if (!skuName) {
      if (!options.silent) uni.showToast({ title: "请填写默认规格", icon: "none" });
      return [];
    }
    if (usedNames.has(skuName.toLowerCase())) {
      if (!options.silent) uni.showToast({ title: `SKU 重复：${skuName}`, icon: "none" });
      return [];
    }
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      if (!options.silent) uni.showToast({ title: `${skuName} 销售价不正确`, icon: "none" });
      return [];
    }
    if (!Number.isFinite(settlePrice) || settlePrice <= 0 || settlePrice > salePrice) {
      if (!options.silent) uni.showToast({ title: `${skuName} 结算价不正确`, icon: "none" });
      return [];
    }
    if (!Number.isFinite(stock) || stock < 0) {
      if (!options.silent) uni.showToast({ title: `${skuName} 库存不正确`, icon: "none" });
      return [];
    }

    usedNames.add(skuName.toLowerCase());
    payload.push({
      skuName,
      salePrice,
      settlePrice,
      stock,
      imageUrl: row.imageUrl
    });
  }

  return payload;
}

function focusProductList(filter: ProductFilter) {
  productFilter.value = filter;
  setTimeout(() => {
    uni.pageScrollTo({
      selector: "#product-list",
      duration: 220
    });
  }, 50);
}

function readImageAsDataUrl(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    if (filePath.startsWith("data:")) {
      resolve(filePath);
      return;
    }

    // #ifdef H5
    fetch(filePath)
      .then((response) => response.blob())
      .then((blob) => compressBlobToDataUrl(blob))
      .then(resolve)
      .catch(reject);
    // #endif

    // #ifndef H5
    const fileSystem = (
      uni as unknown as {
        getFileSystemManager?: () => {
          readFile: (options: {
            filePath: string;
            encoding: "base64";
            success: (result: { data: string }) => void;
            fail: (error: unknown) => void;
          }) => void;
        };
      }
    ).getFileSystemManager?.();
    if (!fileSystem) {
      reject(new Error("当前环境不支持读取图片"));
      return;
    }
    fileSystem.readFile({
      filePath,
      encoding: "base64",
      success(result) {
        resolve(`data:image/jpeg;base64,${result.data}`);
      },
      fail: reject
    });
    // #endif
  });
}

// #ifdef H5
function compressBlobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const maxSide = 1280;
      const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * ratio));
      const height = Math.max(1, Math.round(image.height * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      URL.revokeObjectURL(objectUrl);
      if (!context) {
        reject(new Error("图片压缩失败"));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("图片读取失败"));
    };
    image.src = objectUrl;
  });
}
// #endif

function compressImageForUpload(filePath: string) {
  return new Promise<string>((resolve) => {
    // #ifdef MP-WEIXIN
    const compressImage = (
      uni as unknown as {
        compressImage?: (options: {
          src: string;
          quality: number;
          compressedWidth?: number;
          compressedHeight?: number;
          success: (result: { tempFilePath?: string }) => void;
          fail: () => void;
        }) => void;
      }
    ).compressImage;

    if (!compressImage || filePath.startsWith("data:")) {
      resolve(filePath);
      return;
    }

    compressImage({
      src: filePath,
      quality: 55,
      compressedWidth: 1280,
      compressedHeight: 1280,
      success(result) {
        resolve(result.tempFilePath || filePath);
      },
      fail() {
        resolve(filePath);
      }
    });
    // #endif

    // #ifndef MP-WEIXIN
    resolve(filePath);
    // #endif
  });
}

async function uploadImage(filePath: string) {
  if (!getMerchantToken()) {
    throw new ApiRequestError("登录状态已过期，请重新登录商家端", 401);
  }
  const compressedFilePath = await compressImageForUpload(filePath);
  try {
    const fileResult = await api.uploadImageFile(compressedFilePath, "products");
    return fileResult.url;
  } catch {
    // H5 blob 地址或部分开发环境可能不支持 uploadFile，兜底走 JSON 上传。
  }

  const dataUrl = await readImageAsDataUrl(compressedFilePath);
  if (dataUrl.length > 9_500_000) {
    throw new Error("图片过大，请裁剪后重新选择");
  }
  const result = await api.uploadImage({
    fileName: compressedFilePath.split("/").pop() || filePath.split("/").pop(),
    dataUrl
  });
  return result.url;
}

async function uploadImagesSequential(filePaths: string[]) {
  const urls: string[] = [];
  for (const filePath of filePaths) {
    urls.push(await uploadImage(filePath));
  }
  return urls;
}

function handleApiError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const statusCode = error instanceof ApiRequestError ? error.statusCode : undefined;

  if (statusCode === 401) {
    clearMerchantSession();
    merchantStore.value = null;
    products.value = [];
    resetDrafts([]);
    uni.showToast({ title: message || "登录已过期，请重新登录", icon: "none" });
    setTimeout(() => {
      uni.navigateTo({ url: "/pages/login/index" });
    }, 650);
    return;
  }

  uni.showToast({ title: message || fallback, icon: "none" });
}

function chooseCoverImage() {
  if (uploading.value) return;
  uni.chooseImage({
    count: 1,
    sourceType: ["album", "camera"],
    sizeType: ["compressed"],
    success(result) {
      const filePath = result.tempFilePaths[0];
      if (!filePath) return;
      uploading.value = true;
      void uploadImage(filePath)
        .then((url) => {
          form.coverUrl = url;
          uni.showToast({ title: "主图已上传", icon: "success" });
        })
        .catch((error) => {
          handleApiError(error, "主图上传失败");
        })
        .finally(() => {
          uploading.value = false;
        });
    }
  });
}

function chooseBaseSkuImage() {
  if (uploading.value) return;
  uni.chooseImage({
    count: 1,
    sourceType: ["album", "camera"],
    sizeType: ["compressed"],
    success(result) {
      const filePath = result.tempFilePaths[0];
      if (!filePath) return;
      uploading.value = true;
      void uploadImage(filePath)
        .then((url) => {
          form.imageUrl = url;
          uni.showToast({ title: "SKU 图已上传", icon: "success" });
        })
        .catch((error) => {
          handleApiError(error, "SKU 图上传失败");
        })
        .finally(() => {
          uploading.value = false;
        });
    }
  });
}

function chooseSkuRowImage(id: string) {
  if (uploading.value) return;
  uni.chooseImage({
    count: 1,
    sourceType: ["album", "camera"],
    sizeType: ["compressed"],
    success(result) {
      const filePath = result.tempFilePaths[0];
      if (!filePath) return;
      uploading.value = true;
      void uploadImage(filePath)
        .then((url) => {
          skuRows.value = skuRows.value.map((row) =>
            row.id === id ? { ...row, imageUrl: url } : row
          );
          uni.showToast({ title: "SKU 图已上传", icon: "success" });
        })
        .catch((error) => {
          handleApiError(error, "SKU 图上传失败");
        })
        .finally(() => {
          uploading.value = false;
        });
    }
  });
}

function chooseDetailImages() {
  if (uploading.value) return;
  uni.chooseImage({
    count: Math.max(1, MAX_DETAIL_IMAGES - form.detailImageUrls.length),
    sourceType: ["album", "camera"],
    sizeType: ["compressed"],
    success(result) {
      const filePaths = ([] as string[])
        .concat(result.tempFilePaths as string[])
        .slice(0, MAX_DETAIL_IMAGES - form.detailImageUrls.length);
      if (filePaths.length === 0) return;
      uploading.value = true;
      void uploadImagesSequential(filePaths)
        .then((urls) => {
          form.detailImageUrls = [...form.detailImageUrls, ...urls].slice(0, MAX_DETAIL_IMAGES);
          uni.showToast({ title: "详情图已上传", icon: "success" });
        })
        .catch((error) => {
          handleApiError(error, "详情图上传失败");
        })
        .finally(() => {
          uploading.value = false;
        });
    }
  });
}

function removeDetailImage(index: number) {
  form.detailImageUrls = form.detailImageUrls.filter((_, itemIndex) => itemIndex !== index);
}

function removeEditDetailImage(index: number) {
  editForm.detailImageUrls = editForm.detailImageUrls.filter((_, itemIndex) => itemIndex !== index);
}

function beginEditProduct(product: MerchantProduct) {
  editingStoreSkuId.value = product.storeSkuId;
  editForm.description = product.description;
  editForm.imageUrl = product.skuImageUrl || "";
  editForm.coverUrl = product.coverUrl;
  editForm.detailImageUrls = [...product.detailImageUrls];
}

function cancelEditProduct() {
  editingStoreSkuId.value = "";
  editForm.description = "";
  editForm.imageUrl = "";
  editForm.coverUrl = "";
  editForm.detailImageUrls = [];
}

function chooseEditSkuImage() {
  if (uploading.value) return;
  uni.chooseImage({
    count: 1,
    sourceType: ["album", "camera"],
    sizeType: ["compressed"],
    success(result) {
      const filePath = result.tempFilePaths[0];
      if (!filePath) return;
      uploading.value = true;
      void uploadImage(filePath)
        .then((url) => {
          editForm.imageUrl = url;
          uni.showToast({ title: "SKU 图已上传", icon: "success" });
        })
        .catch((error) => {
          handleApiError(error, "SKU 图上传失败");
        })
        .finally(() => {
          uploading.value = false;
        });
    }
  });
}

function chooseEditCoverImage() {
  if (uploading.value) return;
  uni.chooseImage({
    count: 1,
    sourceType: ["album", "camera"],
    sizeType: ["compressed"],
    success(result) {
      const filePath = result.tempFilePaths[0];
      if (!filePath) return;
      uploading.value = true;
      void uploadImage(filePath)
        .then((url) => {
          editForm.coverUrl = url;
          uni.showToast({ title: "主图已上传", icon: "success" });
        })
        .catch((error) => {
          handleApiError(error, "主图上传失败");
        })
        .finally(() => {
          uploading.value = false;
        });
    }
  });
}

function chooseEditDetailImages() {
  if (uploading.value) return;
  uni.chooseImage({
    count: Math.max(1, MAX_DETAIL_IMAGES - editForm.detailImageUrls.length),
    sourceType: ["album", "camera"],
    sizeType: ["compressed"],
    success(result) {
      const filePaths = ([] as string[])
        .concat(result.tempFilePaths as string[])
        .slice(0, MAX_DETAIL_IMAGES - editForm.detailImageUrls.length);
      if (filePaths.length === 0) return;
      uploading.value = true;
      void uploadImagesSequential(filePaths)
        .then((urls) => {
          editForm.detailImageUrls = [...editForm.detailImageUrls, ...urls].slice(
            0,
            MAX_DETAIL_IMAGES
          );
          uni.showToast({ title: "详情图已上传", icon: "success" });
        })
        .catch((error) => {
          handleApiError(error, "详情图上传失败");
        })
        .finally(() => {
          uploading.value = false;
        });
    }
  });
}

async function loadProducts() {
  merchantStore.value = getCachedMerchantStore();
  if (!hasMerchantAccess.value) {
    products.value = [];
    resetDrafts([]);
    return;
  }

  try {
    const [categoryData, productData] = await Promise.all([api.categories(), api.products()]);
    categories.value = categoryData.length > 0 ? categoryData : categories.value;
    products.value = productData;
    resetDrafts(productData);
  } catch (error) {
    handleApiError(error, "门店商品读取失败");
  }
}

function goLogin() {
  uni.navigateTo({ url: "/pages/login/index" });
}

function goSettings() {
  uni.switchTab({ url: "/pages/settings/index" });
}

function productStatusLabel(product: MerchantProduct) {
  if (product.reviewStatus === "PENDING") return "待审核";
  if (product.reviewStatus === "REJECTED") return "已驳回";
  if (product.status === "OFF_SALE") return "已下架";
  if (product.stock <= 0) return "已售罄";
  return "已上架";
}

function productStatusClass(product: MerchantProduct) {
  return {
    pending: product.reviewStatus === "PENDING",
    danger: product.reviewStatus === "REJECTED" || product.stock <= 0,
    gray: product.reviewStatus === "APPROVED" && product.status === "OFF_SALE"
  };
}

function resetForm() {
  form.name = "";
  form.skuName = "默认规格";
  form.description = "";
  form.salePrice = "19.9";
  form.settlePrice = "16.9";
  form.stock = "20";
  form.imageUrl = "";
  form.coverUrl = "";
  form.detailImageUrls = [];
  skuRows.value = [];
}

async function submitProduct() {
  if (submitting.value) return;
  const skuPayload = buildSkuPayload();

  if (!form.name.trim()) {
    uni.showToast({ title: "请填写商品名称", icon: "none" });
    return;
  }
  if (skuPayload.length === 0) {
    return;
  }

  submitting.value = true;
  try {
    await api.createProduct({
      categoryId: categories.value[selectedCategoryIndex.value]?.id,
      name: form.name.trim(),
      skuName: form.skuName.trim() || "默认规格",
      description: form.description.trim(),
      salePrice: Number(form.salePrice),
      settlePrice: Number(form.settlePrice || form.salePrice),
      stock: Number(form.stock),
      imageUrl: form.imageUrl,
      skus: skuPayload,
      coverUrl: form.coverUrl,
      detailImageUrls: form.detailImageUrls
    });
    uni.showToast({ title: "已提交审核", icon: "success" });
    resetForm();
    await loadProducts();
  } catch (error) {
    handleApiError(error, "发布失败，请检查后端服务");
  } finally {
    submitting.value = false;
  }
}

async function saveProduct(product: MerchantProduct) {
  const draft = drafts.value[product.storeSkuId];
  if (!draft) return;
  const stock = Number(draft.stock);
  const salePrice = Number(draft.salePrice);
  const settlePrice = Number(draft.settlePrice);
  if (!Number.isFinite(stock) || stock < 0) {
    uni.showToast({ title: "库存格式不正确", icon: "none" });
    return;
  }
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    uni.showToast({ title: "销售价需大于0", icon: "none" });
    return;
  }
  if (!Number.isFinite(settlePrice) || settlePrice <= 0) {
    uni.showToast({ title: "结算价需大于0", icon: "none" });
    return;
  }
  if (settlePrice > salePrice) {
    uni.showToast({ title: "结算价不能高于销售价", icon: "none" });
    return;
  }
  try {
    const updated = await api.updateProduct(product.storeSkuId, {
      stock,
      salePrice,
      settlePrice,
      description: product.description,
      coverUrl: product.coverUrl,
      detailImageUrls: product.detailImageUrls
    });
    products.value = products.value.map((item) =>
      item.storeSkuId === updated.storeSkuId ? updated : item
    );
    resetDrafts(products.value);
    uni.showToast({ title: "已保存", icon: "success" });
  } catch (error) {
    handleApiError(error, "保存失败");
  }
}

async function toggleSaleStatus(product: MerchantProduct, status: "ON_SALE" | "OFF_SALE") {
  try {
    const updated = await api.updateProduct(product.storeSkuId, { status });
    products.value = products.value.map((item) =>
      item.storeSkuId === updated.storeSkuId ? updated : item
    );
    resetDrafts(products.value);
    uni.showToast({ title: status === "ON_SALE" ? "已上架" : "已下架", icon: "success" });
  } catch (error) {
    handleApiError(error, "操作失败");
  }
}

async function saveProductMeta(product: MerchantProduct) {
  try {
    const draft = drafts.value[product.storeSkuId];
    const updated = await api.updateProduct(product.storeSkuId, {
      stock: Number(draft?.stock ?? product.stock),
      salePrice: Number(draft?.salePrice ?? product.salePrice),
      settlePrice: Number(draft?.settlePrice ?? product.settlePrice),
      imageUrl: editForm.imageUrl,
      description: editForm.description.trim(),
      coverUrl: editForm.coverUrl,
      detailImageUrls: editForm.detailImageUrls
    });
    products.value = products.value.map((item) =>
      item.storeSkuId === updated.storeSkuId ? updated : item
    );
    resetDrafts(products.value);
    cancelEditProduct();
    uni.showToast({ title: "已提交审核", icon: "success" });
  } catch (error) {
    handleApiError(error, "提交失败");
  }
}

async function restock(product: MerchantProduct) {
  const current = drafts.value[product.storeSkuId];
  const nextStock = Number(current?.stock ?? product.stock) + 10;
  drafts.value = {
    ...drafts.value,
    [product.storeSkuId]: {
      stock: String(nextStock),
      salePrice: current?.salePrice ?? String(product.salePrice),
      settlePrice: current?.settlePrice ?? String(product.settlePrice)
    }
  };
  await saveProduct(product);
}

onMounted(() => {
  void loadProducts().catch(() => undefined);
});

onShow(() => {
  merchantStore.value = getCachedMerchantStore();
  void loadProducts().catch(() => undefined);
});

onPullDownRefresh(() => {
  void loadProducts().finally(() => {
    uni.stopPullDownRefresh();
  });
});
</script>

<style scoped>
.product-manage-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: radial-gradient(circle at 100% 0%, rgba(255, 122, 0, 0.18), transparent 24%), #f7f8fa;
}

.product-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  border-radius: 0 0 28px 28px;
  margin: -12px -12px 0;
  padding: 20px 16px 28px;
  background:
    radial-gradient(circle at 88% 8%, rgba(255, 255, 255, 0.28), transparent 30%),
    linear-gradient(135deg, #ff7a00, #ffb020);
  color: #ffffff;
  box-shadow: 0 14px 34px rgba(255, 122, 0, 0.22);
}

.product-hero::after {
  position: absolute;
  right: -22px;
  bottom: -36px;
  width: 128px;
  height: 128px;
  border-radius: 36px;
  background: rgba(255, 255, 255, 0.13);
  transform: rotate(-16deg);
  content: "";
}

.hero-kicker,
.hero-subtitle {
  display: block;
  font-size: 12px;
  opacity: 0.9;
}

.hero-title {
  display: block;
  margin-top: 6px;
  font-size: 24px;
  font-weight: 800;
}

.hero-subtitle {
  max-width: 226px;
  margin-top: 8px;
  line-height: 1.45;
}

.hero-mark {
  display: flex;
  width: 68px;
  height: 68px;
  align-items: center;
  justify-content: center;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.2);
  font-size: 30px;
  font-weight: 800;
  transform: rotate(-10deg);
  z-index: 1;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  position: relative;
  z-index: 2;
  margin-top: 0;
}

.stat-card,
.empty-card,
.product-card {
  border: 1px solid rgba(17, 17, 17, 0.025);
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(17, 17, 17, 0.07);
}

.stat-card {
  min-height: 72px;
  padding: 12px 8px;
  box-sizing: border-box;
  text-align: center;
}

.stat-card:active {
  transform: scale(0.98);
  opacity: 0.86;
}

.stat-card.active {
  outline: 2px solid rgba(255, 122, 0, 0.28);
  background: #fffaf4;
}

.stat-value {
  display: block;
  margin-bottom: 4px;
  font-size: 18px;
  font-weight: 800;
}

.current-store-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid rgba(255, 122, 0, 0.08);
  border-radius: 18px;
  padding: 13px 14px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06);
}

.current-store-label,
.current-store-name {
  display: block;
}

.current-store-label {
  color: #999999;
  font-size: 11px;
}

.current-store-name {
  margin-top: 4px;
  color: #111111;
  font-size: 15px;
  font-weight: 900;
}

.current-store-action {
  flex-shrink: 0;
  color: #ff7a00;
  font-size: 12px;
  font-weight: 900;
}

.form-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.audit-flow-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 15px;
}

.flow-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.flow-step {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 6px;
  border-radius: 14px;
  padding: 10px 4px;
  background: #f7f8fa;
  color: #999999;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
}

.flow-step.active {
  background: #fff2e8;
  color: #ff7a00;
}

.flow-index {
  display: flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #ffffff;
  font-size: 12px;
  font-weight: 900;
}

.audit-summary {
  display: flex;
  justify-content: space-between;
  border-radius: 14px;
  padding: 9px 10px;
  background: #f7f8fa;
  color: #666666;
  font-size: 11px;
  font-weight: 700;
}

.form-note {
  border-radius: 14px;
  padding: 10px 12px;
  background: #fffaf4;
  color: #8a4b13;
  font-size: 12px;
  line-height: 1.45;
}

.audit-gate {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: -24px;
}

.audit-gate .muted {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.45;
}

.audit-gate button {
  width: 100%;
}

.section-head,
.product-row,
.product-title-row,
.price-line,
.button-row {
  display: flex;
  align-items: center;
}

.section-head.compact {
  margin-bottom: -4px;
}

.section-head,
.product-title-row {
  justify-content: space-between;
}

.image-editor-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid rgba(255, 122, 0, 0.08);
  border-radius: 20px;
  padding: 12px;
  background: linear-gradient(180deg, #fffaf4 0%, #ffffff 100%);
}

.image-editor-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.image-editor-sub {
  display: block;
  margin-top: 4px;
  color: #99600f;
  font-size: 11px;
  line-height: 1.45;
}

.review-chip {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 5px 9px;
  background: #fff2e8;
  color: #ff7a00;
  font-size: 11px;
  font-weight: 900;
}

.cover-sku-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.image-upload {
  position: relative;
  overflow: hidden;
  height: 128px;
  border: 1px dashed rgba(255, 122, 0, 0.32);
  border-radius: 20px;
  background:
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.86), transparent 28%),
    linear-gradient(135deg, rgba(255, 122, 0, 0.1), rgba(255, 176, 32, 0.22)), #fffaf4;
}

.image-upload::after {
  position: absolute;
  right: -20px;
  bottom: -24px;
  width: 80px;
  height: 80px;
  border-radius: 24px;
  background: rgba(255, 122, 0, 0.08);
  transform: rotate(-14deg);
  content: "";
}

.upload-tile {
  position: relative;
  overflow: hidden;
  height: 118px;
  border: 1px dashed rgba(255, 122, 0, 0.28);
  border-radius: 18px;
  background:
    radial-gradient(circle at 84% 22%, rgba(255, 255, 255, 0.9), transparent 28%),
    linear-gradient(135deg, rgba(255, 122, 0, 0.09), rgba(255, 176, 32, 0.2)), #fffaf4;
}

.cover-tile {
  height: 132px;
}

.preview-image,
.upload-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
}

.upload-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 5px;
  color: #ff7a00;
  font-size: 13px;
  font-weight: 800;
}

.upload-plus {
  font-size: 32px;
  line-height: 1;
}

.upload-hint {
  color: #99600f;
  font-size: 11px;
  font-weight: 500;
}

.upload-caption {
  position: absolute;
  right: 8px;
  bottom: 8px;
  left: 8px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  border-radius: 12px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.88);
  color: #8a4b13;
  font-size: 10px;
  font-weight: 800;
  backdrop-filter: blur(8px);
}

.upload-caption text:first-child {
  color: #ff7a00;
  font-size: 11px;
  font-weight: 900;
}

.upload-readiness-card {
  display: flex;
  margin: 10px 0 16px;
  padding: 12px 14px;
  flex-direction: column;
  gap: 5px;
  border-radius: 18px;
  background: #fff7ed;
  color: #99600f;
  font-size: 12px;
  line-height: 1.55;
}

.upload-readiness-title {
  color: #ff7a00;
  font-size: 13px;
  font-weight: 900;
}

.readiness-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 18px;
  padding: 12px;
  background: #f7f8fa;
}

.readiness-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.gross-margin {
  border-radius: 999px;
  padding: 4px 8px;
  background: #e9fbf2;
  color: #0f9f6e;
  font-size: 11px;
  font-weight: 800;
}

.gross-margin.danger {
  background: #fff0f0;
  color: #ff3b30;
}

.readiness-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
}

.readiness-item {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 999px;
  padding: 6px 4px;
  background: #ffffff;
  color: #999999;
  font-size: 11px;
  font-weight: 800;
}

.readiness-item.ok {
  background: #fff2e8;
  color: #ff7a00;
}

.sku-config-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 18px;
  padding: 12px;
  background: #f7f8fa;
}

.sku-add,
.remove-sku {
  color: #ff7a00;
  font-size: 12px;
  font-weight: 900;
}

.remove-sku {
  color: #ff3b30;
}

.sku-base-row,
.sku-row-body,
.sku-row-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sku-base-row,
.sku-row-card {
  border-radius: 16px;
  padding: 10px;
  background: #ffffff;
}

.sku-row-card {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.sku-row-head {
  justify-content: space-between;
}

.sku-row-title {
  display: block;
  color: #111111;
  font-size: 13px;
  font-weight: 900;
}

.sku-thumb {
  display: flex;
  width: 58px;
  height: 58px;
  align-items: center;
  justify-content: center;
  flex: 0 0 58px;
  overflow: hidden;
  border-radius: 16px;
  background: #fff2e8;
  color: #ff7a00;
  font-size: 11px;
  font-weight: 900;
}

.sku-thumb-image {
  width: 100%;
  height: 100%;
}

.sku-inputs {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.sku-mini-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.sku-mini-grid .field-input {
  padding: 0 8px;
  font-size: 12px;
}

.sku-help {
  color: #8a4b13;
  font-size: 11px;
  line-height: 1.5;
}

.sku-edit-image {
  position: relative;
  overflow: hidden;
  height: 96px;
  border: 1px dashed rgba(255, 122, 0, 0.28);
  border-radius: 18px;
  background: #fffaf4;
}

.blocked-image-note,
.blocked-detail-note {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(255, 122, 0, 0.1), rgba(255, 176, 32, 0.18)), #fffaf4;
  color: #ff7a00;
  font-size: 12px;
  font-weight: 800;
}

.blocked-image-note {
  flex-direction: column;
  gap: 5px;
}

.blocked-detail-note {
  padding: 8px;
  text-align: center;
  box-sizing: border-box;
}

.detail-images {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.detail-image-item,
.detail-upload {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1;
  border: 1px solid rgba(255, 122, 0, 0.08);
  border-radius: 16px;
  background: #fffaf4;
}

.detail-image {
  width: 100%;
  height: 100%;
}

.remove-image {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(17, 17, 17, 0.62);
  color: #ffffff;
  font-size: 14px;
  line-height: 1;
}

.detail-upload {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 3px;
  color: #ff7a00;
  font-size: 11px;
  font-weight: 800;
}

.detail-upload text:first-child {
  font-size: 22px;
  line-height: 1;
}

.field,
.edit-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.field-label,
.edit-field text {
  color: #666666;
  font-size: 12px;
}

.field-input,
.field-textarea,
.picker-box,
.mini-input {
  box-sizing: border-box;
  width: 100%;
  border-radius: 16px;
  background: #f7f8fa;
  color: #111111;
  font-size: 14px;
}

.field-input,
.picker-box,
.mini-input {
  height: 42px;
  padding: 0 12px;
  line-height: 42px;
}

.field-textarea {
  min-height: 72px;
  padding: 10px 12px;
  line-height: 1.45;
}

.submit-button {
  width: 100%;
}

.meta-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 16px;
  padding: 11px;
  background: #fffaf4;
}

.compact-upload {
  height: 112px;
}

.empty-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 18px;
}

.product-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
}

.product-row {
  gap: 10px;
}

.product-image {
  position: relative;
  display: flex;
  width: 68px;
  height: 68px;
  flex: 0 0 68px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 18px;
  color: #ff7a00;
  font-size: 10px;
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
  font-size: 9px;
}

.device-shape {
  position: absolute;
  width: 34px;
  height: 44px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.82);
  transform: rotate(-18deg);
}

.product-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

.product-name {
  overflow: hidden;
  max-width: 158px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-pill {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 3px 7px;
  background: #e9fbf2;
  color: #0f9f6e;
  font-size: 11px;
  font-weight: 800;
}

.status-pill.danger {
  background: #fff1f0;
  color: #ff3b30;
}

.status-pill.pending {
  background: #fff6e5;
  color: #ff7a00;
}

.status-pill.gray {
  background: #f2f3f5;
  color: #666666;
}

.review-remark {
  display: block;
  border-radius: 12px;
  padding: 7px 9px;
  background: #f7f8fa;
  color: #666666;
  font-size: 11px;
  line-height: 1.4;
}

.price-line {
  gap: 8px;
}

.visibility-line {
  color: #0f9f6e;
  font-size: 11px;
  font-weight: 800;
}

.visibility-line.hidden {
  color: #ff7a00;
}

.visibility-reason {
  color: #999999;
  font-size: 11px;
  line-height: 1.35;
}

.edit-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  border-radius: 18px;
  padding: 10px;
  background: #f7f8fa;
}

.mini-input {
  height: 36px;
  background: #ffffff;
  text-align: center;
}

.button-row {
  gap: 10px;
  flex-wrap: wrap;
}

.button-row button {
  flex: 1 1 42%;
  min-width: 0;
  padding: 0 8px;
}

.outline-button {
  display: flex;
  height: 40px;
  align-items: center;
  justify-content: center;
  margin: 0;
  border-radius: 999px;
  border: 1px solid rgba(17, 17, 17, 0.12);
  background: #ffffff;
  color: #111111;
  font-weight: 700;
  line-height: 1;
}

.outline-button::after {
  border: 0;
}
</style>
