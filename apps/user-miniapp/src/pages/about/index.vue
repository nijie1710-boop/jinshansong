<template>
  <view class="page about-page">
    <view class="hero">
      <image class="logo" src="/static/brand/logo-icon.png" mode="aspectFit" />
      <view>
        <text class="title">金泽快送</text>
        <text class="desc">福州本地数码配件即时闪购平台</text>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">平台说明</text>
      <text class="paragraph">
        金泽快送面向福州本地用户提供手机壳、钢化膜、充电器、充电线等数码配件即时购买服务。
        平台会根据用户地址、附近门店库存和门店接单状态匹配可履约门店。
      </text>
    </view>

    <view class="card section">
      <text class="section-title">运营主体</text>
      <view class="info-row">
        <text>公司名称</text>
        <text>福州金泽涌跨境电子商务有限公司</text>
      </view>
      <view class="info-row">
        <text>服务城市</text>
        <text>福州市</text>
      </view>
      <view class="info-row">
        <text>服务域名</text>
        <text>jssbuy.cn</text>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">联系我们</text>
      <text class="paragraph">
        订单问题、配送异常、退款售后和隐私权利申请，可通过小程序在线客服提交。
      </text>
      <button class="contact-button" open-type="contact">联系在线客服</button>
    </view>
  </view>
</template>

<script setup lang="ts"></script>

<style scoped>
.about-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 28px;
}

.hero {
  display: flex;
  align-items: center;
  gap: 14px;
  border-radius: 0 0 24px 24px;
  margin: -12px -12px 0;
  padding: 24px 20px;
  background: linear-gradient(135deg, #ff7a00, #ffb020);
  color: #ffffff;
}

.logo {
  width: 64px;
  height: 64px;
  flex: 0 0 64px;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(128, 68, 0, 0.18);
}

.title {
  display: block;
  font-size: 25px;
  font-weight: 900;
}

.desc {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  opacity: 0.9;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.paragraph {
  color: #555555;
  font-size: 13px;
  line-height: 1.75;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: #555555;
  font-size: 13px;
  line-height: 1.6;
}

.info-row text:last-child {
  max-width: 210px;
  color: #111111;
  text-align: right;
  font-weight: 700;
}

.contact-button {
  height: 40px;
  border-radius: 999px;
  background: #ff7a00;
  color: #ffffff;
  font-size: 14px;
  font-weight: 900;
  line-height: 40px;
}

.contact-button::after {
  border: 0;
}
</style>
