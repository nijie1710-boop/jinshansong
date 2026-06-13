<template>
  <view class="page legal-page">
    <view class="legal-hero">
      <text class="eyebrow">金泽快送商户端</text>
      <text class="title">{{ content.title }}</text>
      <text class="updated">最近更新：2026-05-28</text>
    </view>

    <view class="card notice-card">
      <view class="notice-text">
        运营主体：福州金泽涌跨境电子商务有限公司。服务域名：jssbuy.cn。平台将根据入驻规则、结算政策和法律法规要求更新本协议。
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
  merchant: {
    title: "门店服务协议",
    sections: [
      {
        heading: "一、服务内容",
        items: [
          "商户端为入驻门店提供门店资料管理、商品上传、库存维护、订单接单、履约状态更新、对账和结算查询等功能。",
          "商户应保证商品来源合法、图片和说明真实，不得上传侵权、虚假、违禁或与实际商品不一致的信息。"
        ]
      },
      {
        heading: "二、账号和门店",
        items: [
          "商户通过微信授权登录，并以通过后台审核的入驻手机号绑定门店。门店账号仅限授权人员使用。",
          "商户应妥善保管账号和设备，因账号泄露、内部人员误操作导致的损失，由商户自行承担。"
        ]
      },
      {
        heading: "三、商品和订单履约",
        items: [
          "商户新增或修改商品后需经后台审核，审核通过且库存充足时，商品才会在用户端展示。",
          "用户支付后，商户应在倒计时内接单并按约定备货。拒单、超时或库存不实可能导致订单转单、退款或门店评分降低。"
        ]
      },
      {
        heading: "四、费用和结算",
        items: [
          "平台将按后台配置计算商品货款、门店履约佣金、配送成本、优惠金额和单单净利润。结算周期和结算规则以后台展示和双方确认规则为准。",
          "如发生退款、售后、风控异常或对账差异，相关订单可暂缓结算，待核实后处理。"
        ]
      }
    ]
  },
  onboarding: {
    title: "商户入驻协议",
    sections: [
      {
        heading: "一、入驻资料",
        items: [
          "商户应提交真实、完整、有效的联系人、手机号、门店名称、营业地址、经营品类、营业执照和门店门头等资料。",
          "平台有权对入驻资料进行审核、驳回、要求补充材料或暂停门店服务。"
        ]
      },
      {
        heading: "二、经营要求",
        items: [
          "商户应具备销售相关数码配件的合法经营资质，并保证商品质量、库存准确和售后响应。",
          "商户不得通过虚假价格、虚假库存、恶意拒单、刷单、套券等方式扰乱平台秩序。"
        ]
      },
      {
        heading: "三、资料变更",
        items: [
          "门店名称、地址、联系人、经营范围或资质发生变化时，商户应及时在商户端或通过客服提交更新。",
          "若资料失效或存在重大不一致，平台可暂停展示商品或限制接单。"
        ]
      }
    ]
  },
  privacy: {
    title: "商户端隐私政策",
    sections: [
      {
        heading: "一、我们收集的信息",
        items: [
          "为完成入驻、登录、审核和订单履约，我们可能收集商户微信 openId、手机号、联系人、门店名称、门店地址、经纬度、营业执照、门头照、商品图片和订单操作记录。",
          "为保障交易安全，我们可能记录登录状态、门店开关、接单行为、拒单记录、库存修改、对账和结算记录。"
        ]
      },
      {
        heading: "二、信息使用目的",
        items: [
          "上述信息用于门店审核、商品审核、订单派发、配送发单、财务结算、客服沟通和风控处理。",
          "平台仅在实现服务所必需的范围内使用商户信息。"
        ]
      },
      {
        heading: "三、信息共享",
        items: [
          "为完成订单履约，平台可能向用户展示必要的门店名称、门店地址、联系电话和商品信息。",
          "为完成配送和支付结算，平台可能向配送服务商、支付服务商、技术服务商提供必要信息。"
        ]
      },
      {
        heading: "四、资料管理",
        items: [
          "商户可在商户端查看和更新部分门店资料。涉及资质、主体、结算账户等重要资料变更时，需重新提交审核。"
        ]
      }
    ]
  },
  fulfillment: {
    title: "履约与售后规则",
    sections: [
      {
        heading: "一、接单要求",
        items: [
          "用户支付后，商户应在倒计时内确认是否接单，并确保商品、规格、价格和库存与实际一致。",
          "商户接单后应及时备货，等待配送人员取货。若因库存不实、地址不符或内部原因无法履约，应及时联系平台处理。"
        ]
      },
      {
        heading: "二、售后责任",
        items: [
          "因商品错发、漏发、质量问题、包装破损或说明不一致产生的售后，商户应配合平台核实并按规则处理。",
          "商户应保留商品进货、出库、打包、交接等必要凭证，用于订单争议和售后复核。"
        ]
      },
      {
        heading: "三、违规处理",
        items: [
          "商户存在虚假库存、恶意拒单、超时不处理、上传虚假商品图、刷单套券等行为时，平台可限制接单、下架商品或暂停结算。",
          "涉及重大异常或投诉的订单，平台可先暂缓结算，待核实后处理。"
        ]
      }
    ]
  }
};

const type = ref("merchant");
const content = computed(() => contents[type.value] ?? contents.merchant);

onLoad((query) => {
  type.value = typeof query?.type === "string" ? query.type : "merchant";
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
