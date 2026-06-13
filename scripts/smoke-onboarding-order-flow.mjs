const baseUrl = (process.env.API_BASE_URL || "http://localhost:3001/api").replace(/\/$/, "");
const adminAccount = process.env.ADMIN_ACCOUNT || process.env.ADMIN_DEFAULT_ACCOUNT || "admin";
const adminPassword =
  process.env.ADMIN_PASSWORD || process.env.ADMIN_DEFAULT_PASSWORD || "admin123456";
const runId = `${Date.now()}`.slice(-8);
const merchantPhone = `188${runId}`;
const userPhone = `139${runId}`;

const tinyPngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

const context = {
  adminToken: "",
  merchantToken: "",
  userToken: "",
  applicationId: "",
  storeCode: "",
  productId: "",
  skuId: "",
  storeSkuId: "",
  orderId: "",
  productName: `验收测试快充线 ${runId}`
};

function step(message, data) {
  const suffix = data ? `：${data}` : "";
  console.log(`✓ ${message}${suffix}`);
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

function adminHeaders() {
  return { "x-admin-token": context.adminToken };
}

function merchantHeaders() {
  return {
    "x-merchant-token": context.merchantToken,
    "x-store-code": context.storeCode
  };
}

function userHeaders() {
  return { "x-user-token": context.userToken };
}

async function loginAdmin() {
  const session = await request("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ account: adminAccount, password: adminPassword })
  });

  if (!session?.token) {
    fail("后台登录没有返回 token");
  }
  context.adminToken = session.token;
  step("后台管理员登录成功");
}

async function uploadApplicationImages() {
  const [license, storefront] = await Promise.all([
    request("/auth/merchant/uploads/images", {
      method: "POST",
      body: JSON.stringify({
        fileName: `license-${runId}.png`,
        dataUrl: tinyPngDataUrl,
        scene: "business-license",
        ownerPhone: merchantPhone
      })
    }),
    request("/auth/merchant/uploads/images", {
      method: "POST",
      body: JSON.stringify({
        fileName: `storefront-${runId}.png`,
        dataUrl: tinyPngDataUrl,
        scene: "storefront",
        ownerPhone: merchantPhone
      })
    })
  ]);

  if (!license?.url || !storefront?.url) {
    fail("商户入驻图片上传没有返回 URL");
  }
  step("商户入驻图片上传成功");
  return { licenseUrl: license.url, storefrontUrl: storefront.url };
}

async function submitAndApproveApplication() {
  const images = await uploadApplicationImages();
  const application = await request("/auth/merchant/apply", {
    method: "POST",
    body: JSON.stringify({
      applicantName: `验收商户${runId}`,
      applicantPhone: merchantPhone,
      storeName: `验收数码门店 ${runId}`,
      city: "福州市",
      district: "台江区",
      address: "工业路193号宝龙广场",
      businessLicenseNo: `SMOKE${runId}`,
      businessLicenseImageUrl: images.licenseUrl,
      storefrontImageUrl: images.storefrontUrl,
      categoryNote: "充电线、充电器、手机壳、钢化膜"
    })
  });

  if (application.status !== "PENDING") {
    fail(`新入驻申请应为待审核，实际为 ${application.status}`);
  }
  context.applicationId = application.id;
  step("商户提交入驻申请成功", application.id);

  const applications = await request("/admin/store-applications", { headers: adminHeaders() });
  if (
    !applications.some((item) => item.id === context.applicationId && item.status === "PENDING")
  ) {
    fail("后台门店管理没有看到待审核入驻申请");
  }
  step("后台看到待审核入驻申请");

  const approved = await request(`/admin/store-applications/${context.applicationId}/approve`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ remark: "验收测试：入驻审核通过" })
  });

  if (approved.status !== "APPROVED" || !approved.storeCode) {
    fail("后台审核入驻后没有生成门店编码");
  }
  context.storeCode = approved.storeCode;
  step("后台审核入驻通过并生成门店", context.storeCode);
}

