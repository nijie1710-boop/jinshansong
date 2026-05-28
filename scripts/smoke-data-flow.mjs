import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = (process.env.API_BASE_URL || "http://localhost:3001/api").replace(/\/$/, "");
const keepData = process.env.KEEP_SMOKE_DATA === "1";
const storeCode = process.env.SMOKE_STORE_CODE || "FZ-TAIJIANG-001";

const context = {
  productId: "",
  skuId: "",
  storeSkuId: "",
  orderId: "",
  userToken: "",
  merchantToken: "",
  adminToken: "",
  originalStoreSettings: null,
  initialStock: 0
};

function step(message) {
  console.log(`✓ ${message}`);
}

function fail(message) {
  throw new Error(message);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    fail(`${options.method || "GET"} ${path} failed: ${response.status} ${text}`);
  }
  return data;
}

async function loginUser() {
  const session = await request("/auth/user/mock-login", { method: "POST" });
  if (!session?.token) {
    fail("用户模拟登录没有返回 token");
  }
  context.userToken = session.token;
  step("用户端登录 token 可用");
}

async function loginMerchant() {
  const session = await request("/auth/merchant/mock-login", {
    method: "POST",
    body: JSON.stringify({ storeCode })
  });
  if (!session?.token || session.store?.code !== storeCode) {
    fail("商家模拟登录没有返回当前门店 token");
  }
  context.merchantToken = session.token;
  step("商家端登录 token 和门店绑定可用");
}

async function loginAdmin() {
  const session = await request("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({
      account: process.env.ADMIN_ACCOUNT || process.env.ADMIN_DEFAULT_ACCOUNT || "admin",
      password: process.env.ADMIN_PASSWORD || process.env.ADMIN_DEFAULT_PASSWORD || "admin123456"
    })
  });
  if (!session?.token || session.role !== "SUPER_ADMIN") {
    fail("后台管理员登录没有返回有效 token");
  }
  context.adminToken = session.token;
  step("后台管理员数据库账号登录可用");
}

function merchantHeaders() {
  return {
    "x-merchant-token": context.merchantToken,
    "x-store-code": storeCode
  };
}

function adminHeaders() {
  return {
    "x-admin-token": context.adminToken
  };
}

async function createMerchantProduct() {
  const categories = await request("/categories");
  const category = categories[0];
  if (!category?.id) {
    fail("没有可用商品分类");
  }

  const product = await request("/merchant/products", {
    method: "POST",
    headers: merchantHeaders(),
    body: JSON.stringify({
      categoryId: category.id,
      name: `数据互通测试 Type-C 快充线 ${Date.now()}`,
      skuName: "1m 白色",
      description: "用于验证用户端、商家端、后台数据互通的自动化测试商品",
      salePrice: 21.9,
      settlePrice: 13.9,
      stock: 12
    })
  });

  context.productId = product.productId;
  context.skuId = product.skuId;
  context.storeSkuId = product.storeSkuId;
  context.initialStock = product.stock;

  if (product.reviewStatus !== "PENDING") {
    fail(`商家新增商品应为待审核，实际为 ${product.reviewStatus}`);
  }
  step("商家端新增商品进入待审核");
}

async function assertMerchantSettingsCanPersist() {
  const store = await request("/merchant/store/settings", {
    headers: merchantHeaders()
  });

  context.originalStoreSettings = {
    acceptOrderSwitch: store.acceptOrderSwitch,
    autoTransferSwitch: store.autoTransferSwitch,
    voiceReminderSwitch: store.voiceReminderSwitch
  };

  const nextVoiceReminderSwitch = !store.voiceReminderSwitch;
  const updated = await request("/merchant/store/settings", {
    method: "POST",
    headers: merchantHeaders(),
    body: JSON.stringify({ acceptOrderSwitch: true, voiceReminderSwitch: nextVoiceReminderSwitch })
  });

  if (updated.voiceReminderSwitch !== nextVoiceReminderSwitch || !updated.acceptOrderSwitch) {
    fail("商家设置开关没有写入数据库");
  }

  const restored = await request("/merchant/store/settings", {
    method: "POST",
    headers: merchantHeaders(),
    body: JSON.stringify({
      acceptOrderSwitch: true,
      voiceReminderSwitch: store.voiceReminderSwitch
    })
  });

  if (restored.voiceReminderSwitch !== store.voiceReminderSwitch || !restored.acceptOrderSwitch) {
    fail("商家设置开关没有恢复成功");
  }

  step("商家端设置开关真实保存可用");
}

