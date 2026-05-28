<template>
  <view class="page address-page">
    <view v-if="addresses.length === 0" class="empty-card">
      <text class="section-title">暂无收货地址</text>
      <text class="muted">新增地址后才能完成下单</text>
    </view>

    <view
      v-for="address in addresses"
      :key="address.id"
      class="address-card"
      @tap="editAddress(address.id)"
    >
      <view class="address-head">
        <view>
          <text class="name">{{ address.name }}</text>
          <text class="phone">{{ address.phone }}</text>
        </view>
        <text v-if="address.isDefault" class="tag">默认</text>
      </view>
      <text class="address">{{ address.city }}{{ address.district }}{{ address.detail }}</text>
      <view class="actions">
        <button
          class="text-button"
          :disabled="address.isDefault"
          @tap.stop="setDefault(address.id)"
        >
          {{ address.isDefault ? "当前默认" : "设为默认" }}
        </button>
        <view class="button-group">
          <button class="ghost-button" @tap.stop="editAddress(address.id)">编辑</button>
          <button class="danger-button" @tap.stop="removeAddress(address.id)">删除</button>
        </view>
      </view>
    </view>

    <button class="primary-button" @tap="addAddress">新增收货地址</button>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { onPullDownRefresh } from "@dcloudio/uni-app";
import { api, type ApiAddress } from "../../services/api";

const addresses = ref<ApiAddress[]>([]);

async function loadAddresses() {
  try {
    addresses.value = await api.addresses();
  } catch {
    addresses.value = [];
    uni.showToast({ title: "地址加载失败", icon: "none" });
  }
}

function addAddress() {
  uni.navigateTo({ url: "/pages/address/edit" });
}

function editAddress(id: string) {
  uni.navigateTo({ url: `/pages/address/edit?id=${id}` });
}

async function setDefault(id: string) {
  try {
    await api.setDefaultAddress(id);
    uni.showToast({ title: "已设为默认", icon: "success" });
    await loadAddresses();
  } catch {
    uni.showToast({ title: "设置失败，请检查后端服务", icon: "none" });
  }
}

function removeAddress(id: string) {
  uni.showModal({
    title: "删除地址",
    content: "确认删除这个收货地址？",
    confirmColor: "#FF7A00",
    success(result) {
      if (!result.confirm) {
        return;
      }
      void api
        .deleteAddress(id)
        .then(loadAddresses)
        .then(() => {
          uni.showToast({ title: "已删除", icon: "success" });
        })
        .catch(() => {
          uni.showToast({ title: "删除失败，请检查后端服务", icon: "none" });
        });
    }
  });
}

onMounted(loadAddresses);

onPullDownRefresh(() => {
  void loadAddresses().finally(() => {
    uni.stopPullDownRefresh();
  });
});
</script>

<style scoped>
.address-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.address-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 18px;
  padding: 14px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06);
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

.address-head,
.actions,
.button-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.name {
  margin-right: 8px;
  font-weight: 800;
}

.phone {
  color: #666666;
}

.address {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
}

.actions button {
  width: 74px;
}

.button-group {
  gap: 7px;
}

.text-button {
  height: 34px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #ff7a00;
  font-size: 13px;
  line-height: 34px;
}

.text-button::after {
  border: 0;
}

.danger-button {
  display: flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid #ff3b30;
  background: #ffffff;
  color: #ff3b30;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}

.danger-button::after {
  border: 0;
}
</style>