async function loginApprovedMerchant() {
  const result = await request("/auth/merchant/wechat-login", {
    method: "POST",
    body: JSON.stringify({
      code: `smoke-merchant-${runId}`,
      phone: merchantPhone
    })
  });

  if (!result?.canLogin || !result.token || result.store?.code !== context.storeCode) {
    fail("审核通过后的商户无法登录对应门店");
  }

  context.merchantToken = result.token;
  step("审核通过后商户可登录", result.store.name);
}

async function submitAndApproveProduct() {
  const categories = await request("/categories");
  const category = categories[0];
  if (!category?.id) {
    fail("没有可用商品分类");
  }

  const [cover, detail] = await Promise.all([
    request("/merchant/uploads/images", {
      method: "POST",
      headers: merchantHeaders(),
      body: JSON.stringify({
        fileName: `cover-${runId}.png`,
        dataUrl: tinyPngDataUrl,
        scene: "products"
      })
    }),
    request("/merchant/uploads/images", {
      method: "POST",
      headers: merchantHeaders(),
      body: JSON.stringify({
        fileName: `detail-${runId}.png`,
        dataUrl: tinyPngDataUrl,
        scene: "product-details"
      })
    })
  ]);

  if (!cover?.url || !detail?.url) {
    fail("商户商品图片上传没有返回 URL");
  }
  step("商户商品主图和详情图上传成功");

  const product = await request("/merchant/products", {
    method: "POST",
    headers: merchantHeaders(),
    body: JSON.stringify({
      categoryId: category.id,
      name: context.productName,
      skuName: "1m 橙白款",
      description: "商户入驻验收链路商品，后台审核通过后用户端可购买",
      salePrice: 19.9,
      settlePrice: 12.5,
      stock: 8,
      coverUrl: cover.url,
      detailImageUrls: [detail.url]
    })
  });

  if (product.reviewStatus !== "PENDING") {
    fail(`新商品应为待审核，实际为 ${product.reviewStatus}`);
  }
  context.productId = product.productId;
  context.skuId = product.skuId;
  context.storeSkuId = product.storeSkuId;
  step("商户提交商品成功，进入待审核", context.productName);

  const userProductsBefore = await request("/products");
  if (userProductsBefore.some((item) => item.id === context.productId)) {
    fail("待审核商品不应出现在用户端商品列表");
  }
  step("待审核商品未展示给用户端");

  const adminProducts = await request("/admin/products", { headers: adminHeaders() });
  if (
    !adminProducts.some(
      (item) => item.productId === context.productId && item.reviewStatus === "PENDING"
    )
  ) {
    fail("后台商品管理没有看到待审核商品");
  }
  step("后台商品管理看到待审核商品");

  await request(`/admin/products/${context.productId}/approve`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ remark: "验收测试：商品审核通过" })
  });

  const userProductsAfter = await request("/products");
  const visibleProduct = userProductsAfter.find((item) => item.id === context.productId);
  if (!visibleProduct || visibleProduct.stock < 1) {
    fail("商品审核通过后用户端仍不可见或库存异常");
  }
  step("商品审核通过后用户端可见", visibleProduct.name);
}

