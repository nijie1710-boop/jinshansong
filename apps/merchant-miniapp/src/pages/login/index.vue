<template>
  <view class="page merchant-login-page">
    <view class="merchant-hero">
      <text class="app-name">微信小程序商家登录</text>
      <view class="brand-lockup">
        <view class="brand-mark">
          <image class="brand-mark-image" src="/static/brand/logo-icon.png" mode="aspectFit" />
        </view>
        <view class="brand-copy">
          <text class="brand-title">金闪送商家端</text>
          <text class="brand-desc">福州本地数码配件即时闪购</text>
        </view>
      </view>
      <text class="subtitle">微信授权登录后进入门店工作台，未入驻商家先提交资料等待后台审核。</text>
    </view>

    <view class="card wx-login-card">
      <view class="wx-profile">
        <view class="wx-avatar">商</view>
        <view>
          <text class="section-title">微信授权登录</text>
          <text class="muted">绑定入驻申请手机号，通过审核后进入门店后台</text>
        </view>
      </view>

      <view class="field">
        <text class="field-label">入驻手机号</text>
        <input
          v-model="loginPhone"
          adjust-position
          class="field-input"
          confirm-type="done"
          cursor-spacing="20"
          maxlength="11"
          placeholder="微信授权失败时手动填写"
          type="number"
        />
      </view>

      <!-- #ifdef MP-WEIXIN -->
      <button
        class="primary-button"
        open-type="getPhoneNumber"
        :disabled="loading"
        @getphonenumber="handleLogin"
      >
        {{ loading ? "授权中..." : "微信手机号授权登录" }}
      </button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <button class="primary-button" :disabled="loading" @tap="handleLogin">
        {{ loading ? "授权中..." : "微信手机号授权登录" }}
      </button>
      <!-- #endif -->
      <button class="ghost-button" :disabled="loading" @tap="checkStatus">查看审核状态</button>
      <text class="agreement">登录即代表同意《商家服务协议》《隐私政策》</text>
    </view>

    <view class="mode-tabs">
      <view class="mode-tab" :class="{ active: mode === 'apply' }" @tap="mode = 'apply'"
        >申请入驻</view
      >
      <view class="mode-tab" :class="{ active: mode === 'login' }" @tap="mode = 'login'"
        >审核状态</view
      >
    </view>

    <view v-if="mode === 'apply'" class="card form-card">
      <view class="section-head">
        <text class="section-title">门店资料</text>
        <text class="muted">MVP 审核流</text>
      </view>

      <view class="field-grid">
        <view class="field">
          <text class="field-label">联系人<text class="required-star">*</text></text>
          <input
            v-model="applyForm.applicantName"
            adjust-position
            class="field-input"
            confirm-type="next"
            cursor-spacing="20"
            maxlength="16"
            placeholder="陈店长"
          />
        </view>
        <view class="field">
          <text class="field-label">手机号<text class="required-star">*</text></text>
          <input
            v-model="applyForm.applicantPhone"
            adjust-position
            class="field-input"
            confirm-type="next"
            cursor-spacing="20"
            maxlength="11"
            placeholder="13800000001"
            type="number"
          />
        </view>
      </view>

      <view class="field">
        <text class="field-label">门店名称<text class="required-star">*</text></text>
        <input
          v-model="applyForm.storeName"
          adjust-position
          class="field-input"
          confirm-type="next"
          cursor-spacing="20"
          maxlength="28"
          placeholder="例如 金闪送台江数码店"
        />
      </view>

      <view class="field-grid">
        <view class="field">
          <text class="field-label">城市<text class="required-star">*</text></text>
          <input
            v-model="applyForm.city"
            adjust-position
            class="field-input"
            confirm-type="next"
            cursor-spacing="20"
            maxlength="12"
            placeholder="福州市"
          />
        </view>
        <view class="field">
          <text class="field-label">区域<text class="required-star">*</text></text>
          <input
            v-model="applyForm.district"
            adjust-position
            class="field-input"
            confirm-type="next"
            cursor-spacing="20"
            maxlength="16"
            placeholder="台江区"
          />
        </view>
      </view>

      <view class="field">
        <view class="field-label-row">
          <text class="field-label">详细地址<text class="required-star">*</text></text>
          <text class="location-link" @tap="chooseStoreLocation">定位选址</text>
        </view>
        <input
          v-model="applyForm.address"
          adjust-position
          class="field-input"
          confirm-type="next"
          cursor-spacing="20"
          maxlength="60"
          placeholder="工业路193号宝龙广场"
        />
      </view>

      <view class="field">
        <text class="field-label">营业执照号</text>
        <input
          v-model="applyForm.businessLicenseNo"
          adjust-position
          class="field-input"
          confirm-type="next"
          cursor-spacing="20"
          maxlength="32"
          placeholder="选填，后续接真实资质上传"
        />
      </view>

      <view class="field-grid">
        <view class="field">
          <text class="field-label">营业执照照片</text>
          <view class="apply-upload" @tap="chooseApplicationImage('businessLicenseImageUrl')">
            <image
              v-if="applyForm.businessLicenseImageUrl"
              class="apply-upload-image"
              :src="applyForm.businessLicenseImageUrl"
              mode="aspectFill"
            />
            <view v-else class="apply-upload-inner">
              <text>+</text>
              <text>{{ uploading ? "上传中" : "上传执照" }}</text>
            </view>
          </view>
        </view>
        <view class="field">
          <text class="field-label">门店门头照</text>
          <view class="apply-upload" @tap="chooseApplicationImage('storefrontImageUrl')">
            <image
              v-if="applyForm.storefrontImageUrl"
              class="apply-upload-image"
              :src="applyForm.storefrontImageUrl"
              mode="aspectFill"
            />
            <view v-else class="apply-upload-inner">
              <text>+</text>
              <text>{{ uploading ? "上传中" : "上传门头" }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="field">
        <text class="field-label">经营品类<text class="required-star">*</text></text>
        <textarea
          v-model="applyForm.categoryNote"
          adjust-position
          class="field-textarea"
          confirm-type="done"
          cursor-spacing="24"
          maxlength="80"
          placeholder="充电线、充电器、手机壳、钢化膜等数码配件"
        />
      </view>

      <button class="primary-button" :disabled="loading" @tap="submitApplication">
        {{ loading ? "提交中..." : "提交入驻申请" }}
      </button>
    </view>

    <view v-if="mode === 'login'" class="card form-card">
      <view class="section-head">
        <text class="section-title">审核状态</text>
        <text class="muted">查询入驻进度</text>
      </view>

      <view class="field">
        <text class="field-label">申请手机号<text class="required-star">*</text></text>
        <input
          v-model="loginPhone"
          adjust-position
          class="field-input"
          confirm-type="done"
          cursor-spacing="20"
          maxlength="11"
          placeholder="填写入驻申请手机号"
          type="number"
        />
      </view>

      <view v-if="application" class="status-card" :class="application.status.toLowerCase()">
        <view>
          <text class="status-title">{{ application.statusText }}</text>
          <text class="muted">{{ application.storeName }} · {{ application.district }}</text>
        </view>
        <text class="status-pill">{{ application.status }}</text>
      </view>

      <view v-if="application?.reviewRemark" class="review-note">
        <text>{{ application.reviewRemark }}</text>
      </view>

      <button class="primary-button" :disabled="loading" @tap="handleLogin">
        {{ loading ? "检查中..." : "微信授权进入商家端" }}
      </button>
      <button class="ghost-button" :disabled="loading" @tap="checkStatus">查看审核状态</button>
    </view>

    <view class="card demo-card">
      <view>
        <text class="section-title">演示门店</text>
        <text class="muted">保留用于快速演示完整订单闭环</text>
      </view>
      <button class="ghost-button" :disabled="loading" @tap="handleDemoLogin">一键进入</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import {
  ApiRequestError,
  api,
  saveMerchantSession,
  type MerchantSession,
  type StoreApplication
} from "../../services/api";

const mode = ref<"apply" | "login">("apply");
const loading = ref(false);
const uploading = ref(false);
const loginPhone = ref("059188000001");
const application = ref<StoreApplication | null>(null);
const applyForm = reactive({
  applicantName: "",
  applicantPhone: "",
  storeName: "",
  city: "福州市",
  district: "",
  address: "",
  businessLicenseNo: "",
  businessLicenseImageUrl: "",
  storefrontImageUrl: "",
  categoryNote: "数码配件、充电线、充电器、手机壳、钢化膜"
});

type ApplicationImageField = "businessLicenseImageUrl" | "storefrontImageUrl";

type PhoneNumberEvent = {
  detail?: {
    code?: string;
    errMsg?: string;
  };
};

function getWechatLoginCode() {
  return new Promise<string>((resolve) => {
    // #ifdef MP-WEIXIN
    uni.login({
      provider: "weixin",
      success(result) {
        resolve(result.code || "");
      },
      fail() {
        resolve("");
      }
    });
    // #endif
    // #ifndef MP-WEIXIN
    resolve("");
    // #endif
  });
}

function validateApplyForm() {
  return (
    applyForm.applicantName.trim() &&
    applyForm.applicantPhone.trim() &&
    applyForm.storeName.trim() &&
    applyForm.city.trim() &&
    applyForm.district.trim() &&
    applyForm.address.trim() &&
    applyForm.categoryNote.trim()
  );
}

function inferDistrict(address: string) {
  const knownDistricts = [
    "鼓楼区",
    "台江区",
    "仓山区",
    "晋安区",
    "马尾区",
    "长乐区",
    "闽侯县",
    "连江县",
    "罗源县",
    "闽清县",
    "永泰县",
    "平潭县",
    "福清市"
  ];
  return knownDistricts.find((district) => address.includes(district)) ?? "";
}

function chooseStoreLocation() {
  const fallbackToCurrentLocation = () => {
    const getLocation = (
      uni as unknown as {
        getLocation?: (options: { type: "gcj02"; success: () => void; fail: () => void }) => void;
      }
    ).getLocation;

    if (!getLocation) {
      uni.showToast({ title: "当前环境不支持定位选址", icon: "none" });
      return;
    }

    getLocation({
      type: "gcj02",
      success() {
        applyForm.city = applyForm.city.trim() || "福州市";
        applyForm.district = applyForm.district.trim() || "台江区";
        uni.showToast({ title: "已定位，请补充门牌号", icon: "none" });
      },
      fail() {
        uni.showToast({ title: "定位失败，请手动填写", icon: "none" });
      }
    });
  };

  const chooseLocation = (
    uni as unknown as {
      chooseLocation?: (options: {
        success: (result: { name?: string; address?: string }) => void;
        fail: (error: { errMsg?: string }) => void;
      }) => void;
    }
  ).chooseLocation;

  if (!chooseLocation) {
    fallbackToCurrentLocation();
    return;
  }

  chooseLocation({
    success(result) {
      const address = result.address || result.name || "";
      const locationName = result.name && !address.includes(result.name) ? result.name : "";
      const fullAddress = [address, locationName].filter(Boolean).join(" ");
      if (fullAddress) {
        applyForm.address = fullAddress;
      }
      if (fullAddress.includes("福州")) {
        applyForm.city = "福州市";
      }
      const district = inferDistrict(fullAddress);
      if (district) {
        applyForm.district = district;
      }
      uni.showToast({ title: "地址已填入", icon: "success" });
    },
    fail(error) {
      const cancelled = error.errMsg?.includes("cancel");
      if (!cancelled) {
        fallbackToCurrentLocation();
      }
    }
  });
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

async function uploadApplicationImage(filePath: string, field: ApplicationImageField) {
  const scene = field === "businessLicenseImageUrl" ? "business-license" : "storefront";
  const compressedFilePath = await compressImageForUpload(filePath);

  try {
    const result = await api.uploadApplicationImageFile(
      compressedFilePath,
      scene,
      applyForm.applicantPhone.trim() || loginPhone.value.trim()
    );
    return result.url;
  } catch {
    // 部分 H5 预览环境不支持 uploadFile 时，退回 base64 上传。
  }

  const dataUrl = await readImageAsDataUrl(compressedFilePath);
  if (dataUrl.length > 9_500_000) {
    throw new Error("图片过大，请裁剪后重新选择");
  }
  const result = await api.uploadApplicationImage({
    fileName: compressedFilePath.split("/").pop() || filePath.split("/").pop(),
    dataUrl,
    scene,
    ownerPhone: applyForm.applicantPhone.trim() || loginPhone.value.trim()
  });
  return result.url;
}

function chooseApplicationImage(field: ApplicationImageField) {
  if (uploading.value) return;
  uni.chooseImage({
    count: 1,
    sourceType: ["album", "camera"],
    sizeType: ["compressed"],
    success(result) {
      const filePath = result.tempFilePaths[0];
      if (!filePath) return;
      uploading.value = true;
      void uploadApplicationImage(filePath, field)
        .then((url) => {
          applyForm[field] = url;
          uni.showToast({ title: "图片已上传", icon: "success" });
        })
        .catch((error) => {
          uni.showToast({
            title: error instanceof Error ? error.message : "图片上传失败",
            icon: "none"
          });
        })
        .finally(() => {
          uploading.value = false;
        });
    }
  });
}

async function submitApplication() {
  if (loading.value) return;
  if (!validateApplyForm()) {
    uni.showToast({ title: "请完整填写必填资料", icon: "none" });
    return;
  }

  loading.value = true;
  try {
    application.value = await api.apply({
      applicantName: applyForm.applicantName.trim(),
      applicantPhone: applyForm.applicantPhone.trim(),
      storeName: applyForm.storeName.trim(),
      city: applyForm.city.trim() || "福州市",
      district: applyForm.district.trim(),
      address: applyForm.address.trim(),
      businessLicenseNo: applyForm.businessLicenseNo.trim(),
      businessLicenseImageUrl: applyForm.businessLicenseImageUrl,
      storefrontImageUrl: applyForm.storefrontImageUrl,
      categoryNote: applyForm.categoryNote.trim()
    });
    loginPhone.value = applyForm.applicantPhone.trim();
    mode.value = "login";
    uni.showToast({ title: "已提交，等待审核", icon: "success" });
  } catch {
    uni.showToast({ title: "提交失败，请检查后端服务", icon: "none" });
  } finally {
    loading.value = false;
  }
}

async function checkStatus() {
  if (!loginPhone.value.trim()) {
    uni.showToast({ title: "请输入申请手机号", icon: "none" });
    return;
  }

  loading.value = true;
  try {
    application.value = await api.applicationStatus(loginPhone.value.trim());
    if (!application.value) {
      uni.showToast({ title: "未找到申请记录", icon: "none" });
      return;
    }
    uni.showToast({ title: application.value.statusText, icon: "none" });
  } catch {
    uni.showToast({ title: "查询失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

async function handleLogin(event?: PhoneNumberEvent) {
  if (loading.value) return;

  loading.value = true;
  try {
    const code = await getWechatLoginCode();
    const phoneCode = event?.detail?.code;
    const result = await api.wechatLogin({
      code,
      phoneCode,
      phone: loginPhone.value.trim() || undefined
    });
    application.value = result.application ?? null;
    if (!result.canLogin || !result.token || !result.store) {
      uni.showToast({
        title: result.message || (phoneCode ? "暂不能登录" : "请授权微信手机号或填写入驻手机号"),
        icon: "none"
      });
      return;
    }
    saveMerchantSession({ token: result.token, store: result.store });
    uni.showToast({ title: "登录成功", icon: "success" });
    setTimeout(() => {
      uni.switchTab({ url: "/pages/home/index" });
    }, 400);
  } catch (error) {
    const message =
      error instanceof ApiRequestError || error instanceof Error
        ? error.message
        : "登录失败，请检查后端服务";
    uni.showToast({ title: message, icon: "none" });
  } finally {
    loading.value = false;
  }
}

async function handleDemoLogin() {
  if (loading.value) return;
  loading.value = true;
  try {
    const session: MerchantSession = await api.mockLogin();
    saveMerchantSession(session);
    uni.showToast({ title: "已进入演示门店", icon: "success" });
    setTimeout(() => {
      uni.switchTab({ url: "/pages/home/index" });
    }, 400);
  } catch {
    uni.showToast({ title: "演示登录失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.merchant-login-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.merchant-hero {
  position: relative;
  display: flex;
  min-height: 214px;
  flex-direction: column;
  justify-content: flex-start;
  overflow: hidden;
  border-radius: 0 0 28px 28px;
  margin: -12px -12px 0;
  padding: 24px 22px 42px;
  background:
    radial-gradient(circle at 14% 20%, rgba(255, 255, 255, 0.2), transparent 28%),
    radial-gradient(circle at 90% 6%, rgba(255, 255, 255, 0.22), transparent 28%),
    linear-gradient(135deg, #ff7a00, #ff9f1a);
  color: #ffffff;
  box-shadow: 0 14px 30px rgba(255, 122, 0, 0.18);
}

.app-name {
  align-self: flex-start;
  border-radius: 999px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.17);
  font-size: 12px;
  font-weight: 700;
}

.brand-lockup {
  display: flex;
  align-items: center;
  gap: 12px;
  width: fit-content;
  max-width: 100%;
  border-radius: 22px;
  margin-top: 20px;
  padding: 12px 14px 12px 12px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 16px 28px rgba(145, 64, 0, 0.16);
}

.brand-mark {
  display: flex;
  width: 54px;
  height: 54px;
  align-items: center;
  justify-content: center;
  flex: 0 0 54px;
  overflow: hidden;
  border-radius: 18px;
  background: #fff7ef;
}

.brand-mark-image {
  width: 46px;
  height: 46px;
}

.brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.brand-title {
  color: #111111;
  font-size: 21px;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.1;
}

.brand-desc {
  color: #8a4b13;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
}

.subtitle {
  max-width: 280px;
  margin-top: 14px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  line-height: 1.5;
}

.wx-login-card {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: -24px;
  padding: 20px 18px 18px;
  border-radius: 22px;
}

.wx-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}

.wx-avatar {
  display: flex;
  width: 46px;
  height: 46px;
  align-items: center;
  justify-content: center;
  flex: 0 0 46px;
  border-radius: 16px;
  background: #fff2e8;
  color: #ff7a00;
  font-weight: 900;
}

.wx-profile .muted {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.45;
}

.agreement {
  color: #999999;
  text-align: center;
  font-size: 11px;
}

.mode-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  border-radius: 18px;
  padding: 7px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06);
}

.mode-tab {
  border-radius: 14px;
  padding: 10px 0;
  color: #666666;
  text-align: center;
  font-size: 14px;
  font-weight: 800;
}

.mode-tab.active {
  background: #fff2e8;
  color: #ff7a00;
}

.form-card,
.demo-card {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.section-head,
.demo-card,
.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field,
.field-grid {
  display: grid;
  gap: 8px;
}

.field-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-label {
  color: #666666;
  font-size: 12px;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.required-star {
  margin-left: 2px;
  color: #ff4d4f;
  font-weight: 900;
}

.location-link {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 4px 8px;
  background: #fff2e8;
  color: #ff7a00;
  font-size: 11px;
  font-weight: 800;
}

.field-input,
.field-textarea {
  box-sizing: border-box;
  width: 100%;
  border-radius: 14px;
  background: #f7f8fa;
  color: #111111;
  font-size: 14px;
}

.field-input {
  height: 42px;
  padding: 0 12px;
}

.field-textarea {
  min-height: 78px;
  padding: 10px 12px;
  line-height: 1.45;
}

.apply-upload {
  overflow: hidden;
  height: 92px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255, 122, 0, 0.1), rgba(255, 176, 32, 0.2)), #fffaf4;
}

.apply-upload-image,
.apply-upload-inner {
  width: 100%;
  height: 100%;
}

.apply-upload-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
  color: #ff7a00;
  font-size: 12px;
  font-weight: 800;
}

.apply-upload-inner text:first-child {
  font-size: 24px;
  line-height: 1;
}

.status-card {
  border-radius: 16px;
  padding: 12px;
  background: #fffaf4;
}

.status-card.approved {
  background: #e9fbf2;
}

.status-card.rejected {
  background: #fff1f0;
}

.status-title {
  display: block;
  margin-bottom: 5px;
  font-weight: 800;
}

.status-pill {
  border-radius: 999px;
  padding: 5px 9px;
  background: #ffffff;
  color: #ff7a00;
  font-size: 11px;
  font-weight: 800;
}

.review-note {
  border-radius: 14px;
  padding: 10px 12px;
  background: #f7f8fa;
  color: #666666;
  font-size: 13px;
  line-height: 1.45;
}

button {
  width: 100%;
}

.demo-card {
  flex-direction: row;
}

.demo-card button {
  width: 106px;
  flex: 0 0 106px;
}
</style>
