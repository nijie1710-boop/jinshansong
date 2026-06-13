<template>
  <view class="page support-page">
    <view class="support-hero">
      <view>
        <text class="eyebrow">金泽快送服务中心</text>
        <text class="title">客服与售后</text>
        <text class="desc">订单问题、配送异常、退款售后和服务规则统一在这里查看。</text>
      </view>
      <image class="hero-logo" src="/static/brand/logo-icon.png" mode="aspectFit" />
    </view>

    <view class="card action-card">
      <view>
        <text class="section-title">在线客服</text>
        <text class="muted">通过微信小程序客服会话提交订单问题和售后材料。</text>
      </view>
      <button class="contact-button" open-type="contact">联系</button>
    </view>

    <view class="grid">
      <view
        v-for="item in quickActions"
        :key="item.title"
        class="quick-card"
        @tap="openLegal(item.type)"
      >
        <text class="quick-icon">{{ item.icon }}</text>
        <text class="quick-title">{{ item.title }}</text>
        <text class="quick-desc">{{ item.desc }}</text>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">售后处理流程</text>
      <view v-for="step in afterSaleSteps" :key="step.title" class="step-row">
        <text class="step-dot">{{ step.index }}</text>
        <view>
          <text class="step-title">{{ step.title }}</text>
          <text class="muted">{{ step.desc }}</text>
        </view>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">服务承诺</text>
      <text class="paragraph">
        平台会根据门店库存、接单状态和配送能力安排履约。遇到缺货、无法配送、地址异常或超时未接单时，平台将协助转单、取消订单或退款。
      </text>
      <text class="paragraph">
        涉及商品质量、错发漏发、配送损坏等问题，请保留商品、包装、订单截图和问题照片，通过在线客服提交。
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
const quickActions = [
  { icon: "配", title: "配送说明", desc: "服务范围和异常处理", type: "delivery" },
  { icon: "售", title: "售后退款", desc: "退换货和退款规则", type: "afterSale" },
  { icon: "协", title: "用户协议", desc: "账号、下单和风控", type: "terms" },
  { icon: "隐", title: "隐私政策", desc: "信息收集和使用", type: "privacy" }
];

const afterSaleSteps = [
  { index: "1", title: "提交问题", desc: "通过在线客服说明订单号、问题类型和联系方式。" },
  { index: "2", title: "核实订单", desc: "平台结合订单状态、门店履约和配送记录进行核实。" },
  { index: "3", title: "处理结果", desc: "按实际情况协助补发、退换、取消订单或退款。" }
];

function openLegal(type: string) {
  uni.navigateTo({ url: `/pages/legal/index?type=${type}` });
}
</script>

<style scoped>
.support-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.support-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-radius: 0 0 24px 24px;
  margin: -12px -12px 0;
  padding: 24px 20px;
  background: linear-gradient(135deg, #ff7a00, #ffb020);
  color: #ffffff;
}

.eyebrow,
.desc {
  display: block;
  font-size: 12px;
  opacity: 0.88;
}

.title {
  display: block;
  margin: 8px 0;
  font-size: 25px;
  font-weight: 900;
}

.hero-logo {
  width: 68px;
  height: 68px;
  flex: 0 0 68px;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(128, 68, 0, 0.18);
}

.action-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.contact-button {
  height: 36px;
  min-width: 74px;
  border-radius: 999px;
  background: #ff7a00;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
  line-height: 36px;
}

.contact-button::after {
  border: 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.quick-card {
  min-height: 112px;
  border-radius: 18px;
  padding: 14px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06);
}

.quick-icon {
  display: flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #fff2e8;
  color: #ff7a00;
  font-size: 15px;
  font-weight: 900;
}

.quick-title {
  display: block;
  margin-top: 10px;
  font-weight: 900;
}

.quick-desc,
.paragraph {
  display: block;
  margin-top: 6px;
  color: #666666;
  font-size: 12px;
  line-height: 1.65;
}

.step-row {
  display: flex;
  gap: 10px;
}

.step-dot {
  display: flex;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #ff7a00;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
}

.step-title {
  display: block;
  margin-bottom: 4px;
  font-weight: 800;
}
</style>