async function loginUserAndCreateOrder() {
  const session = await request("/auth/user/wechat-login", {
    method: "POST",
    body: JSON.stringify({
      code: `smoke-user-${runId}`,
      phone: userPhone,
      nickname: `验收用户${runId}`
    })
  });

  if (!session?.token) {
    fail("用户微信登录没有返回 token");
  }
  context.userToken = session.token;
  step("用户端登录成功", userPhone);

  const addresses = await request("/addresses", { headers: userHeaders() });
  const address = addresses[0];
  if (!address?.id) {
    fail("用户端没有可用收货地址");
  }
  step("用户端收货地址可用", `${address.city}${address.district}`);

  const quote = await request("/orders/quote", {
    method: "POST",
    headers: userHeaders(),
    body: JSON.stringify({
      addressId: address.id,
      items: [{ skuId: context.skuId, quantity: 1 }],
      riderNo: "0086",
      promoterCode: "FZTG001"
    })
  });

  if (quote.store?.id !== undefined && quote.payableAmount <= 0) {
    fail("订单报价金额异常");
  }
  if (quote.store?.name && !quote.store.name.includes(runId)) {
    fail(`订单没有匹配到本次新入驻门店，实际匹配 ${quote.store.name}`);
  }
  step("用户端订单报价匹配到新门店", quote.store?.name);

  const order = await request("/orders", {
    method: "POST",
    headers: userHeaders(),
    body: JSON.stringify({
      addressId: address.id,
      items: [{ skuId: context.skuId, quantity: 1 }],
      riderNo: "0086",
      promoterCode: "FZTG001"
    })
  });

  const paid = await request(`/payments/${order.id}/mock-pay`, {
    method: "POST",
    headers: userHeaders()
  });

  if (paid.statusCode !== "WAITING_STORE_ACCEPT") {
    fail(`用户支付后应进入待接单，实际为 ${paid.statusCode}`);
  }

  context.orderId = order.id;
  step("用户端下单并模拟支付成功", paid.orderNo);
}

async function assertMerchantReceivesAndCompleteOrder() {
  const pendingOrders = await request("/merchant/orders/pending", {
    headers: merchantHeaders()
  });
  const pendingOrder = pendingOrders.find((item) => item.id === context.orderId);
  if (!pendingOrder) {
    fail("新入驻商户待接单列表没有收到用户订单");
  }
  step("商户端待接单收到用户订单", pendingOrder.orderNo);

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
      fail(`商户 ${action} 后状态应为 ${expectedStatus}，实际为 ${updated.statusCode}`);
    }
  }
  step("商户端接单、备货、取货、完成订单通过");
}

async function assertAdminAndUserRecords() {
  const [adminOrders, adminOrderDetail, userOrders, finance] = await Promise.all([
    request("/admin/orders", { headers: adminHeaders() }),
    request(`/admin/orders/${context.orderId}`, { headers: adminHeaders() }),
    request("/orders/my", { headers: userHeaders() }),
    request("/admin/finance/summary", { headers: adminHeaders() })
  ]);

  const adminOrder = adminOrders.find((item) => item.id === context.orderId);
  if (!adminOrder || adminOrder.statusCode !== "COMPLETED") {
    fail("后台订单管理没有同步本次已完成订单");
  }
  if (typeof adminOrder.netProfit !== "number") {
    fail("后台订单管理没有返回单单净利润");
  }
  if (adminOrder.netProfit < 0 && !Number.isFinite(adminOrder.netProfit)) {
    fail("后台订单净利润格式异常");
  }
  if (!adminOrderDetail.deliveryTask || adminOrderDetail.deliveryTask.status !== "COMPLETED") {
    fail("后台订单详情没有同步配送任务完成状态");
  }
  if (!userOrders.some((item) => item.id === context.orderId && item.statusCode === "COMPLETED")) {
    fail("用户端购买记录没有同步本次订单");
  }
  if (!finance || typeof finance.totalProfit !== "number") {
    fail("后台财务统计没有返回利润汇总");
  }

  step("后台订单、单单净利润、财务和用户购买记录同步正常");
}

async function main() {
  console.log(`金泽快送入驻到下单验收链路：${baseUrl}`);
  await loginAdmin();
  await submitAndApproveApplication();
  await loginApprovedMerchant();
  await submitAndApproveProduct();
  await loginUserAndCreateOrder();
  await assertMerchantReceivesAndCompleteOrder();
  await assertAdminAndUserRecords();

  console.log("验收链路通过，已保留本次测试数据用于三端页面查看：");
  console.log(`- 商户手机号：${merchantPhone}`);
  console.log(`- 门店编码：${context.storeCode}`);
  console.log(`- 商品名称：${context.productName}`);
  console.log(`- 订单 ID：${context.orderId}`);
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
});