async function assertPendingProductHiddenFromUser() {
  const products = await request("/products");
  const visible = products.some((product) => product.id === context.productId);
  if (visible) {
    fail("待审核商品不应该展示给用户端");
  }
  step("待审核商品不会出现在用户端商品列表");
}

async function approveProductAndAssertVisible() {
  const adminProductsBefore = await request("/admin/products", { headers: adminHeaders() });
  const pending = adminProductsBefore.find(
    (product) => product.productId === context.productId && product.reviewStatus === "PENDING"
  );
  if (!pending) {
    fail("后台商品管理没有看到待审核商品");
  }

  await request(`/admin/products/${context.productId}/approve`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ remark: "数据互通 smoke 测试审核通过" })
  });

  const products = await request("/products");
  const visible = products.find((product) => product.id === context.productId);
  if (!visible) {
    fail("商品审核通过后用户端仍不可见");
  }
  step("后台审核通过后，用户端商品列表可见");
}

async function createAndPayOrder() {
  const addresses = await request("/addresses", {
    headers: { "x-user-token": context.userToken }
  });
  const address = addresses[0];
  if (!address?.id) {
    fail("用户没有可用收货地址");
  }

  const quote = await request("/orders/quote", {
    method: "POST",
    headers: { "x-user-token": context.userToken },
    body: JSON.stringify({
      addressId: address.id,
      items: [{ skuId: context.skuId, quantity: 1 }],
      riderNo: "0086",
      promoterCode: "FZTG001"
    })
  });

  if (!quote?.store?.id || quote.payableAmount <= 0) {
    fail("订单报价没有匹配到门店或金额异常");
  }

  const order = await request("/orders", {
    method: "POST",
    headers: { "x-user-token": context.userToken },
    body: JSON.stringify({
      addressId: address.id,
      items: [{ skuId: context.skuId, quantity: 1 }],
      riderNo: "0086",
      promoterCode: "FZTG001"
    })
  });
  context.orderId = order.id;

  const paid = await request(`/payments/${context.orderId}/mock-pay`, {
    method: "POST",
    headers: { "x-user-token": context.userToken }
  });

  if (paid.statusCode !== "WAITING_STORE_ACCEPT") {
    fail(`支付后订单应进入待接单，实际为 ${paid.statusCode}`);
  }
  step("用户端创建订单并模拟支付成功");
}

async function assertPaymentReservedStock() {
  const storeSku = await prisma.storeSku.findUnique({ where: { id: context.storeSkuId } });
  if (!storeSku) {
    fail("支付后没有找到门店 SKU 库存记录");
  }

  if (storeSku.stock !== context.initialStock - 1) {
    fail(`模拟支付后应预占 1 件库存，当前库存 ${storeSku.stock}`);
  }

  step("模拟支付后已预占门店库存");
}

async function assertMerchantSeesPendingOrder() {
  const pendingOrders = await request("/merchant/orders/pending", {
    headers: merchantHeaders()
  });
  const found = pendingOrders.find((order) => order.id === context.orderId);
  if (!found) {
    fail("商家端待接单列表没有出现用户支付后的订单");
  }
  step("商家端待接单列表收到用户订单");
}

async function completeMerchantOrder() {
  const actions = [
    ["accept", "STORE_ACCEPTED"],
    ["ready", "READY_FOR_PICKUP"],
    ["pickup", "RIDER_PICKED_UP"],
    ["complete", "COMPLETED"]
  ];

  for (const [action, expectedStatus] of actions) {
    const updated = await request(`/merchant/orders/${context.orderId}/actions/${action}`, {
      method: "POST",
      headers: merchantHeaders()
    });
    if (updated.statusCode !== expectedStatus) {
      fail(`商家 ${action} 后状态应为 ${expectedStatus}，实际为 ${updated.statusCode}`);
    }
  }
  step("商家端接单、备货、取货、完成订单链路通过");
}

