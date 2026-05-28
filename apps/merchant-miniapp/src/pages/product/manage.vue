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

      <view class="field-label">商品主图</view>
      <view class="image-upload" @tap="chooseCoverImage">
        <image v-if="form.coverUrl" class="preview-image" :src="form.coverUrl" mode="aspectFill" />
        <view v-else class="upload-inner">
          <text class="upload-plus">+</text>
          <text>{{ uploading ? "上传中..." : "上传商品主图" }}</text>
          <text class="upload-hint">用户端列表和详情页展示</text>
        </view>
      </view>

      <view class="section-head compact">
        <text class="field-label">详情图</text>
        <text class="muted">最多 6 张</text>
      </view>
      <view class="detail-images">
        <view v-for="(url, index) in form.detailImageUrls" :key="url" class="detail-image-item">
          <image class="detail-image" :src="url" mode="aspectFill" />
          <text class="remove-image" @tap.stop="removeDetailImage(index)">×</text>
        </view>
        <view
          v-if="form.detailImageUrls.length < 6"
          class="detail-upload"
          @tap="chooseDetailImages"
        >
          <text>+</text>
          <text>{{ uploading ? "上传中" : "详情图" }}</text>
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
          :style="{ background: product.coverUrl ? '#f7f8fa' : product.imageTone }"
        >
          <image
            v-if="product.coverUrl"
            class="product-cover"
            :src="product.coverUrl"
            mode="aspectFill"
          />
          <view v-if="!product.coverUrl" class="device-shape"></view>
          <text v-if="!product.coverUrl">金闪送</text>
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
          </view>
          <text class="visibility-line" :class="{ hidden: !product.visibleToUser }">
            {{ product.visibleToUser ? "用户端已可见" : "用户端暂不可见" }}
          </text>
          <text class="muted">详情图 {{ product.detailImageUrls.length }} 张</text>
          <text v-if="product.reviewRemark" class="review-remark">
            {{ product.reviewRemark }}
          </text>
        </view>
      </view>

      <view v-if="editingStoreSkuId === product.storeSkuId" class="meta-editor">
        <view class="section-head compact">
          <text class="field-label">商品主图</text>
          <text class="muted">修改后需重新审核</text>
        </view>
        <view class="image-upload compact-upload" @tap="chooseEditCoverImage">
          <image
            v-if="editForm.coverUrl"
            class="preview-image"
            :src="editForm.coverUrl"
            mode="aspectFill"
          />
          <view v-else class="upload-inner">
            <text class="upload-plus">+</text>
            <text>{{ uploading ? "上传中..." : "上传主图" }}</text>
          </view>
        </view>

        <view class="section-head compact">
          <text class="field-label">详情图</text>
          <text class="muted">最多 6 张</text>
        </view>
        <view class="detail-images">
          <view
            v-for="(url, index) in editForm.detailImageUrls"
            :key="url"
            class="detail-image-item"
          >
            <image class="detail-image" :src="url" mode="aspectFill" />
            <text class="remove-image" @tap.stop="removeEditDetailImage(index)">×</text>
          </view>
          <view
            v-if="editForm.detailImageUrls.length < 6"
            class="detail-upload"
            @tap="chooseEditDetailImages"
          >
            <text>+</text>
            <text>{{ uploading ? "上传中" : "详情图" }}</text>
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
  type MerchantStore
} from "../../services/api";

type Draft = {
  stock: string;
  salePrice: string;
  settlePrice: string;
};

type ProductFilter = "all" | "stock" | "available";

const categories = ref<MerchantCategory[]>([]);
const products = ref<MerchantProduct[]>([]);
const merchantStore = ref<MerchantStore | null>(getCachedMerchantStore());
const selectedCategoryIndex = ref(0);
const submitting = ref(false);
const uploading = ref(false);
const drafts = ref<Record<string, Draft>>({});
const editingStoreSkuId = ref("");
const productFilter = ref<ProductFilter>("all");

