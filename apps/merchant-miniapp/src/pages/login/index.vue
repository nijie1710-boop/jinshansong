<template>
  <view class="page merchant-login-page">
    <view class="merchant-hero">
      <text class="app-name">微信小程序商户登录</text>
      <view class="brand-lockup">
        <view class="brand-mark">
          <image class="brand-mark-image" src="/static/brand/logo-icon.png" mode="aspectFit" />
        </view>
        <view class="brand-copy">
          <text class="brand-title">金泽快送商户端</text>
          <text class="brand-desc">福州本地数码配件即时闪购</text>
        </view>
      </view>
      <text class="subtitle">微信授权登录后进入门店工作台，未入驻商户先提交资料等待后台审核。</text>
    </view>

    <view class="mode-tabs">
      <view class="mode-tab" :class="{ active: mode === 'apply' }" @tap="mode = 'apply'"
        >申请入驻</view
      >
      <view class="mode-tab" :class="{ active: mode === 'login' }" @tap="mode = 'login'"
        >审核状态</view
      >
    </view>

    <view v-if="addStoreMode" class="notice-card">
      <text>当前账号已登录，可继续提交另一家门店。审核通过后会出现在门店切换里。</text>
    </view>

    <view v-if="mode === 'apply'" class="card form-card">
      <view class="section-head">
        <text class="section-title">{{ addStoreMode ? "新增门店资料" : "门店资料" }}</text>
        <text class="muted">{{ addStoreMode ? "新增门店审核" : "平台审核流" }}</text>
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
          <!-- #ifdef MP-WEIXIN -->
          <view class="phone-auth-field" :class="{ filled: Boolean(applyForm.applicantPhone) }">
            <view class="phone-auth-copy">
              <text class="phone-auth-title">
                {{ applyForm.applicantPhone || "授权微信手机号" }}
              </text>
              <text class="phone-auth-desc">用于入驻审核和后续商户登录匹配</text>
            </view>
            <button
              class="phone-auth-button"
              open-type="getPhoneNumber"
              :disabled="loading"
              @getphonenumber="handleApplyPhone"
            >
              {{ applyForm.applicantPhone ? "重新授权" : "授权" }}
            </button>
          </view>
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
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
          <!-- #endif -->
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
          placeholder="例如 金泽快送台江数码店"
        />
      </view>

      <view class="field-grid">
        <view class="field">
          <text class="field-label">城市<text class="required-star">*</text></text>
          <view class="select-field fixed">
            <text>福州市</text>
            <text class="select-note">已固定</text>
          </view>
        </view>
        <view class="field">
          <text class="field-label">区域<text class="required-star">*</text></text>
          <picker
            mode="selector"
            :range="fuzhouDistricts"
            :value="selectedDistrictIndex"
            @change="handleDistrictPickerChange"
          >
            <view class="select-field">
              <text>{{ applyForm.district || "请选择区域" }}</text>
              <text class="select-arrow">›</text>
            </view>
          </picker>
        </view>
      </view>

      <view class="district-filter">
        <button
          v-for="district in fuzhouDistricts"
          :key="district"
          class="district-chip"
          :class="{ active: applyForm.district === district }"
          @tap="selectDistrict(district)"
        >
          {{ district }}
        </button>
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
        {{ loading ? "提交中..." : addStoreMode ? "提交新门店申请" : "提交入驻申请" }}
      </button>
      <view class="agreement apply-agreement">
        <text>提交即代表同意</text>
        <text class="agreement-link" @tap="openLegal('onboarding')">《商户入驻协议》</text>
      </view>
    </view>

    <view v-if="mode === 'login'" class="card form-card">
      <view class="section-head">
        <text class="section-title">审核状态</text>
        <text class="muted">查询入驻进度</text>
      </view>

      <!-- #ifdef MP-WEIXIN -->
      <view class="wechat-phone-card">
        <text class="wechat-phone-title">微信手机号授权</text>
        <text class="wechat-phone-desc">
          系统会用微信授权手机号自动匹配入驻申请和门店，无需手动填写手机号。
        </text>
      </view>
      <!-- #endif -->

      <!-- #ifndef MP-WEIXIN -->
      <view class="field">
        <text class="field-label">测试手机号<text class="required-star">*</text></text>
        <input
          v-model="loginPhone"
          adjust-position
          class="field-input"
          confirm-type="done"
          cursor-spacing="20"
          maxlength="11"
          placeholder="本地测试填写入驻申请手机号"
          type="number"
        />
      </view>
      <!-- #endif -->

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

      <!-- #ifdef MP-WEIXIN -->
      <button
        class="primary-button"
        open-type="getPhoneNumber"
        :disabled="loading"
        @getphonenumber="handleLogin"
      >
        {{ loginButtonText }}
      </button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <button class="primary-button" :disabled="loading" @tap="handleLogin">
        {{ loginButtonText }}
      </button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <button class="ghost-button" :disabled="loading" @tap="checkStatus()">
        查看审核状态
      </button>
      <!-- #endif -->
      <button v-if="loggedIn" class="ghost-button" :disabled="loading" @tap="goHome">
        返回当前门店
      </button>
      <view class="agreement">
        <text>登录即代表同意</text>
        <text class="agreement-link" @tap="openLegal('merchant')">《门店服务协议》</text>
        <text class="agreement-link" @tap="openLegal('privacy')">《隐私协议》</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from "@dcloudio/uni-app";
