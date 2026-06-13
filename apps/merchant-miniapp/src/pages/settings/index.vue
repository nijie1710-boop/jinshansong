<template>
  <view class="page settings-page">
    <view class="store-card">
      <view>
        <text class="section-title">{{ store.name }}</text>
        <text class="muted">{{ store.address }}</text>
      </view>
      <text class="tag">{{ store.status === "OPEN" ? "营业中" : "暂停营业" }}</text>
    </view>

    <view class="card section store-switch-section">
      <view class="section-head">
        <text class="section-title">门店切换</text>
        <text class="tag">{{
          storeOptions.length > 1 ? `${storeOptions.length} 家门店` : "当前门店"
        }}</text>
      </view>
      <view v-if="storeOptions.length === 0" class="delivery-empty">
        <text>登录通过审核的门店后可查看可管理门店</text>
      </view>
      <view
        v-for="item in storeOptions"
        :key="item.code"
        class="store-option"
        :class="{ active: item.code === store.code }"
        @tap="switchStore(item)"
      >
        <view>
          <text class="setting-title">{{ item.name }}</text>
          <text class="muted">{{ item.address }}</text>
        </view>
        <text class="store-option-state">
          {{
            item.code === store.code
              ? "使用中"
              : switchingStoreCode === item.code
                ? "切换中"
                : "切换"
          }}
        </text>
      </view>
      <text class="store-switch-note">
        同一个商户手机号可管理多个已审核门店；切换后商品、订单、对账都会读取当前门店数据。
      </text>
      <button class="ghost-button add-store-button" @tap="goApplyStore">申请新门店</button>
    </view>

    <view v-if="applications.length" class="card section application-section">
      <view class="section-head">
        <text class="section-title">门店申请进度</text>
        <text class="tag">{{ applications.length }} 条记录</text>
      </view>
      <view v-for="item in applications" :key="item.id" class="application-row">
        <view>
          <text class="setting-title">{{ item.storeName }}</text>
          <text class="muted">{{ item.city }}{{ item.district }} · {{ item.address }}</text>
          <text v-if="item.reviewRemark" class="application-note">{{ item.reviewRemark }}</text>
        </view>
        <text class="status-chip" :class="item.status.toLowerCase()">
          {{ item.statusText }}
        </text>
      </view>
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
            {{ provider.mode === "http" ? "正式平台" : "平台联调" }} ·
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

    <view class="card section support-menu">
      <text class="section-title">平台协议与支持</text>
      <view class="support-row" @tap="openLegal('merchant')">
        <view class="support-main">
          <text class="support-icon">协</text>
          <view>
            <text class="setting-title">门店服务协议</text>
            <text class="muted">商品、订单、履约和结算规则</text>
          </view>
        </view>
        <text class="store-option-state">查看</text>
      </view>
      <view class="support-row" @tap="openLegal('privacy')">
        <view class="support-main">
          <text class="support-icon">隐</text>
          <view>
            <text class="setting-title">隐私协议</text>
            <text class="muted">门店资料、账号和订单数据使用说明</text>
          </view>
        </view>
        <text class="store-option-state">查看</text>
      </view>
      <button class="support-row support-button" open-type="contact">
        <view class="support-main">
          <text class="support-icon">客</text>
          <view>
            <text class="setting-title">联系平台</text>
            <text class="muted">审核、商品、订单和结算问题可通过客服提交</text>
          </view>
        </view>
        <text class="store-option-state">联系</text>
      </button>
    </view>

    <button class="primary-button" @tap="goProductManage">管理门店商品</button>
    <button class="ghost-button" @tap="goSupport">平台支持与规则</button>
    <button class="danger-button" @tap="switchAccount">退出登录 / 切换账号</button>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  api,
  clearMerchantSession,
  getCachedMerchantStore,
  getCachedMerchantStores,
  saveCachedMerchantStores,
  saveMerchantSession,
  saveCachedMerchantStore,
  type StoreApplication,
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
const storeOptions = ref<MerchantStore[]>(initialStoreOptions());
const applications = ref<StoreApplication[]>([]);
const savingKey = ref<SwitchKey | "">("");
const switchingStoreCode = ref("");

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

function dedupeStores(stores: MerchantStore[]) {
  return Array.from(
    new Map(stores.filter((item) => item.code).map((item) => [item.code, item])).values()
  );
}

