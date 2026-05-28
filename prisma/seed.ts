import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function createPasswordHash(password: string, salt = randomBytes(16).toString("hex")) {
  return {
    passwordSalt: salt,
    passwordHash: scryptSync(password, salt, 64).toString("hex")
  };
}

async function main() {
  const adminAccount = process.env.ADMIN_ACCOUNT ?? process.env.ADMIN_DEFAULT_ACCOUNT ?? "admin";
  const adminPassword =
    process.env.ADMIN_PASSWORD ?? process.env.ADMIN_DEFAULT_PASSWORD ?? "admin123456";

  await prisma.adminUser.upsert({
    where: { account: adminAccount },
    update: {
      name: "金闪送管理员",
      role: "SUPER_ADMIN",
      status: "ACTIVE"
    },
    create: {
      account: adminAccount,
      name: "金闪送管理员",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      ...createPasswordHash(adminPassword)
    }
  });

  const demoUser = await prisma.user.upsert({
    where: { phone: "13800000000" },
    update: {
      nickname: "金闪送用户"
    },
    create: {
      phone: "13800000000",
      nickname: "金闪送用户"
    }
  });

  await prisma.address.upsert({
    where: { id: "demo-address-taijiang" },
    update: {
      userId: demoUser.id,
      name: "张先生",
      phone: "13888888888",
      city: "福州市",
      district: "台江区",
      detail: "工业路193号宝龙广场1号楼1503室",
      latitude: "26.060888",
      longitude: "119.303888",
      isDefault: true
    },
    create: {
      id: "demo-address-taijiang",
      userId: demoUser.id,
      name: "张先生",
      phone: "13888888888",
      city: "福州市",
      district: "台江区",
      detail: "工业路193号宝龙广场1号楼1503室",
      latitude: "26.060888",
      longitude: "119.303888",
      isDefault: true
    }
  });

  const categories = await Promise.all(
    [
      { name: "充电线", icon: "cable", sort: 1 },
      { name: "充电头", icon: "plug", sort: 2 },
      { name: "充电宝", icon: "battery", sort: 3 },
      { name: "手机壳", icon: "phone-case", sort: 4 },
      { name: "钢化膜", icon: "shield", sort: 5 }
    ].map((category) =>
      prisma.category.upsert({
        where: { name: category.name },
        update: category,
        create: category
      })
    )
  );

  const cableCategory = categories.find((category) => category.name === "充电线");
  const chargerCategory = categories.find((category) => category.name === "充电头");
  const powerBankCategory = categories.find((category) => category.name === "充电宝");
  const phoneCaseCategory = categories.find((category) => category.name === "手机壳");
  const screenProtectorCategory = categories.find((category) => category.name === "钢化膜");

  const cable = await prisma.product.upsert({
    where: { slug: "pisen-type-c-cable-1m-white" },
    update: {
      name: "品胜 Type-C 快充线 1m 白色",
      categoryId: cableCategory?.id,
      reviewStatus: "APPROVED",
      reviewRemark: "演示商品初始化，默认审核通过"
    },
    create: {
      name: "品胜 Type-C 快充线 1m 白色",
      slug: "pisen-type-c-cable-1m-white",
      categoryId: cableCategory?.id,
      description: "适合日常手机充电和数据传输，MVP 演示商品。",
      coverUrl: "/assets/products/type-c-cable.png",
      reviewStatus: "APPROVED",
      reviewRemark: "演示商品初始化，默认审核通过",
      reviewedAt: new Date(),
      sort: 1
    }
  });

  const charger = await prisma.product.upsert({
    where: { slug: "pisen-65w-gan-charger" },
    update: {
      name: "品胜 65W 氮化镓充电器",
      categoryId: chargerCategory?.id,
      reviewStatus: "APPROVED",
      reviewRemark: "演示商品初始化，默认审核通过"
    },
    create: {
      name: "品胜 65W 氮化镓充电器",
      slug: "pisen-65w-gan-charger",
      categoryId: chargerCategory?.id,
      description: "多设备快充，MVP 演示商品。",
      coverUrl: "/assets/products/65w-charger.png",
      reviewStatus: "APPROVED",
      reviewRemark: "演示商品初始化，默认审核通过",
      reviewedAt: new Date(),
      sort: 2
    }
  });

  const powerBank = await prisma.product.upsert({
    where: { slug: "pisen-power-bank-10000" },
    update: {
      name: "品胜 10000mAh 充电宝",
      categoryId: powerBankCategory?.id,
      reviewStatus: "APPROVED",
      reviewRemark: "演示商品初始化，默认审核通过"
    },
    create: {
      name: "品胜 10000mAh 充电宝",
      slug: "pisen-power-bank-10000",
      categoryId: powerBankCategory?.id,
      description: "通勤应急移动电源，MVP 演示商品。",
      coverUrl: "/assets/products/power-bank.png",
      reviewStatus: "APPROVED",
      reviewRemark: "演示商品初始化，默认审核通过",
      reviewedAt: new Date(),
      sort: 3
    }
  });

  const phoneCase = await prisma.product.upsert({
    where: { slug: "pisen-iphone-anti-drop-case" },
    update: {
      name: "品胜 iPhone 防摔透明手机壳",
      categoryId: phoneCaseCategory?.id,
      reviewStatus: "APPROVED",
      reviewRemark: "演示商品初始化，默认审核通过"
    },
    create: {
      name: "品胜 iPhone 防摔透明手机壳",
      slug: "pisen-iphone-anti-drop-case",
      categoryId: phoneCaseCategory?.id,
      description: "透明防摔边框，适合福州同城现货闪购演示。",
      coverUrl: "/assets/products/phone-case.png",
      reviewStatus: "APPROVED",
      reviewRemark: "演示商品初始化，默认审核通过",
      reviewedAt: new Date(),
      sort: 4
    }
  });

  const screenProtector = await prisma.product.upsert({
    where: { slug: "pisen-hd-tempered-glass" },
    update: {
      name: "品胜 高清钢化膜",
      categoryId: screenProtectorCategory?.id,
      reviewStatus: "APPROVED",
      reviewRemark: "演示商品初始化，默认审核通过"
    },
    create: {
      name: "品胜 高清钢化膜",
      slug: "pisen-hd-tempered-glass",
      categoryId: screenProtectorCategory?.id,
      description: "高清防刮钢化膜，适合到店现货和同城配送演示。",
      coverUrl: "/assets/products/tempered-glass.png",
      reviewStatus: "APPROVED",
      reviewRemark: "演示商品初始化，默认审核通过",
      reviewedAt: new Date(),
      sort: 5
    }
  });

  const skus = await Promise.all([
    prisma.sku.upsert({
      where: { code: "SKU-CABLE-TYPEC-1M-WHITE" },
      update: {
        productId: cable.id,
        name: "1m 白色",
        salePrice: "15.00",
        defaultSettlePrice: "7.00",
        stock: 500
      },
      create: {
        productId: cable.id,
        code: "SKU-CABLE-TYPEC-1M-WHITE",
        name: "1m 白色",
        salePrice: "15.00",
        defaultSettlePrice: "7.00",
        stock: 500
      }
    }),
    prisma.sku.upsert({
      where: { code: "SKU-CHARGER-65W-WHITE" },
      update: {
        productId: charger.id,
        name: "65W 白色",
        salePrice: "69.00",
        defaultSettlePrice: "48.00",
        stock: 200
      },
      create: {
        productId: charger.id,
        code: "SKU-CHARGER-65W-WHITE",
        name: "65W 白色",
        salePrice: "69.00",
        defaultSettlePrice: "48.00",
        stock: 200
      }
    }),
    prisma.sku.upsert({
      where: { code: "SKU-POWERBANK-10000-BLACK" },
      update: {
        productId: powerBank.id,
        name: "10000mAh 黑色",
        salePrice: "99.00",
        defaultSettlePrice: "68.00",
        stock: 120
      },
      create: {
        productId: powerBank.id,
        code: "SKU-POWERBANK-10000-BLACK",
        name: "10000mAh 黑色",
        salePrice: "99.00",
        defaultSettlePrice: "68.00",
        stock: 120
      }
    }),
    prisma.sku.upsert({
      where: { code: "SKU-PHONE-CASE-IP15-CLEAR" },
      update: {
        productId: phoneCase.id,
        name: "iPhone 15 透明",
        salePrice: "29.00",
        defaultSettlePrice: "13.00",
        stock: 180
      },
      create: {
        productId: phoneCase.id,
        code: "SKU-PHONE-CASE-IP15-CLEAR",
        name: "iPhone 15 透明",
        salePrice: "29.00",
        defaultSettlePrice: "13.00",
        stock: 180
      }
    }),
    prisma.sku.upsert({
      where: { code: "SKU-TEMPERED-GLASS-IP15" },
      update: {
        productId: screenProtector.id,
        name: "iPhone 15 高清",
        salePrice: "19.00",
        defaultSettlePrice: "8.00",
        stock: 240
      },
      create: {
        productId: screenProtector.id,
        code: "SKU-TEMPERED-GLASS-IP15",
        name: "iPhone 15 高清",
        salePrice: "19.00",
        defaultSettlePrice: "8.00",
        stock: 240
      }
    })
  ]);

  const stores = await Promise.all([
    prisma.store.upsert({
      where: { code: "FZ-TAIJIANG-001" },
      update: {
        name: "品胜福州宝龙店",
        phone: "0591-88000001",
        address: "福州市台江区工业路193号宝龙广场1号楼",
        latitude: "26.060123",
        longitude: "119.303456"
      },
      create: {
        code: "FZ-TAIJIANG-001",
        name: "品胜福州宝龙店",
        phone: "0591-88000001",
        address: "福州市台江区工业路193号宝龙广场1号楼",
        latitude: "26.060123",
        longitude: "119.303456"
      }
    }),
    prisma.store.upsert({
      where: { code: "FZ-CANGSHAN-001" },
      update: {
        name: "品胜仓山万达店",
        phone: "0591-88000002",
        address: "福州市仓山区浦上大道万达广场",
        latitude: "26.041234",
        longitude: "119.274321"
      },
      create: {
        code: "FZ-CANGSHAN-001",
        name: "品胜仓山万达店",
        phone: "0591-88000002",
        address: "福州市仓山区浦上大道万达广场",
        latitude: "26.041234",
        longitude: "119.274321"
      }
    })
  ]);

  for (const store of stores) {
    const existingApplication = await prisma.storeApplication.findFirst({
      where: {
        applicantPhone: store.phone ?? "",
        storeName: store.name
      }
    });

    const applicationData = {
      applicantName: store.name.includes("宝龙") ? "陈店长" : "林店长",
      applicantPhone: store.phone ?? "",
      storeName: store.name,
      city: "福州市",
      district: store.name.includes("仓山") ? "仓山区" : "台江区",
      address: store.address,
      businessLicenseNo: store.name.includes("仓山") ? "91350100DEMO0002" : "91350100DEMO0001",
      categoryNote: "数码配件、充电线、充电器、手机壳",
      status: "APPROVED" as const,
      reviewRemark: "演示门店初始化，默认审核通过",
      reviewedAt: new Date(),
      storeId: store.id
    };

    if (existingApplication) {
      await prisma.storeApplication.update({
        where: { id: existingApplication.id },
        data: applicationData
      });
    } else {
      await prisma.storeApplication.create({ data: applicationData });
    }
  }

  for (const store of stores) {
    for (const provider of [
      {
        provider: "MEITUAN",
        serviceCode: "4031",
        providerShopId: `MT-${store.code}`,
        remark: "演示美团配送门店 ID；正式接入后替换为美团 shop_id"
      },
      {
        provider: "FENGNIAO",
        serviceCode: "即时配送",
        providerShopId: `FN-${store.code}`,
        remark: "演示蜂鸟即配门店编码；正式接入后替换为蜂鸟门店编码"
      },
      {
        provider: "UU",
        serviceCode: "帮送",
        providerShopId: `UU-${store.code}`,
        remark: "演示 UU 跑腿门店编码"
      },
      {
        provider: "SF_INTRA_CITY",
        serviceCode: "同城急送",
        providerShopId: `SF-${store.code}`,
        remark: "演示顺丰同城门店编码"
      }
    ]) {
      await prisma.storeDeliveryProviderConfig.upsert({
        where: {
          storeId_provider: {
            storeId: store.id,
            provider: provider.provider
          }
        },
        update: {
          providerShopId: provider.providerShopId,
          serviceCode: provider.serviceCode,
          contactName: store.name.includes("宝龙") ? "陈店长" : "林店长",
          contactPhone: store.phone ?? "",
          remark: provider.remark
        },
        create: {
          storeId: store.id,
          provider: provider.provider,
          providerShopId: provider.providerShopId,
          enabled: provider.provider === "MEITUAN" || provider.provider === "FENGNIAO",
          serviceCode: provider.serviceCode,
          contactName: store.name.includes("宝龙") ? "陈店长" : "林店长",
          contactPhone: store.phone ?? "",
          remark: provider.remark
        }
      });
    }

    if (!store.phone) {
      continue;
    }

    const application = await prisma.storeApplication.findFirst({
      where: {
        applicantPhone: store.phone,
        storeId: store.id
      },
      orderBy: { createdAt: "desc" }
    });

    await prisma.merchantAccount.upsert({
      where: { phone: store.phone },
      update: {
        storeId: store.id,
        name: application?.applicantName ?? `${store.name}管理员`,
        status: "ACTIVE"
      },
      create: {
        phone: store.phone,
        storeId: store.id,
        name: application?.applicantName ?? `${store.name}管理员`,
        status: "ACTIVE"
      }
    });
  }

  for (const store of stores) {
    for (const sku of skus) {
      await prisma.storeSku.upsert({
        where: {
          storeId_skuId: {
            storeId: store.id,
            skuId: sku.id
          }
        },
        update: {
          stock: 80,
          settlePrice: sku.defaultSettlePrice
        },
        create: {
          storeId: store.id,
          skuId: sku.id,
          stock: 80,
          settlePrice: sku.defaultSettlePrice
        }
      });
    }
  }

  await Promise.all([
    prisma.rider.upsert({
      where: { riderNo: "0086" },
      update: { riderName: "模拟骑手0086" },
      create: { riderNo: "0086", riderName: "模拟骑手0086" }
    }),
    prisma.rider.upsert({
      where: { riderNo: "0087" },
      update: { riderName: "模拟骑手0087" },
      create: { riderNo: "0087", riderName: "模拟骑手0087" }
    }),
    prisma.promoter.upsert({
      where: { promoteCode: "FZTG001" },
      update: { name: "福州推广员001" },
      create: { promoteCode: "FZTG001", name: "福州推广员001" }
    })
  ]);

  await Promise.all([
    prisma.promotionConfig.upsert({
      where: { code: "NEW_USER_FIRST_ORDER" },
      update: {
        enabled: true,
        config: { amount: 5, cityScope: ["福州市"], lifetimeLimit: 1 }
      },
      create: {
        code: "NEW_USER_FIRST_ORDER",
        name: "新人首单立减",
        type: "COUPON",
        enabled: true,
        config: { amount: 5, cityScope: ["福州市"], lifetimeLimit: 1 }
      }
    }),
    prisma.promotionConfig.upsert({
      where: { code: "REFERRAL_COUPON" },
      update: {
        enabled: true,
        config: { amount: 2, validDays: 7, weeklyLimit: 3 }
      },
      create: {
        code: "REFERRAL_COUPON",
        name: "老带新奖励券",
        type: "COUPON",
        enabled: true,
        config: { amount: 2, validDays: 7, weeklyLimit: 3 }
      }
    }),
    prisma.promotionConfig.upsert({
      where: { code: "ORDER_DISCOUNT" },
      update: {
        enabled: true,
        config: {
          tiers: [
            { threshold: 29, discount: 3 },
            { threshold: 49, discount: 6 }
          ]
        }
      },
      create: {
        code: "ORDER_DISCOUNT",
        name: "满减活动",
        type: "ORDER_DISCOUNT",
        enabled: true,
        config: {
          tiers: [
            { threshold: 29, discount: 3 },
            { threshold: 49, discount: 6 }
          ]
        }
      }
    }),
    prisma.promotionConfig.upsert({
      where: { code: "FREE_DELIVERY" },
      update: {
        enabled: true,
        config: { threshold: 19 }
      },
      create: {
        code: "FREE_DELIVERY",
        name: "满 19 元免配送费",
        type: "DELIVERY",
        enabled: true,
        config: { threshold: 19 }
      }
    })
  ]);

  await Promise.all([
    prisma.systemConfig.upsert({
      where: { key: "delivery" },
      update: {
        value: {
          userDeliveryFee: 4,
          platformDeliveryCost: 4,
          freeDeliveryThreshold: 19
        }
      },
      create: {
        key: "delivery",
        value: {
          userDeliveryFee: 4,
          platformDeliveryCost: 4,
          freeDeliveryThreshold: 19
        },
        remark: "配送费和平台配送成本配置"
      }
    }),
    prisma.systemConfig.upsert({
      where: { key: "service_area" },
      update: {
        value: {
          city: "福州市",
          enabledDistricts: ["鼓楼区", "台江区", "仓山区", "晋安区", "马尾区", "长乐区"],
          note: "第一阶段 MVP 服务范围，超出范围的地址不允许下单"
        }
      },
      create: {
        key: "service_area",
        value: {
          city: "福州市",
          enabledDistricts: ["鼓楼区", "台江区", "仓山区", "晋安区", "马尾区", "长乐区"],
          note: "第一阶段 MVP 服务范围，超出范围的地址不允许下单"
        },
        remark: "用户端定位、地址校验和订单报价服务范围配置"
      }
    }),
    prisma.systemConfig.upsert({
      where: { key: "delivery_aggregation" },
      update: {
        value: {
          enabled: true,
          strategy: "LOWEST_COST",
          highValueThreshold: 99,
          highValuePreferredProvider: "SF_INTRA_CITY",
          providers: [
            {
              code: "MEITUAN",
              name: "美团配送",
              enabled: true,
              mode: "mock",
              endpoint: "",
              appKey: "",
              token: "",
              secret: "",
              shopId: "",
              serviceCode: "4031",
              payTypeCode: 0,
              goodsWeightKg: 1,
              coordinateType: 0,
              cancelReasonId: 199,
              mockBaseFee: 5.8,
              mockEtaMinutes: 38
            },
            {
              code: "FENGNIAO",
              name: "蜂鸟即配",
              enabled: true,
              mode: "mock",
              endpoint: "",
              appKey: "",
              token: "",
              secret: "",
              shopId: "",
              serviceCode: "即时配送",
              payTypeCode: 0,
              goodsWeightKg: 1,
              coordinateType: 0,
              cancelReasonId: 199,
              mockBaseFee: 5.5,
              mockEtaMinutes: 42
            },
            {
              code: "UU",
              name: "UU跑腿",
              enabled: false,
              mode: "mock",
              endpoint: "",
              appKey: "",
              token: "",
              secret: "",
              shopId: "",
              serviceCode: "帮送",
              payTypeCode: 0,
              goodsWeightKg: 1,
              coordinateType: 0,
              cancelReasonId: 199,
              mockBaseFee: 7,
              mockEtaMinutes: 45
            },
            {
              code: "SF_INTRA_CITY",
              name: "顺丰同城",
              enabled: false,
              mode: "mock",
              endpoint: "",
              appKey: "",
              token: "",
              secret: "",
              shopId: "",
              serviceCode: "同城急送",
              payTypeCode: 0,
              goodsWeightKg: 1,
              coordinateType: 0,
              cancelReasonId: 199,
              mockBaseFee: 9,
              mockEtaMinutes: 35
            }
          ]
        }
      },
      create: {
        key: "delivery_aggregation",
        value: {
          enabled: true,
          strategy: "LOWEST_COST",
          highValueThreshold: 99,
          highValuePreferredProvider: "SF_INTRA_CITY",
          providers: [
            {
              code: "MEITUAN",
              name: "美团配送",
              enabled: true,
              mode: "mock",
              endpoint: "",
              appKey: "",
              token: "",
              secret: "",
              shopId: "",
              serviceCode: "4031",
              payTypeCode: 0,
              goodsWeightKg: 1,
              coordinateType: 0,
              cancelReasonId: 199,
              mockBaseFee: 5.8,
              mockEtaMinutes: 38
            },
            {
              code: "FENGNIAO",
              name: "蜂鸟即配",
              enabled: true,
              mode: "mock",
              endpoint: "",
              appKey: "",
              token: "",
              secret: "",
              shopId: "",
              serviceCode: "即时配送",
              payTypeCode: 0,
              goodsWeightKg: 1,
              coordinateType: 0,
              cancelReasonId: 199,
              mockBaseFee: 5.5,
              mockEtaMinutes: 42
            },
            {
              code: "UU",
              name: "UU跑腿",
              enabled: false,
              mode: "mock",
              endpoint: "",
              appKey: "",
              token: "",
              secret: "",
              shopId: "",
              serviceCode: "帮送",
              payTypeCode: 0,
              goodsWeightKg: 1,
              coordinateType: 0,
              cancelReasonId: 199,
              mockBaseFee: 7,
              mockEtaMinutes: 45
            },
            {
              code: "SF_INTRA_CITY",
              name: "顺丰同城",
              enabled: false,
              mode: "mock",
              endpoint: "",
              appKey: "",
              token: "",
              secret: "",
              shopId: "",
              serviceCode: "同城急送",
              payTypeCode: 0,
              goodsWeightKg: 1,
              coordinateType: 0,
              cancelReasonId: 199,
              mockBaseFee: 9,
              mockEtaMinutes: 35
            }
          ]
        },
        remark: "多平台即时配送配置；美团/蜂鸟优先，真实密钥接入前使用 mock 适配器"
      }
    }),
    prisma.systemConfig.upsert({
      where: { key: "commission" },
      update: {
        value: {
          storeFixedCommission: 1,
          generalAgentRate: 0.03,
          riderBaseBonus: 1.5,
          riderStepCount: 10,
          riderStepBonus: 5,
          promoterCommission: 2
        }
      },
      create: {
        key: "commission",
        value: {
          storeFixedCommission: 1,
          generalAgentRate: 0.03,
          riderBaseBonus: 1.5,
          riderStepCount: 10,
          riderStepBonus: 5,
          promoterCommission: 2
        },
        remark: "门店、骑手、推广员佣金配置"
      }
    }),
    prisma.systemConfig.upsert({
      where: { key: "order_flow" },
      update: {
        value: {
          storeAcceptTimeoutMinutes: 3,
          rejectRefundThreshold: 2
        }
      },
      create: {
        key: "order_flow",
        value: {
          storeAcceptTimeoutMinutes: 3,
          rejectRefundThreshold: 2
        },
        remark: "订单转单和拒单退款配置"
      }
    }),
    prisma.systemConfig.upsert({
      where: { key: "finance" },
      update: {
        value: {
          lossWarningThreshold: 0
        }
      },
      create: {
        key: "finance",
        value: {
          lossWarningThreshold: 0
        },
        remark: "财务预警配置，净利润低于阈值时标记"
      }
    })
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