import { computed, reactive, ref } from "vue";
import { goAfterMerchantLogin, hasMerchantLogin } from "../../services/auth-guard";
import {
  ApiRequestError,
  api,
  getCachedMerchantStore,
  saveMerchantSession,
  type StoreApplication
} from "../../services/api";

const LAST_LOGIN_PHONE_KEY = "jss_merchant_last_phone";

const mode = ref<"apply" | "login">("login");
const loading = ref(false);
const uploading = ref(false);
const loggedIn = ref(false);
const addStoreMode = ref(false);
const loginPhone = ref("");
const redirectUrl = ref("");
const application = ref<StoreApplication | null>(null);
const fuzhouDistricts = ["鼓楼区", "台江区", "仓山区", "晋安区", "马尾区", "长乐区"];
const applyForm = reactive({
  applicantName: "",
  applicantPhone: "",
  storeName: "",
  city: "福州市",
  district: "台江区",
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

onLoad((query) => {
  const redirect = query?.redirect;
  const requestedMode = typeof query?.mode === "string" ? query.mode : "";
  const requestedIntent = typeof query?.intent === "string" ? query.intent : "";
  addStoreMode.value = requestedMode === "apply" && requestedIntent === "add-store";
  redirectUrl.value = typeof redirect === "string" ? redirect : "";
  loggedIn.value = hasMerchantLogin();

  if (addStoreMode.value) {
    mode.value = "apply";
    prefillApplicationPhone();
    return;
  }

  if (loggedIn.value) {
    setTimeout(() => {
      goAfterMerchantLogin(redirectUrl.value);
    }, 0);
    return;
  }

  if (requestedMode === "apply") {
    mode.value = "apply";
  }

  // #ifndef MP-WEIXIN
  const cachedPhone = uni.getStorageSync(LAST_LOGIN_PHONE_KEY);
  if (typeof cachedPhone === "string" && cachedPhone.trim()) {
    loginPhone.value = cachedPhone.trim();
    mode.value = "login";
    setTimeout(() => {
      void checkStatus({ silent: true });
    }, 0);
  }
  // #endif
});

const selectedDistrictIndex = computed(() =>
  Math.max(0, fuzhouDistricts.indexOf(applyForm.district))
);
const loginButtonText = computed(() => {
  if (loading.value) {
    return "授权中...";
  }
  if (application.value?.status === "APPROVED") {
    return "微信授权进入商户端";
  }
  return "微信授权查询/登录";
});

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

function readPhoneCode(event: PhoneNumberEvent | undefined) {
  const phoneCode = event?.detail?.code;
  if (phoneCode) {
    return phoneCode;
  }

  const errMsg = event?.detail?.errMsg ?? "";
  const message =
    errMsg.includes("deny") || errMsg.includes("fail")
      ? "需要授权微信手机号后继续"
      : "未获取到微信手机号，请重试";
  uni.showToast({ title: message, icon: "none" });
  return "";
}

function openLegal(type: "merchant" | "privacy" | "onboarding") {
  uni.navigateTo({ url: `/pages/legal/index?type=${type}` });
}

function goHome() {
  uni.switchTab({ url: "/pages/home/index" });
}

function prefillApplicationPhone() {
  const cachedPhone = uni.getStorageSync(LAST_LOGIN_PHONE_KEY);
  if (typeof cachedPhone === "string" && /^1\d{10}$/.test(cachedPhone.trim())) {
    applyForm.applicantPhone = cachedPhone.trim();
    return;
  }

  const store = getCachedMerchantStore();
  if (/^1\d{10}$/.test(store?.phone ?? "")) {
    applyForm.applicantPhone = store?.phone ?? "";
  }
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
  return fuzhouDistricts.find((district) => address.includes(district)) ?? "";
}

function selectDistrict(district: string) {
  applyForm.city = "福州市";
  applyForm.district = district;
}

function handleDistrictPickerChange(event: { detail?: { value?: number | string } }) {
  const index = Number(event.detail?.value ?? 0);
  selectDistrict(fuzhouDistricts[index] ?? fuzhouDistricts[0]);
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
        applyForm.city = "福州市";
        applyForm.district = applyForm.district.trim() || "台江区";
        uni.showToast({ title: "已定位，请选择区域并补充门牌号", icon: "none" });
      },
      fail() {
        uni.showToast({ title: "定位失败，请手动选择区域", icon: "none" });
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
        selectDistrict(district);
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
  // #ifdef MP-WEIXIN
  if (!applyForm.applicantPhone.trim()) {
    uni.showToast({ title: "请先授权微信手机号", icon: "none" });
    return;
  }
  // #endif
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
    saveLastLoginPhone(loginPhone.value);
    mode.value = "login";
    uni.showToast({ title: "已提交，等待审核", icon: "success" });
  } catch {
    uni.showToast({ title: "提交失败，请检查后端服务", icon: "none" });
  } finally {
    loading.value = false;
  }
}

async function handleApplyPhone(event?: PhoneNumberEvent) {
  if (loading.value) return;
  const phoneCode = readPhoneCode(event);
  if (!phoneCode) return;

  loading.value = true;
  try {
    const result = await api.wechatPhone({ phoneCode });
    applyForm.applicantPhone = result.phone;
    loginPhone.value = result.phone;
    saveLastLoginPhone(result.phone);
    uni.showToast({ title: "手机号已授权", icon: "success" });
  } catch (error) {
    const message =
      error instanceof ApiRequestError || error instanceof Error
        ? error.message
        : "手机号授权失败";
    uni.showToast({ title: message, icon: "none" });
  } finally {
    loading.value = false;
  }
}

function saveLastLoginPhone(phone: string) {
  const normalizedPhone = phone.trim();
  if (normalizedPhone) {
    uni.setStorageSync(LAST_LOGIN_PHONE_KEY, normalizedPhone);
  }
}

function rememberApplicationPhone(nextApplication?: StoreApplication | null) {
  const phone = nextApplication?.applicantPhone?.trim();
  if (!phone) return;
  loginPhone.value = phone;
  saveLastLoginPhone(phone);
}

async function checkStatus(options: { silent?: boolean } = {}) {
  if (!loginPhone.value.trim()) {
    if (!options.silent) {
      uni.showToast({ title: "请输入申请手机号", icon: "none" });
    }
    return;
  }

  loading.value = true;
  try {
    const phone = loginPhone.value.trim();
    saveLastLoginPhone(phone);
    application.value = await api.applicationStatus(phone);
    rememberApplicationPhone(application.value);
    if (!application.value) {
      if (!options.silent) {
        uni.showToast({ title: "未找到申请记录", icon: "none" });
      }
      return;
    }
    if (!options.silent) {
      uni.showToast({ title: application.value.statusText, icon: "none" });
    }
  } catch {
    if (!options.silent) {
      uni.showToast({ title: "查询失败", icon: "none" });
    }
  } finally {
    loading.value = false;
  }
}

async function handleLogin(event?: PhoneNumberEvent) {
  if (loading.value) return;

  loading.value = true;
  try {
    const code = await getWechatLoginCode();
    const phoneCode = event?.detail ? readPhoneCode(event) : undefined;
    if (event?.detail && !phoneCode) {
      return;
    }
    const phone = loginPhone.value.trim() || undefined;
    if (phone) {
      saveLastLoginPhone(phone);
    }
    const result = await api.wechatLogin({
      code,
      phoneCode,
      phone
    });
    application.value = result.application ?? null;
    rememberApplicationPhone(application.value);
    if (!result.canLogin || !result.token || !result.store) {
      uni.showToast({
        title: result.message || (phoneCode ? "暂不能登录" : "请授权微信手机号"),
        icon: "none"
      });
      return;
    }
    saveMerchantSession({ token: result.token, store: result.store, stores: result.stores });
    loggedIn.value = true;
    uni.showToast({ title: "登录成功", icon: "success" });
    setTimeout(() => {
      goAfterMerchantLogin(redirectUrl.value);
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
    linear-gradient(145deg, rgba(17, 24, 39, 0.94) 0%, rgba(31, 41, 55, 0.88) 48%),
    linear-gradient(135deg, #ff7a00 0%, #ff9f1a 100%);
  color: #ffffff;
  box-shadow: 0 14px 30px rgba(255, 122, 0, 0.18);
}

.merchant-hero::after {
  position: absolute;
  right: 18px;
  bottom: 18px;
  width: 118px;
  height: 70px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255, 122, 0, 0.42), rgba(255, 255, 255, 0.05));
  content: "";
}

.app-name {
  position: relative;
  z-index: 1;
  align-self: flex-start;
  border-radius: 999px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.17);
  font-size: 12px;
  font-weight: 700;
}

.brand-lockup {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  width: fit-content;
  max-width: 100%;
  margin-top: 20px;
  padding: 0;
}

.brand-mark {
  display: flex;
  width: 60px;
  height: 60px;
  align-items: center;
  justify-content: center;
  flex: 0 0 60px;
  overflow: hidden;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 14px 26px rgba(0, 0, 0, 0.18);
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
  color: #ffffff;
  font-size: 21px;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.1;
}

.brand-desc {
  color: rgba(255, 255, 255, 0.82);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
}

.subtitle {
  position: relative;
  z-index: 1;
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
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  color: #999999;
  text-align: center;
  font-size: 11px;
  line-height: 1.7;
}

.agreement-link {
  color: #ff7a00;
}

.apply-agreement {
  margin-top: -4px;
}

.mode-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  border-radius: 18px;
  padding: 7px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(17, 17, 17, 0.07);
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
  border-color: rgba(255, 122, 0, 0.08);
  box-shadow: 0 16px 34px rgba(17, 17, 17, 0.07);
}

.notice-card {
  border-radius: 16px;
  padding: 11px 12px;
  background: #fff7ed;
  color: #a14a00;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
}

.section-head,
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

.wechat-phone-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-radius: 16px;
  padding: 12px;
  background: #f7f8fa;
}

