<template>
  <view class="page confirm-page">
    <view class="card address-card" @tap="openAddressList">
      <view class="address-icon">收</view>
      <view class="address-content">
        <text class="section-title">收货地址</text>
        <text class="address">{{ address.city }}{{ address.district }}{{ address.detail }}</text>
        <text class="muted">{{ address.name }} {{ maskedPhone }}</text>
      </view>
      <text class="arrow">›</text>
    </view>

    <view class="service-area-card" :class="{ warning: !isAddressInServiceArea }">
      <view>
        <text class="service-title">
          {{ isAddressInServiceArea ? `${serviceCity}核心城区即时送` : "当前地址暂未开通" }}
        </text>
        <text class="muted">{{ serviceAreaText }}</text>
      </view>
      <button class="service-action" @tap="openAddressList">切换地址</button>
    </view>

    <view class="card product-card">
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
        <view class="mini-device"></view>
        <text v-if="isHttpImageBlocked(product.coverUrl)" class="image-note">HTTPS</text>
        <text v-else-if="!displayImageUrl(product.coverUrl)">金闪送</text>
      </view>
      <view class="product-info">
        <text class="product-name">{{ product.name }}</text>
        <text class="muted">{{ product.color }} · x1</text>
        <view class="tag-row">
          <text class="tag">门店现货</text>
          <text class="tag">30-60分钟</text>
        </view>
      </view>
      <text class="price">¥{{ quote.goodsAmount || product.price }}</text>
    </view>

    <view class="card section">
      <view class="option-row">
        <text>优惠券</text>
        <text class="discount">新人/满减优惠 -¥{{ quote.userDiscountAmount }}</text>
      </view>
      <view class="option-row">
        <text>满减优惠</text>
        <text class="discount">{{
          quote.deliveryFeeCharged === 0 ? "满19免配送费" : "未满足免配送"
        }}</text>
      </view>
      <view class="input-row">
        <text>骑手编号</text>
        <input
          v-model="riderNo"
          adjust-position
          class="mini-input"
          confirm-type="done"
          cursor-spacing="20"
          maxlength="12"
          placeholder="可选"
          @blur="refreshQuoteSafely"
        />
      </view>
      <view class="input-row">
        <text>推广码</text>
        <input
          v-model="promoterCode"
          adjust-position
          class="mini-input"
          confirm-type="done"
          cursor-spacing="20"
          maxlength="16"
          placeholder="可选"
          @blur="refreshQuoteSafely"
        />
      </view>
    </view>

    <view class="card section">
      <view class="section-head">
        <text class="section-title">即时配送方案</text>
        <text class="compare-tag">自动比价</text>
      </view>
      <view v-if="quote.selectedDelivery" class="delivery-choice">
        <view>
          <text class="delivery-provider">{{ quote.selectedDelivery.providerName }}</text>
          <text class="muted">
            {{ quote.selectedDelivery.serviceCode || "即时配送" }} · 约{{
              quote.selectedDelivery.estimatedMinutes
            }}分钟 · {{ quote.selectedDelivery.distanceKm }}km
          </text>
        </view>
        <text class="delivery-fee">
          {{ quote.deliveryFeeCharged === 0 ? "免配送" : `¥${quote.deliveryFeeCharged}` }}
        </text>
      </view>
      <view v-else class="delivery-choice unavailable">
        <text>{{ quoteError || "当前地址暂无可用即时配送" }}</text>
        <text class="muted">可尝试更换地址或稍后下单</text>
      </view>
      <view class="delivery-options">
        <view
          v-for="option in quote.deliveryOptions || []"
          :key="option.provider"
          :class="['delivery-option', option.available ? 'available' : 'disabled']"
        >
          <text>{{ option.providerName }}</text>
          <text>{{
            option.available
              ? `成本¥${option.feeCost} · ${option.estimatedMinutes}分钟`
              : option.reason || "不可配送"
          }}</text>
        </view>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">费用明细</text>
      <view class="fee-row">
        <text>商品金额</text>
        <text>¥{{ quote.goodsAmount }}</text>
      </view>
      <view class="fee-row">
        <text>配送费</text>
        <text>¥{{ quote.deliveryFeeCharged }}</text>
      </view>
      <view class="fee-row">
        <text>用户优惠</text>
        <text class="discount">-¥{{ quote.userDiscountAmount }}</text>
      </view>
      <view class="fee-row total">
        <text>实付款</text>
        <text>¥{{ quote.payableAmount }}</text>
      </view>
    </view>

    <view class="mobile-fixed-bottom bottom-bar">
      <view>
        <text class="muted">实付款</text>
        <text class="payable">¥{{ quote.payableAmount }}</text>
      </view>
      <button class="primary-button" :disabled="submitting || quoting" @tap="submitOrder">
        {{ submitting ? "支付中..." : quoting ? "报价中..." : "提交订单" }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import {
  ApiRequestError,
  api,
  type ApiAddress,
  type ApiProduct,
  type ApiQuote,
  type PublicConfig
} from "../../services/api";

const defaultServiceArea: PublicConfig["serviceArea"] = {
  city: "福州市",
  enabledDistricts: ["鼓楼区", "台江区", "仓山区", "晋安区", "马尾区", "长乐区"],
  note: "当前服务范围，超出范围的地址暂不支持下单"
};

const address = ref<ApiAddress>({
  id: "",
  name: "请先添加地址",
  phone: "",
  city: "福州市",
  district: "",
  detail: "",
  isDefault: false
});
const product = ref<ApiProduct>({
  id: "",
  skuId: "",
  name: "商品加载中",
  categoryId: null,
  categoryName: "",
  price: 0,
  originPrice: 0,
  settlePrice: 0,
  sales: 0,
  stock: 0,
  tags: [],
  specs: [],
  color: "默认",
  description: "",
  coverUrl: "",
  detailImageUrls: [],
  imageTone: "linear-gradient(135deg, #fff2e8, #ffffff)",
  skus: []
});
const skuId = ref(product.value.skuId);
const submitting = ref(false);
const quoting = ref(false);
const riderNo = ref("0086");
const promoterCode = ref("FZTG001");
const quoteError = ref("");
const serviceArea = ref<PublicConfig["serviceArea"]>({ ...defaultServiceArea });
const quote = ref<ApiQuote>({
  store: { id: "", name: "待匹配门店" },
  goodsAmount: product.value.price,
  deliveryFeeCharged: 4,
  deliveryFeeCost: 4,
  userDiscountAmount: 5,
  payableAmount: product.value.price - 1,
  netProfit: 0,
  selectedDelivery: null,
  deliveryOptions: []
});

const maskedPhone = computed(() =>
  address.value.phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2")
);
const serviceCity = computed(() => serviceArea.value.city || defaultServiceArea.city);
const supportedDistricts = computed(() =>
  serviceArea.value.enabledDistricts.length > 0
    ? serviceArea.value.enabledDistricts
    : defaultServiceArea.enabledDistricts
);
const isAddressInServiceArea = computed(
  () =>
    address.value.city === serviceCity.value &&
    supportedDistricts.value.includes(address.value.district.trim())
);
const serviceAreaText = computed(() => {
  if (!address.value.id) {
    return `请先添加${serviceCity.value}收货地址，报价会按定位和门店库存计算。`;
  }
  if (!isAddressInServiceArea.value) {
    return `当前暂支持：${supportedDistricts.value.join("、")}。`;
  }
  return `已覆盖 ${address.value.district}，下单前会自动匹配附近门店和配送平台。`;
});

async function loadConfirmData() {
  try {
    serviceArea.value = (await api.publicConfig()).serviceArea;
  } catch {
    serviceArea.value = { ...defaultServiceArea };
  }
  const [addresses, productData] = await Promise.all([api.addresses(), api.product(skuId.value)]);
  address.value = addresses[0] ?? address.value;
  product.value = productData;
  await refreshQuote();
}

async function refreshQuote() {
  if (!address.value.id || !skuId.value || quoting.value) {
    return;
  }
  if (!isAddressInServiceArea.value) {
    quoteError.value = "当前地址不在服务范围内";
    quote.value = { ...quote.value, selectedDelivery: null, deliveryOptions: [] };
    return;
  }
  quoting.value = true;
  quoteError.value = "";
  try {
    quote.value = await api.quote({
      addressId: address.value.id,
      items: [{ skuId: skuId.value, quantity: 1 }],
      riderNo: riderNo.value.trim(),
      promoterCode: promoterCode.value.trim()
    });
  } catch (error) {
    quote.value = { ...quote.value, selectedDelivery: null, deliveryOptions: [] };
    quoteError.value = error instanceof Error ? error.message : "报价失败，请稍后重试";
    throw error;
  } finally {
    quoting.value = false;
  }
}

function refreshQuoteSafely() {
  void refreshQuote().catch(() => {
    quoting.value = false;
    uni.showToast({ title: "报价刷新失败", icon: "none" });
  });
}

function openAddressList() {
  uni.navigateTo({ url: "/pages/address/list" });
}

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

async function submitOrder() {
  if (submitting.value) {
    return;
  }
  if (!address.value.id || !skuId.value) {
    uni.showToast({ title: "请确认地址和商品", icon: "none" });
    return;
  }
  if (!isAddressInServiceArea.value) {
    uni.showToast({ title: "当前地址不在服务范围", icon: "none" });
    return;
  }
  if (!quote.value.selectedDelivery) {
    uni.showToast({ title: quoteError.value || "当前地址暂无可用配送", icon: "none" });
    return;
  }
  submitting.value = true;
  try {
    const created = await api.createOrder({
      addressId: address.value.id,
      items: [{ skuId: skuId.value, quantity: 1 }],
      riderNo: riderNo.value.trim(),
      promoterCode: promoterCode.value.trim()
    });
    const paid = await api.mockPay(created.id);
    uni.showToast({ title: "支付成功", icon: "success" });
    setTimeout(() => {
      uni.redirectTo({ url: `/pages/order/detail?id=${paid.id}` });
    }, 500);
  } catch (error) {
    const message =
      error instanceof ApiRequestError || error instanceof Error
        ? error.message
        : "下单失败，请检查后端服务";
    uni.showToast({ title: message, icon: "none" });
  } finally {
    submitting.value = false;
  }
}

onLoad((query) => {
  const querySkuId = typeof query?.skuId === "string" ? query.skuId : "";
  if (querySkuId) {
    skuId.value = querySkuId;
  }
  void loadConfirmData().catch(() => {
    uni.showToast({ title: "确认订单数据加载失败", icon: "none" });
  });
});
</script>

<style scoped>
.confirm-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 92px;
  background:
    radial-gradient(circle at 0% 0%, rgba(255, 176, 32, 0.14), transparent 22%),
    #f7f8fa;
}

