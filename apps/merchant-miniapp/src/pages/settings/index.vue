<template>
  <view class="page settings-page">
    <view class="store-card">
      <view>
        <text class="section-title">{{ store.name }}</text>
        <text class="muted">{{ store.address }}</text>
      </view>
      <text class="tag">{{ store.status === "OPEN" ? "营业中" : "暂停营业" }}</text>
    </view>

    <view v-for="item in switches" :key="item.key" class="setting-row">
      <view>
        <text class="setting-title">{{ item.title }}</text>
        <text class="muted">{{ item.desc }}</text>
      </view>
      <switch
        :checked="item.value"
        color="#FF7A00"
        :disabled="savingKey === item.key"
        @change="handleSwitchChange(item.key, $event)"
      />
    </view>

    <view class="card section delivery-section">
      <view class="section-head">
        <text class="section-title">配送平台状态</text>
        <text class="tag">{{ store.deliverySummary?.statusText || "配送未检查" }}</text>
      </view>
      <view v-if="deliveryProviders.length === 0" class="delivery-empty">
        <text>登录通过审核的门店后可查看配送绑定状态</text>
      </view>
      <view v-for="provider in deliveryProviders" :key="provider.provider" class="delivery-row">
        <view>
          <text class="setting-title">{{ provider.providerName }}</text>
          <text class="muted">
            {{ provider.mode === "http" ? "正式平台" : "预览联调" }} ·
            {{ provider.providerShopId || "未绑定门店ID" }}
          </text>
          <text v-if="provider.missing.length" class="missing">
            缺少：{{ provider.missing.join("、") }}
          </text>
        </view>
        <text class="status-chip" :class="provider.status.toLowerCase()">
          {{ provider.statusText }}
        </text>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">门店信息</text>
      <view class="info-row">
        <text>营业时间</text>
        <text>{{ store.businessHours }}</text>
      </view>
      <view class="info-row">
        <text>联系电话</text>
        <text>{{ store.phone }}</text>
      </view>
      <view class="info-row">
        <text>自动转单</text>
        <text>3分钟未接单</text>
      </view>
    </view>

    <button class="primary-button" @tap="goProductManage">管理门店商品</button>
    <button class="ghost-button" @tap="goSupport">平台支持与规则</button>
    <button class="ghost-button" @tap="goLogin">切换登录门店</button>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  api,
  getCachedMerchantStore,
  saveCachedMerchantStore,
  type MerchantStore
} from "../../services/api";

const fallbackStore: MerchantStore = {
  id: "",
  code: "",
  name: "请先登录门店",
  phone: "0591-88000001",
  address: "登录通过审核的门店后可读取实时设置",
  status: "OPEN",
  acceptOrderSwitch: true,
  autoTransferSwitch: true,
  voiceReminderSwitch: true,
  businessHours: "09:00 - 22:00",
  deliverySummary: {
    status: "NOT_READY",
    statusText: "请先登录门店",
    readyForBusiness: false
  },
  deliveryReadiness: []
};
const store = ref<MerchantStore>(getCachedMerchantStore() ?? fallbackStore);
const savingKey = ref<SwitchKey | "">("");

type SwitchKey = "acceptOrderSwitch" | "autoTransferSwitch" | "voiceReminderSwitch";

const deliveryProviders = computed(() => store.value.deliveryReadiness ?? []);

const switches = computed(() => [
  {
    key: "acceptOrderSwitch" as const,
    title: "接单开关",
    value: store.value.acceptOrderSwitch,
    desc: store.value.acceptOrderSwitch ? "当前参与新订单分配" : "当前暂停分配新订单"
  },
  {
    key: "autoTransferSwitch" as const,
    title: "自动转单开关",
    value: store.value.autoTransferSwitch,
    desc: store.value.autoTransferSwitch ? "3分钟未接单自动流转" : "关闭后需人工处理"
  },
  {
    key: "voiceReminderSwitch" as const,
    title: "语音提醒开关",
    value: store.value.voiceReminderSwitch,
    desc: store.value.voiceReminderSwitch ? "新订单提示音已开启" : "新订单提示音已关闭"
  }
]);

function goLogin() {
  uni.navigateTo({ url: "/pages/login/index" });
}

function goProductManage() {
  uni.switchTab({ url: "/pages/product/manage" });
}

function goSupport() {
  uni.navigateTo({ url: "/pages/support/index" });
}

function syncStore(storeData: MerchantStore) {
  store.value = storeData;
  saveCachedMerchantStore(storeData);
}

function getSwitchValue(event: Event) {
  return Boolean((event as unknown as { detail?: { value?: boolean } }).detail?.value);
}

async function handleSwitchChange(key: SwitchKey, event: Event) {
  const nextValue = getSwitchValue(event);
  const previousValue = store.value[key];
  store.value = { ...store.value, [key]: nextValue };
  savingKey.value = key;

  try {
    const updated = await api.updateStoreSettings({ [key]: nextValue });
    syncStore(updated);
    uni.showToast({ title: "已保存", icon: "none" });
  } catch {
    store.value = { ...store.value, [key]: previousValue };
    uni.showToast({ title: "保存失败，请先登录门店", icon: "none" });
  } finally {
    savingKey.value = "";
  }
}

onMounted(() => {
  void api
    .me()
    .then((storeData) => {
      syncStore(storeData);
    })
    .catch(() => undefined);
});
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.store-card,
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 18px;
  padding: 14px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06);
}

.store-card .muted,
.setting-row .muted {
  display: block;
  margin-top: 5px;
  font-size: 12px;
}

.setting-title {
  font-weight: 800;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.section-head,
.delivery-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.delivery-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.delivery-row {
  border-radius: 14px;
  padding: 12px;
  background: #f7f8fa;
}

.delivery-row .muted,
.missing {
  display: block;
  margin-top: 5px;
  font-size: 12px;
}

.missing {
  color: #a14a00;
}

.delivery-empty {
  border-radius: 14px;
  padding: 12px;
  background: #f7f8fa;
  color: #666666;
  font-size: 12px;
}

.status-chip {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 6px 9px;
  background: #eef2f7;
  color: #666666;
  font-size: 12px;
  font-weight: 800;
}

.status-chip.mock_ready {
  background: #fff3e3;
  color: #ff7a00;
}

.status-chip.http_ready {
  background: #ecfdf5;
  color: #059669;
}

.status-chip.http_incomplete {
  background: #fef2f2;
  color: #dc2626;
}

.settings-page > .ghost-button,
.settings-page > .primary-button {
  width: 100%;
}
</style>
