<template>
  <view class="page login-page">
    <view class="login-hero">
      <view class="nav-hint">微信小程序登录预览</view>
      <view class="brand-lockup">
        <view class="brand-mark">
          <image class="brand-mark-image" src="/static/brand/logo-icon.png" mode="aspectFit" />
        </view>
        <view class="brand-copy">
          <text class="brand-title">金闪送</text>
          <text class="brand-desc">福州本地数码配件即时闪购</text>
        </view>
      </view>
      <text class="subtitle">福州同城数码配件即时闪购平台</text>
    </view>

    <view class="card auth-card">
      <view class="profile-preview">
        <view class="wechat-avatar">微</view>
        <view>
          <text class="section-title">微信授权登录</text>
          <text class="muted">用于下单、地址、优惠券和订单通知</text>
        </view>
      </view>

      <!-- #ifdef MP-WEIXIN -->
      <button
        class="primary-button wechat-button"
        open-type="getPhoneNumber"
        :disabled="loading"
        @getphonenumber="handleLogin"
      >
        {{ loading ? "授权中..." : "微信手机号快捷登录" }}
      </button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <button class="primary-button wechat-button" :disabled="loading" @tap="handleLogin">
        {{ loading ? "授权中..." : "微信手机号快捷登录" }}
      </button>
      <!-- #endif -->

      <button class="ghost-button" @tap="goHome">先逛一逛</button>

      <text class="agreement">登录即代表同意《用户服务协议》《隐私政策》</text>
    </view>

    <view class="card flow-card">
      <view class="flow-row">
        <text class="flow-dot active"></text>
        <view>
          <text class="flow-title">微信身份</text>
          <text class="muted">本地预览自动模拟 openId，正式 AppID 后走 code2Session</text>
        </view>
      </view>
      <view class="flow-row">
        <text class="flow-dot"></text>
        <view>
          <text class="flow-title">手机号授权</text>
          <text class="muted">小程序环境会携带手机号授权 code，H5 继续走模拟登录</text>
        </view>
      </view>
      <view class="flow-row">
        <text class="flow-dot"></text>
        <view>
          <text class="flow-title">小程序正式登录</text>
          <text class="muted">切换环境变量即可接真实微信登录接口</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { api, saveUserSession } from "../../services/api";

const loading = ref(false);

type PhoneNumberEvent = {
  detail?: {
    code?: string;
    errMsg?: string;
  };
};

function goHome() {
  uni.switchTab({ url: "/pages/home/index" });
}

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

async function handleLogin(event?: PhoneNumberEvent) {
  if (loading.value) {
    return;
  }

  loading.value = true;
  try {
    const code = await getWechatLoginCode();
    const phoneCode = event?.detail?.code;
    const session = await api.wechatLogin({
      code,
      phoneCode,
      nickname: "金闪送用户"
    });
    saveUserSession(session);
    uni.showToast({ title: "登录成功", icon: "success" });
    setTimeout(goHome, 400);
  } catch {
    uni.showToast({ title: "登录失败，请检查后端服务", icon: "none" });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.login-hero {
  position: relative;
  display: flex;
  min-height: 222px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  overflow: hidden;
  border-radius: 0 0 28px 28px;
  margin: -12px -12px 0;
  padding: 28px 20px 36px;
  background:
    radial-gradient(circle at 16% 22%, rgba(255, 255, 255, 0.25), transparent 28%),
    radial-gradient(circle at 88% 10%, rgba(255, 255, 255, 0.3), transparent 27%),
    linear-gradient(135deg, #ff7a00, #ffb020);
  color: #ffffff;
  box-shadow: 0 14px 30px rgba(255, 122, 0, 0.18);
}

.nav-hint {
  position: absolute;
  top: 16px;
  left: 18px;
  border-radius: 999px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 12px;
  font-weight: 700;
}

.brand-lockup {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 100%;
  border-radius: 22px;
  margin-top: 46px;
  padding: 12px 16px 12px 12px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 16px 28px rgba(145, 64, 0, 0.16);
}

.brand-mark {
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  flex: 0 0 56px;
  overflow: hidden;
  border-radius: 18px;
  background: #fff7ef;
}

.brand-mark-image {
  width: 48px;
  height: 48px;
}

.brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.brand-title {
  color: #111111;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.05;
}

.brand-desc {
  color: #8a4b13;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
}

.subtitle {
  margin-top: 14px;
  color: rgba(255, 255, 255, 0.86);
  font-size: 13px;
}

.auth-card {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: -24px;
  padding: 20px 18px 18px;
  border-radius: 22px;
}

.profile-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.wechat-avatar {
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

.profile-preview .muted {
  display: block;
  margin-top: 4px;
  font-size: 12px;
}

.wechat-button {
  height: 48px;
}

.auth-card button {
  width: 100%;
}

.agreement {
  color: #999999;
  text-align: center;
  font-size: 11px;
}

.flow-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.flow-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.flow-dot {
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  border-radius: 50%;
  margin-top: 5px;
  background: #d8dde3;
}

.flow-dot.active {
  background: #ff7a00;
  box-shadow: 0 0 0 5px rgba(255, 122, 0, 0.1);
}

.flow-title {
  display: block;
  margin-bottom: 3px;
  font-size: 13px;
  font-weight: 800;
}

.flow-row .muted {
  display: block;
  font-size: 12px;
  line-height: 1.45;
}
</style>