const form = reactive({
  name: "",
  skuName: "默认规格",
  description: "",
  salePrice: "19.9",
  settlePrice: "16.9",
  stock: "20",
  coverUrl: "",
  detailImageUrls: [] as string[]
});

const editForm = reactive({
  description: "",
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
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      })
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

function chooseDetailImages() {
  if (uploading.value) return;
  uni.chooseImage({
    count: Math.max(1, 6 - form.detailImageUrls.length),
    sourceType: ["album", "camera"],
    sizeType: ["compressed"],
    success(result) {
      const filePaths = ([] as string[])
        .concat(result.tempFilePaths as string[])
        .slice(0, 6 - form.detailImageUrls.length);
      if (filePaths.length === 0) return;
      uploading.value = true;
      void uploadImagesSequential(filePaths)
        .then((urls) => {
          form.detailImageUrls = [...form.detailImageUrls, ...urls].slice(0, 6);
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
  editForm.coverUrl = product.coverUrl;
  editForm.detailImageUrls = [...product.detailImageUrls];
}

function cancelEditProduct() {
  editingStoreSkuId.value = "";
  editForm.description = "";
  editForm.coverUrl = "";
  editForm.detailImageUrls = [];
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
    count: Math.max(1, 6 - editForm.detailImageUrls.length),
    sourceType: ["album", "camera"],
    sizeType: ["compressed"],
    success(result) {
      const filePaths = ([] as string[])
        .concat(result.tempFilePaths as string[])
        .slice(0, 6 - editForm.detailImageUrls.length);
      if (filePaths.length === 0) return;
      uploading.value = true;
      void uploadImagesSequential(filePaths)
        .then((urls) => {
          editForm.detailImageUrls = [...editForm.detailImageUrls, ...urls].slice(0, 6);
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
  form.coverUrl = "";
  form.detailImageUrls = [];
}

async function submitProduct() {
  if (submitting.value) return;
  const salePrice = Number(form.salePrice);
  const settlePrice = Number(form.settlePrice || form.salePrice);
  const stock = Number(form.stock);

  if (!form.name.trim()) {
    uni.showToast({ title: "请填写商品名称", icon: "none" });
    return;
  }
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    uni.showToast({ title: "销售价需大于0", icon: "none" });
    return;
  }
  if (!Number.isFinite(stock) || stock < 0) {
    uni.showToast({ title: "库存格式不正确", icon: "none" });
    return;
  }

  submitting.value = true;
  try {
    await api.createProduct({
      categoryId: categories.value[selectedCategoryIndex.value]?.id,
      name: form.name.trim(),
      skuName: form.skuName.trim() || "默认规格",
      description: form.description.trim(),
      salePrice,
      settlePrice,
      stock,
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
  try {
    const updated = await api.updateProduct(product.storeSkuId, {
      stock: Number(draft.stock),
      salePrice: Number(draft.salePrice),
      settlePrice: Number(draft.settlePrice),
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
}

.product-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  border-radius: 0 0 24px 24px;
  margin: -12px -12px 0;
  padding: 20px 16px 46px;
  background:
    radial-gradient(circle at 88% 8%, rgba(255, 255, 255, 0.28), transparent 30%),
    linear-gradient(135deg, #ff7a00, #ffb020);
  color: #ffffff;
  box-shadow: 0 14px 34px rgba(255, 122, 0, 0.22);
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
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: -34px;
}

.stat-card,
.empty-card,
.product-card {
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(17, 17, 17, 0.07);
}

.stat-card {
  padding: 12px 8px;
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

.form-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.image-upload {
  overflow: hidden;
  height: 128px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(255, 122, 0, 0.1), rgba(255, 176, 32, 0.22)), #fffaf4;
}

.preview-image,
.upload-inner {
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

.detail-images {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.detail-image-item,
.detail-upload {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1;
  border-radius: 14px;
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
  border-radius: 14px;
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
  height: 92px;
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
  padding: 13px;
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
  border-radius: 16px;
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

.edit-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  border-radius: 16px;
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
