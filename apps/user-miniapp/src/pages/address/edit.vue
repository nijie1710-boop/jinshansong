<template>
  <view class="page edit-address-page">
    <view class="card form-card">
      <view class="form-head">
        <text class="section-title">{{ addressId ? "编辑收货地址" : "新增收货地址" }}</text>
        <button class="location-button" @tap="chooseAddressLocation">定位/选点</button>
      </view>

      <view class="field">
        <text class="label">联系人</text>
        <textarea
          :value="form.name"
          adjust-position
          auto-height
          class="field-input single-line-input"
          cursor-spacing="20"
          maxlength="16"
          placeholder="请输入联系人"
          :show-confirm-bar="false"
          @input="setTextField('name', $event)"
        />
      </view>
      <view class="field">
        <text class="label">手机号</text>
        <textarea
          :value="form.phone"
          adjust-position
          auto-height
          class="field-input single-line-input"
          cursor-spacing="20"
          maxlength="11"
          placeholder="请输入手机号"
          :show-confirm-bar="false"
          @input="setTextField('phone', $event)"
        />
      </view>
      <view class="field">
        <text class="label">城市</text>
        <textarea
          :value="form.city"
          adjust-position
          auto-height
          class="field-input single-line-input"
          cursor-spacing="20"
          maxlength="12"
          placeholder="福州市"
          :show-confirm-bar="false"
          @input="setTextField('city', $event)"
        />
      </view>
      <view class="field">
        <text class="label">区域</text>
        <textarea
          :value="form.district"
          adjust-position
          auto-height
          class="field-input single-line-input"
          cursor-spacing="20"
          maxlength="16"
          placeholder="台江区 / 仓山区"
          :show-confirm-bar="false"
          @input="setTextField('district', $event)"
        />
        <view class="district-grid">
          <button
            v-for="district in fuzhouDistricts"
            :key="district"
            class="district-chip"
            :class="{ active: form.district === district }"
            @tap="selectDistrict(district)"
          >
            {{ district }}
          </button>
        </view>
      </view>

      <view class="location-card" @tap="chooseAddressLocation">
        <view>
          <text class="label">定位服务</text>
          <text class="muted">{{ locationText }}</text>
        </view>
        <text class="location-arrow">›</text>
      </view>
      <view class="field">
        <text class="label">详细地址</text>
        <textarea
          :value="form.detail"
          adjust-position
          class="field-textarea"
          confirm-type="done"
          cursor-spacing="24"
          maxlength="80"
          placeholder="街道、小区、门牌号"
          @input="setTextField('detail', $event)"
        />
      </view>
      <view class="switch-row">
        <view>
          <text class="label">默认地址</text>
          <text class="muted">下单时优先使用</text>
        </view>
        <switch :checked="form.isDefault" color="#FF7A00" @change="handleDefaultChange" />
      </view>
    </view>

    <view class="mobile-fixed-bottom bottom-bar">
      <button v-if="addressId" class="danger-button" @tap="removeAddress">删除</button>
      <button class="primary-button" :disabled="saving" @tap="saveAddress">
        {{ saving ? "保存中..." : "保存地址" }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { api, type AddressPayload } from "../../services/api";

const addressId = ref("");
const saving = ref(false);
const fuzhouDistricts = ["鼓楼区", "台江区", "仓山区", "晋安区", "马尾区", "长乐区"];
const form = reactive<AddressPayload>({
  name: "",
  phone: "",
  city: "福州市",
  district: "台江区",
  detail: "",
  isDefault: false
});

type TextField = "name" | "phone" | "city" | "district" | "detail";
type UniInputEvent = Event & {
  detail?: { value?: string };
  target?: { value?: string };
};

const locationText = computed(() => {
  if (form.latitude && form.longitude) {
    return `已记录定位 ${form.latitude}, ${form.longitude}`;
  }
  return "微信小程序内可选择地图位置，H5 预览可先手动填写";
});

function eventValue(event: Event) {
  const inputEvent = event as UniInputEvent;
  return String(inputEvent.detail?.value ?? inputEvent.target?.value ?? "");
}

function setTextField(field: TextField, event: Event) {
  form[field] = eventValue(event);
}

function handleDefaultChange(event: Event) {
  const value = (event as unknown as { detail: { value: boolean } }).detail.value;
  form.isDefault = value;
}

function selectDistrict(district: string) {
  form.city = form.city.trim() || "福州市";
  form.district = district;
}

function applyLocation(result: { name?: string; address?: string; latitude?: number; longitude?: number }) {
  const addressText = [result.address, result.name].filter(Boolean).join("");
  const matchedDistrict = fuzhouDistricts.find((district) => addressText.includes(district));

  form.city = addressText.includes("福州") ? "福州市" : form.city || "福州市";
  form.district = matchedDistrict ?? form.district;
  if (addressText) {
    form.detail = addressText.replace("福建省", "").replace("福州市", "").replace(form.district, "");
  }
  if (typeof result.latitude === "number") {
    form.latitude = String(result.latitude);
  }
  if (typeof result.longitude === "number") {
    form.longitude = String(result.longitude);
  }
}

function chooseAddressLocation() {
  const fallbackToCurrentLocation = () => {
    uni.getLocation({
      type: "gcj02",
      success(result) {
        form.city = form.city.trim() || "福州市";
        form.district = form.district.trim() || "台江区";
        form.latitude = String(result.latitude);
        form.longitude = String(result.longitude);
        uni.showToast({ title: "已记录当前位置，请补充门牌号", icon: "none" });
      },
      fail() {
        uni.showToast({ title: "H5 预览请手动填写，微信内需授权定位", icon: "none" });
      }
    });
  };

  if (typeof uni.chooseLocation !== "function") {
    fallbackToCurrentLocation();
    return;
  }

  uni.chooseLocation({
    success(result) {
      applyLocation({
        name: result.name,
        address: result.address,
        latitude: result.latitude,
        longitude: result.longitude
      });
      uni.showToast({ title: "已填入定位", icon: "success" });
    },
    fail() {
      fallbackToCurrentLocation();
    }
  });
}

function validateForm() {
  if (
    !form.name.trim() ||
    !form.phone.trim() ||
    !form.city.trim() ||
    !form.district.trim() ||
    !form.detail.trim()
  ) {
    uni.showToast({ title: "请填写完整地址", icon: "none" });
    return false;
  }

  if (!/^1\d{10}$/.test(form.phone.trim())) {
    uni.showToast({ title: "手机号格式不正确", icon: "none" });
    return false;
  }

  return true;
}

async function loadAddress(id: string) {
  try {
    const address = await api.address(id);
    form.name = address.name;
    form.phone = address.phone;
    form.city = address.city;
    form.district = address.district;
    form.detail = address.detail;
    form.latitude = address.latitude ?? undefined;
    form.longitude = address.longitude ?? undefined;
    form.isDefault = address.isDefault;
  } catch {
    uni.showToast({ title: "地址加载失败", icon: "none" });
  }
}

async function saveAddress() {
  if (saving.value || !validateForm()) {
    return;
  }

  saving.value = true;
  try {
    const payload: AddressPayload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      detail: form.detail.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
      isDefault: form.isDefault
    };

    if (addressId.value) {
      await api.updateAddress(addressId.value, payload);
    } else {
      await api.createAddress(payload);
    }

    uni.showToast({ title: "已保存", icon: "success" });
    setTimeout(() => {
      uni.navigateBack();
    }, 350);
  } catch {
    uni.showToast({ title: "保存失败，请检查后端服务", icon: "none" });
  } finally {
    saving.value = false;
  }
}

