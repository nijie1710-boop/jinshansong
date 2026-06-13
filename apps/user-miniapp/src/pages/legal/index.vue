<template>
  <view class="page legal-page">
    <view class="legal-hero">
      <text class="eyebrow">金泽快送</text>
      <text class="title">{{ content.title }}</text>
      <text class="updated">最近更新：2026-05-28</text>
    </view>

    <view class="card notice-card">
      <view class="notice-text">
        运营主体：福州金泽涌跨境电子商务有限公司。服务域名：jssbuy.cn。平台将根据业务调整和法律法规要求更新本协议。
      </view>
    </view>

    <view v-for="section in content.sections" :key="section.heading" class="card legal-card">
      <text class="section-title">{{ section.heading }}</text>
      <view v-for="item in section.items" :key="item" class="paragraph">{{ item }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";

type LegalContent = {
  title: string;
  sections: { heading: string; items: string[] }[];
};

const contents: Record<string, LegalContent> = {
  terms: {
    title: "用户服务协议",
    sections: [
      {
        heading: "一、服务内容",
        items: [
          "本平台为福州本地数码配件即时购买服务平台，提供商品浏览、在线下单、门店履约、同城配送和订单查询等服务。",
          "用户下单后，平台将根据商品库存、门店接单状态、配送范围和订单规则安排门店履约。"
        ]
      },
      {
        heading: "二、账号和登录",
        items: [
          "用户可通过微信授权登录并绑定手机号。用户应确保授权信息真实、有效，不得冒用他人身份或手机号。",
          "因用户主动泄露登录凭证、验证码或设备被他人使用产生的损失，由用户自行承担。"
        ]
      },
      {
        heading: "三、下单和履约",
        items: [
          "用户应填写准确的收货人、手机号、城市、区域、详细地址和定位信息。地址不准确可能导致配送失败或订单取消。",
          "订单支付后，系统将按库存、门店接单状态和配送能力匹配附近门店。若门店拒单、超时或无可履约门店，平台可退款或取消订单。"
        ]
      },
      {
        heading: "四、售后和退款",
        items: [
          "商品售后以商品页面、订单页面和实际商户售后规则为准。因缺货、无法配送、异常订单等原因，平台可按规则发起退款。",
          "用户不得利用优惠、推广码、骑手编号或地址规则进行恶意套利。平台发现异常时可限制下单、取消订单或提交风控处理。"
        ]
      },
      {
        heading: "五、联系方式",
        items: [
          "用户可通过“我的-客服与售后”进入平台客服与售后说明，也可在订单详情页联系门店或配送人员。"
        ]
      }
    ]
  },
  privacy: {
    title: "隐私政策",
    sections: [
      {
        heading: "一、我们收集的信息",
        items: [
          "为完成登录、下单、配送和售后，我们可能收集微信 openId、手机号、昵称、收货人、收货电话、城市、区域、详细地址、经纬度、订单和支付状态等信息。",
          "为保障交易安全，我们可能记录设备信息、操作日志、优惠券使用记录、推广码、骑手编号和风控异常信息。"
        ]
      },
      {
        heading: "二、信息使用目的",
        items: [
          "上述信息用于账号识别、商品交易、门店接单、配送履约、售后处理、风控识别、财务结算和客服沟通。",
          "未经用户同意，我们不会将个人信息用于与本平台服务无关的用途。"
        ]
      },
      {
        heading: "三、信息共享",
        items: [
          "为完成订单履约，我们可能向接单门店、配送服务商、支付服务商和必要的技术服务方提供完成服务所需的最小信息。",
          "我们不会出售用户个人信息。依法需要配合监管、司法或行政机关要求时，我们将按法律法规处理。"
        ]
      },
      {
        heading: "四、用户权利",
        items: [
          "用户可在小程序内管理收货地址、查看订单记录，并可通过客服渠道申请更正或删除相关信息。",
          "用户可通过客服渠道申请注销账号、删除相关数据或撤回授权，平台将按法律法规和业务规则处理。"
        ]
      },
      {
        heading: "五、信息安全",
        items: [
          "我们将通过权限控制、日志审计、传输加密和最小化使用等措施保护用户信息。线上 API 和图片资源将使用 HTTPS 域名。"
        ]
      }
    ]
  },
  delivery: {
    title: "配送服务说明",
    sections: [
      {
        heading: "一、服务范围",
        items: [
          "平台首期服务城市为福州市，具体可配送区域以地址页面、确认订单页和后台配置为准。",
          "若收货地址超出当前服务范围，系统可能无法报价或无法创建订单。"
        ]
      },
      {
        heading: "二、履约方式",
        items: [
          "订单支付后，系统会匹配附近可履约门店，门店接单并备货后由配送人员取货并送达。",
          "配送时效受距离、天气、交通、门店备货、配送运力等因素影响，页面展示的时效为预估值。"
        ]
      },
      {
        heading: "三、异常处理",
        items: [
          "如出现门店缺货、门店超时未接单、配送不可达或联系方式错误，平台可能转单、取消订单或协助退款。",
          "用户应保持手机畅通并填写准确地址，因信息错误导致配送失败的，平台将按订单实际状态处理。"
        ]
      }
    ]
  },
  afterSale: {
    title: "售后与退款说明",
    sections: [
      {
        heading: "一、售后范围",
        items: [
          "平台销售的数码配件售后以商品详情、订单信息、商户承诺和相关法律法规为准。",
          "如商品存在错发、漏发、明显质量问题或运输损坏，用户可通过订单详情和客服入口发起售后沟通。"
        ]
      },
      {
        heading: "二、退款规则",
        items: [
          "因门店无法接单、库存不足、配送不可达等平台或商户原因造成订单无法履约的，平台将协助取消订单或退款。",
          "已完成配送的订单，如需退换货，应保持商品、包装、配件和凭证完整，并按客服或商户指引处理。"
        ]
      },
      {
        heading: "三、风控说明",
        items: [
          "平台会对异常下单、恶意套券、虚假地址、重复退款等行为进行风控识别。",
          "若订单被识别为异常，平台可暂停优惠、人工复核、取消订单或限制相关账号继续使用部分服务。"
        ]
      }
    ]
  }
};

const type = ref("terms");
const content = computed(() => contents[type.value] ?? contents.terms);

onLoad((query) => {
  type.value = typeof query?.type === "string" ? query.type : "terms";
  uni.setNavigationBarTitle({ title: content.value.title });
});
</script>

<style scoped>
.legal-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 28px;
}

.legal-hero {
  display: flex;
  min-height: 120px;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  border-radius: 0 0 24px 24px;
  margin: -12px -12px 0;
  padding: 22px;
  background: linear-gradient(135deg, #ff7a00, #ffb020);
  color: #ffffff;
  box-shadow: 0 14px 30px rgba(255, 122, 0, 0.16);
}

.eyebrow,
.updated {
  font-size: 12px;
  opacity: 0.86;
}

.title {
  font-size: 24px;
  font-weight: 900;
}

.notice-card {
  min-width: 0;
  overflow: hidden;
  border-left: 4px solid #ff7a00;
  color: #8a4b13;
  background: #fff7ed;
  font-size: 12px;
  line-height: 1.55;
}

.notice-text,
.paragraph {
  display: block;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-wrap: break-word;
  white-space: normal;
  word-break: break-word;
}

.legal-card {
  display: flex;
  min-width: 0;
  overflow: hidden;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.05);
}

.legal-card .section-title {
  color: #111111;
  line-height: 1.35;
}

.paragraph {
  color: #555555;
  font-size: 13px;
  line-height: 1.75;
}
</style>
