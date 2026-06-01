<template>
  <view class="page support-page">
    <view class="support-hero">
      <view>
        <text class="eyebrow">金闪送商家支持</text>
        <text class="title">平台支持与规则</text>
        <text class="desc">入驻审核、商品上架、订单履约、配送绑定和结算规则统一查看。</text>
      </view>
      <image class="hero-logo" src="/static/brand/logo-icon.png" mode="aspectFit" />
    </view>

    <view class="card action-card">
      <view>
        <text class="section-title">平台在线客服</text>
        <text class="muted">门店审核、商品驳回、配送绑定和结算问题可通过客服会话提交。</text>
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
      <text class="section-title">商家处理事项</text>
      <view v-for="item in todoItems" :key="item.title" class="todo-row">
        <view>
          <text class="todo-title">{{ item.title }}</text>
          <text class="muted">{{ item.desc }}</text>
        </view>
        <text class="tag">{{ item.status }}</text>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">配送平台绑定</text>
      <text class="paragraph">
        平台会为每家合作门店维护美团、蜂鸟等第三方配送平台门店
        ID。门店绑定状态会影响订单发单和配送履约能力。
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
const quickActions = [
  { icon: "服", title: "门店服务协议", desc: "账号、商品和订单规则", type: "merchant" },
  { icon: "入", title: "入驻协议", desc: "资料审核和经营要求", type: "onboarding" },
  { icon: "履", title: "履约售后", desc: "接单、备货和售后责任", type: "fulfillment" },
  { icon: "隐", title: "隐私政策", desc: "门店资料和数据使用", type: "privacy" }
];

const todoItems = [
  {
    title: "资质保持有效",
    desc: "营业执照、门头照、联系人和门店地址应与实际一致。",
    status: "必做"
  },
  { title: "商品真实准确", desc: "主图、详情图、价格、库存和规格需与现货一致。", status: "必做" },
  { title: "及时接单备货", desc: "待接单订单有倒计时，超时可能自动转单。", status: "履约" },
  { title: "配合售后核实", desc: "错发漏发、质量问题和配送异常需配合平台处理。", status: "售后" }
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
  font-size: 24px;
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

.action-card,
.todo-row {
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

.quick-title,
.todo-title {
  display: block;
  margin-top: 10px;
  font-weight: 900;
}

.todo-title {
  margin-top: 0;
}

.quick-desc,
.paragraph {
  display: block;
  margin-top: 6px;
  color: #666666;
  font-size: 12px;
  line-height: 1.65;
}
</style>