async function assertAdminAndUserRecords() {
  const [adminOrders, adminOrderDetail, finance, userOrders] = await Promise.all([
    request("/admin/orders", { headers: adminHeaders() }),
    request(`/admin/orders/${context.orderId}`, { headers: adminHeaders() }),
    request("/admin/finance/summary", { headers: adminHeaders() }),
    request("/orders/my", { headers: { "x-user-token": context.userToken } })
  ]);

  const adminOrder = adminOrders.find((order) => order.id === context.orderId);
  if (!adminOrder || adminOrder.statusCode !== "COMPLETED") {
    fail("后台订单管理没有看到已完成订单");
  }
  if (adminOrderDetail.id !== context.orderId || adminOrderDetail.statusCode !== "COMPLETED") {
    fail("后台订单详情没有读取到同一笔已完成订单");
  }
  const logActions = new Set((adminOrderDetail.logs || []).map((log) => log.action));
  for (const action of [
    "CREATE",
    "MOCK_PAY",
    "MERCHANT_ACCEPT",
    "DELIVERY_DISPATCH",
    "ORDER_COMPLETE"
  ]) {
    if (!logActions.has(action)) {
      fail(`后台订单详情缺少操作日志 ${action}`);
    }
  }
  if (!adminOrderDetail.deliveryTask || adminOrderDetail.deliveryTask.status !== "COMPLETED") {
    fail("后台订单详情没有同步第三方聚合配送任务状态");
  }
  const paymentRecord = (adminOrderDetail.paymentRecords || []).find(
    (record) => record.type === "PAYMENT" && record.status === "SUCCESS"
  );
  if (!paymentRecord || paymentRecord.amount !== adminOrderDetail.payableAmount) {
    fail("后台订单详情缺少模拟支付成功流水");
  }
  if (typeof adminOrder.netProfit !== "number") {
    fail("后台订单缺少单单净利润");
  }
  if (!finance || finance.orderCount < 1 || typeof finance.totalProfit !== "number") {
    fail("后台财务统计没有汇总订单数据");
  }
  const userOrder = userOrders.find((order) => order.id === context.orderId);
  if (!userOrder || userOrder.statusCode !== "COMPLETED") {
    fail("用户端购买记录没有看到已完成订单");
  }

  step("后台订单列表/详情、财务统计和用户购买记录同步可见");
}

async function assertOperationalPagesUseRealData() {
  const [categories, reconciliation, settlements] = await Promise.all([
    request("/categories"),
    request("/merchant/reconciliation", { headers: merchantHeaders() }),
    request("/admin/finance/settlements", { headers: adminHeaders() })
  ]);

  if (!Array.isArray(categories) || !categories.some((category) => category.id)) {
    fail("后台分类页依赖的分类接口没有返回数据");
  }

  const reconciliationItem = reconciliation.items?.find((item) => item.orderId === context.orderId);
  if (!reconciliationItem || reconciliation.pendingAmount <= 0) {
    fail("商家对账中心没有汇总已完成订单");
  }

  if (
    settlements.completedOrderCount < 1 ||
    !settlements.settlements?.some((item) => item.amount > 0)
  ) {
    fail("后台结算管理没有生成模拟结算汇总");
  }

  step("商家对账、后台分类和后台结算均读取真实接口数据");
}

async function cleanup() {
  if (context.originalStoreSettings) {
    await request("/merchant/store/settings", {
      method: "POST",
      headers: merchantHeaders(),
      body: JSON.stringify(context.originalStoreSettings)
    }).catch(() => undefined);
  }

  if (keepData) {
    console.log("保留 smoke 数据，可在三端页面继续查看。");
    return;
  }

  if (context.orderId) {
    const commissionIds = (
      await prisma.commissionRecord.findMany({
        where: { orderId: context.orderId },
        select: { id: true }
      })
    ).map((item) => item.id);
    await prisma.settlementItem.deleteMany({
      where: {
        OR: [{ orderId: context.orderId }, { commissionId: { in: commissionIds } }]
      }
    });
    await prisma.commissionRecord.deleteMany({ where: { orderId: context.orderId } });
    await prisma.riskEvent.deleteMany({ where: { orderId: context.orderId } });
    await prisma.storeTransferLog.deleteMany({ where: { orderId: context.orderId } });
    await prisma.orderItem.deleteMany({ where: { orderId: context.orderId } });
    await prisma.order.deleteMany({ where: { id: context.orderId } });
  }

  if (context.skuId) {
    await prisma.storeSku.deleteMany({ where: { skuId: context.skuId } });
    await prisma.sku.deleteMany({ where: { id: context.skuId } });
  }
  if (context.productId) {
    await prisma.product.deleteMany({ where: { id: context.productId } });
  }
}

async function main() {
  console.log(`金闪送数据互通 smoke test: ${baseUrl}`);
  await loginUser();
  await loginMerchant();
  await loginAdmin();
  await assertMerchantSettingsCanPersist();
  await createMerchantProduct();
  await assertPendingProductHiddenFromUser();
  await approveProductAndAssertVisible();
  await createAndPayOrder();
  await assertPaymentReservedStock();
  await assertMerchantSeesPendingOrder();
  await completeMerchantOrder();
  await assertAdminAndUserRecords();
  await assertOperationalPagesUseRealData();
  console.log("数据互通闭环验证通过。");
}

main()
  .catch((error) => {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } finally {
      await prisma.$disconnect();
    }
  });