.wechat-phone-title {
  color: #111111;
  font-size: 14px;
  font-weight: 900;
}

.wechat-phone-desc {
  color: #666666;
  font-size: 12px;
  line-height: 1.45;
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
.field-textarea,
.select-field {
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

.phone-auth-field {
  display: flex;
  min-height: 50px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-radius: 14px;
  padding: 8px 8px 8px 12px;
  background: #f7f8fa;
}

.phone-auth-field.filled {
  background: #fffaf4;
}

.phone-auth-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.phone-auth-title {
  overflow: hidden;
  color: #111111;
  font-size: 14px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phone-auth-desc {
  color: #666666;
  font-size: 11px;
  line-height: 1.3;
}

.phone-auth-button {
  display: flex;
  width: auto;
  min-width: 72px;
  height: 34px;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  margin: 0;
  border-radius: 999px;
  padding: 0 12px;
  background: linear-gradient(135deg, #ff7a00, #ffb020);
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  line-height: 34px;
}

.phone-auth-button::after {
  border: 0;
}

.select-field {
  display: flex;
  height: 42px;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-weight: 700;
}

.select-field.fixed {
  color: #666666;
}

.select-note {
  border-radius: 999px;
  padding: 3px 7px;
  background: #fff2e8;
  color: #ff7a00;
  font-size: 10px;
  font-weight: 800;
}

.select-arrow {
  color: #ff7a00;
  font-size: 20px;
  font-weight: 900;
}

.district-filter {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
  font-weight: 700;
  line-height: 1;
}

.district-chip.active {
  background: #fff2e8;
  color: #ff7a00;
  font-weight: 900;
}

.district-chip::after {
  border: 0;
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
</style>