function initialStoreOptions() {
  return dedupeStores([
    ...(getCachedMerchantStores() || []),
    ...(store.value.code ? [store.value] : [])
  ]);
}

function goProductManage() {
  uni.switchTab({ url: "/pages/product/manage" });
}

function goSupport() {
  uni.navigateTo({ url: "/pages/support/index" });
}

function goApplyStore() {
  uni.navigateTo({ url: "/pages/login/index?mode=apply&intent=add-store" });
}

function openLegal(type: "merchant" | "privacy") {
  uni.navigateTo({ url: `/pages/legal/index?type=${type}` });
}

function syncStore(storeData: MerchantStore) {
  store.value = storeData;
  saveCachedMerchantStore(storeData);
  storeOptions.value = dedupeStores([storeData, ...storeOptions.value]);
  saveCachedMerchantStores(storeOptions.value);
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

async function loadStoreOptions() {
  try {
    const [storeData, stores, applicationData] = await Promise.all([
      api.me(),
      api.stores(),
      api.applications().catch(() => [] as StoreApplication[])
    ]);
    storeOptions.value = dedupeStores([storeData, ...stores]);
    applications.value = applicationData;
    saveCachedMerchantStores(storeOptions.value);
    syncStore(storeData);
  } catch {
    storeOptions.value = dedupeStores(storeOptions.value);
  }
}

async function switchStore(target: MerchantStore) {
  if (!target.code || target.code === store.value.code || switchingStoreCode.value) {
    return;
  }

  switchingStoreCode.value = target.code;
  try {
    const session = await api.switchStore(target.code);
    saveMerchantSession(session);
    store.value = session.store;
    storeOptions.value = dedupeStores(session.stores?.length ? session.stores : [session.store]);
    saveCachedMerchantStores(storeOptions.value);
    uni.showToast({ title: `已切换到${session.store.name}`, icon: "none" });
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : "门店切换失败",
      icon: "none"
    });
  } finally {
    switchingStoreCode.value = "";
  }
}

function switchAccount() {
  uni.showModal({
    title: "切换账号",
    content: "退出当前商户登录后，可重新使用其他微信或手机号登录。",
    confirmText: "退出",
    confirmColor: "#ff3b30",
    success(result) {
      if (!result.confirm) {
        return;
      }
      clearMerchantSession();
      store.value = fallbackStore;
      storeOptions.value = [];
      uni.reLaunch({ url: "/pages/login/index" });
    }
  });
}

onMounted(() => {
  void loadStoreOptions();
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
.delivery-row,
.application-row {
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

.store-switch-section,
.application-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.store-option,
.application-row,
.support-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid rgba(17, 17, 17, 0.04);
  border-radius: 16px;
  padding: 12px;
  background: #f7f8fa;
}

.application-row {
  align-items: flex-start;
}

.application-row .muted,
.application-note {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.45;
}

.application-note {
  color: #a14a00;
}

.support-menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.support-button {
  width: 100%;
  margin: 0;
  color: inherit;
  font-size: inherit;
  line-height: 1.4;
  text-align: left;
}

.support-button::after {
  border: 0;
}

.support-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.support-icon {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  flex: 0 0 32px;
  border-radius: 12px;
  background: #fff2e8;
  color: #ff7a00;
  font-size: 13px;
  font-weight: 900;
}

.store-option.active {
  border-color: rgba(255, 122, 0, 0.24);
  background: #fff7ed;
}

.store-option-state {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 5px 9px;
  background: #ffffff;
  color: #ff7a00;
  font-size: 12px;
  font-weight: 900;
}

.store-switch-note {
  color: #999999;
  font-size: 11px;
  line-height: 1.5;
}

.add-store-button {
  width: 100%;
  height: 40px;
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

.status-chip.pending {
  background: #fff3e3;
  color: #ff7a00;
}

.status-chip.approved {
  background: #ecfdf5;
  color: #059669;
}

.status-chip.rejected {
  background: #fef2f2;
  color: #dc2626;
}

.settings-page > .ghost-button,
.settings-page > .danger-button,
.settings-page > .primary-button {
  width: 100%;
}

.danger-button {
  height: 44px;
  border: 1px solid rgba(255, 59, 48, 0.35);
  border-radius: 999px;
  background: #ffffff;
  color: #ff3b30;
  font-size: 14px;
  font-weight: 900;
}
</style>