function removeAddress() {
  if (!addressId.value) {
    return;
  }

  uni.showModal({
    title: "删除地址",
    content: "确认删除这个收货地址？",
    confirmColor: "#FF7A00",
    success(result) {
      if (!result.confirm) {
        return;
      }
      void api
        .deleteAddress(addressId.value)
        .then(() => {
          uni.showToast({ title: "已删除", icon: "success" });
          setTimeout(() => {
            uni.navigateBack();
          }, 350);
        })
        .catch(() => {
          uni.showToast({ title: "删除失败，请检查后端服务", icon: "none" });
        });
    }
  });
}

onLoad((query) => {
  const id = typeof query?.id === "string" ? query.id : "";
  if (id) {
    addressId.value = id;
    void loadAddress(id);
  }
});
</script>

<style scoped>
.edit-address-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 88px;
}

.form-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-head,
.location-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.location-button {
  display: flex;
  height: 32px;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0 12px;
  border-radius: 999px;
  background: #fff2e8;
  color: #ff7a00;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
}

.location-button::after,
.district-chip::after {
  border: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.label {
  display: block;
  font-size: 14px;
  font-weight: 800;
}

.field-input,
.field-textarea {
  box-sizing: border-box;
  width: 100%;
  border-radius: 14px;
  padding: 11px 12px;
  background: #f7f8fa;
  color: #111111;
  font-size: 14px;
}

.single-line-input {
  height: 42px;
  min-height: 42px;
  max-height: 42px;
  overflow: hidden;
  line-height: 20px;
}

.field-textarea {
  min-height: 82px;
  line-height: 1.5;
}

.district-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.district-chip {
  display: flex;
  height: 32px;
  align-items: center;
  justify-content: center;
  margin: 0;
  border-radius: 999px;
  background: #f7f8fa;
  color: #666666;
  font-size: 12px;
  line-height: 1;
}

.district-chip.active {
  background: #fff2e8;
  color: #ff7a00;
  font-weight: 800;
}

.location-card {
  border-radius: 16px;
  padding: 12px;
  background: #fffaf4;
}

.location-card .muted {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.45;
}

.location-arrow {
  color: #ff7a00;
  font-size: 24px;
  font-weight: 600;
}

.switch-row,
.bottom-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.switch-row {
  border-radius: 16px;
  padding: 12px;
  background: #fffaf4;
}

.switch-row .muted {
  display: block;
  margin-top: 4px;
  font-size: 12px;
}

.bottom-bar {
  gap: 10px;
  padding: 12px;
  background: #ffffff;
  box-shadow: 0 -10px 30px rgba(17, 17, 17, 0.08);
}

.bottom-bar .primary-button {
  flex: 1;
}

.danger-button {
  display: flex;
  width: 96px;
  height: 44px;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid #ff3b30;
  background: #ffffff;
  color: #ff3b30;
  font-weight: 600;
  line-height: 1;
}

.danger-button::after {
  border: 0;
}
</style>