.address-card,
.product-card,
.option-row,
.input-row,
.fee-row,
.bottom-bar,
.section-head,
.delivery-choice {
  display: flex;
  align-items: center;
}

.address-card {
  gap: 10px;
  border-left: 4px solid #ff7a00;
}

.service-area-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid rgba(255, 122, 0, 0.08);
  border-radius: 20px;
  padding: 13px;
  background: linear-gradient(135deg, #fff7ed, #ffffff);
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.05);
}

.service-area-card.warning {
  background: #fff5f5;
}

.service-title {
  display: block;
  margin-bottom: 4px;
  color: #111111;
  font-size: 14px;
  font-weight: 800;
}

.service-action {
  display: flex;
  height: 34px;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0 11px;
  border-radius: 999px;
  background: #fff2e8;
  color: #ff7a00;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
}

.service-action::after {
  border: 0;
}

.section-head,
.delivery-choice {
  justify-content: space-between;
}

.address-icon {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: #fff2e8;
  color: #ff7a00;
  font-weight: 800;
}

.address-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

.address {
  font-size: 15px;
  font-weight: 800;
  line-height: 1.35;
}

.arrow {
  color: #999999;
  font-size: 26px;
}

.product-card {
  gap: 10px;
  align-items: flex-start;
}

.product-image {
  position: relative;
  display: flex;
  width: 76px;
  height: 76px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex: 0 0 76px;
  border-radius: 18px;
  background: linear-gradient(135deg, #fff2e8, #ffffff);
  color: #ff7a00;
  font-size: 11px;
  font-weight: 800;
}

.product-cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.product-cover + .mini-device {
  display: none;
}

.image-note {
  position: relative;
  z-index: 1;
  font-size: 10px;
  font-weight: 900;
}

.compare-tag {
  border-radius: 999px;
  background: #fff2e8;
  color: #ff7a00;
  padding: 5px 9px;
  font-size: 11px;
  font-weight: 800;
}

.delivery-choice {
  gap: 12px;
  border: 1px solid rgba(255, 122, 0, 0.08);
  border-radius: 18px;
  background: linear-gradient(135deg, #fff7ed, #ffffff);
  padding: 13px;
}

.delivery-choice > view {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

.delivery-choice.unavailable {
  align-items: flex-start;
  flex-direction: column;
}

.delivery-provider {
  color: #111111;
  font-weight: 800;
}

.delivery-fee {
  color: #ff7a00;
  font-size: 16px;
  font-weight: 900;
}

.delivery-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.delivery-option {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  border-radius: 12px;
  background: #f7f8fa;
  padding: 9px 10px;
  font-size: 12px;
}

.delivery-option text:first-child {
  color: #111111;
  font-weight: 800;
}

.delivery-option text:last-child {
  color: #666666;
}

.delivery-option.disabled {
  opacity: 0.6;
}

.mini-device {
  position: absolute;
  width: 34px;
  height: 44px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.86);
  transform: rotate(-18deg);
}

.product-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

.product-name {
  font-weight: 800;
  line-height: 1.35;
}

.tag-row {
  display: flex;
  gap: 5px;
}

.option-row,
.input-row,
.fee-row {
  justify-content: space-between;
  font-size: 14px;
}

.discount {
  color: #ff3b30;
}

.mini-input {
  min-width: 118px;
  height: 34px;
  border-radius: 999px;
  padding: 7px 11px;
  background: #f7f8fa;
  color: #666666;
  font-size: 14px;
  line-height: 20px;
  text-align: right;
}

.total {
  border-top: 1px solid #f1f1f1;
  padding-top: 10px;
  font-size: 16px;
  font-weight: 800;
}

.bottom-bar {
  justify-content: space-between;
  gap: 16px;
  padding: 12px 12px calc(12px + env(safe-area-inset-bottom));
  background: #ffffff;
  box-shadow: 0 -10px 30px rgba(17, 17, 17, 0.08);
}

.payable {
  display: block;
  color: #ff3b30;
  font-size: 22px;
  font-weight: 800;
}

.bottom-bar button {
  width: 172px;
}
</style>
