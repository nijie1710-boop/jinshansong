import { cookies } from "next/headers";

const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
const API_BASE_URL = rawBaseUrl.endsWith("/api") ? rawBaseUrl : `${rawBaseUrl}/api`;

export interface AdminOrder {
  id: string;
  orderNo: string;
  user: string;
  phone: string;
  storeName?: string;
  store?: string;
  status: string;
  statusCode: string;
  payStatus?: string;
  payableAmount: number;
  transferCount: number;
  rejectCount: number;
  netProfit: number;
  platformIncome: number;
  storeSettleAmount: number;
  deliveryFeeCost: number;
  deliveryFeeCharged?: number;
  storeCommission: number;
  riderBonus: number;
  promoterCommission: number;
  userDiscountAmount: number;
  goodsAmount?: number;
  riderNo?: string;
  promoterCode?: string | null;
  address?: string;
  receiver?: string;
  storePhone?: string;
  storeAddress?: string;
  paidAt?: string | null;
  acceptedAt?: string | null;
  readyAt?: string | null;
  pickedUpAt?: string | null;
  completedAt?: string | null;
  refundedAt?: string | null;
  inventoryReservedAt?: string | null;
  items?: {
    id: string;
    productName: string;
    skuName: string;
    quantity: number;
    salePrice: number;
    settlePrice: number;
  }[];
  logs?: {
    id: string;
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    operatorType: string;
    operatorId?: string | null;
    message?: string | null;
    createdAt: string;
  }[];
  paymentRecords?: {
    id: string;
    type: "PAYMENT" | "REFUND";
    channel: string;
    outTradeNo: string;
    transactionNo?: string | null;
    amount: number;
    status: "PENDING" | "SUCCESS" | "FAILED";
    createdAt: string;
    completedAt?: string | null;
  }[];
  deliveryTask?: {
    id: string;
    provider: string;
    providerName?: string;
    providerOrderNo?: string | null;
    status: string;
    statusText: string;
    riderNo?: string | null;
    riderName?: string | null;
    riderPhone?: string | null;
    fee: number;
    distanceKm?: number | null;
    failReason?: string | null;
    dispatchedAt?: string | null;
    acceptedAt?: string | null;
    readyNotifiedAt?: string | null;
    pickedUpAt?: string | null;
    completedAt?: string | null;
    cancelledAt?: string | null;
  } | null;
  createdAt: string;
}

export interface FinanceSummary {
  totalIncome: number;
  totalCost: number;
  totalProfit: number;
  orderCount: number;
  negativeOrders: number;
  roleCosts: { role: string; amount: number }[];
  daily: { date: string; income: number; profit: number }[];
}

export interface DashboardSummary {
  todayOrders: number;
  todaySales: number;
  todayProfit: number;
  negativeOrders: number;
  pendingOrders: number;
  orderTrend: number[];
  profitTrend: number[];
  productRanks: { rank: number; name: string; sales: number }[];
  recentOrders: AdminOrder[];
  storeRanks: { name: string; orders: number; acceptRate: string }[];
}

export interface AdminProduct {
  id: string;
  productId?: string;
  skuId: string;
  storeSkuId?: string;
  name: string;
  categoryId?: string | null;
  categoryName?: string;
  price: number;
  originPrice: number;
  settlePrice: number;
  sales: number;
  stock: number;
  tags: string[];
  specs: string[];
  status?: "ON_SALE" | "OFF_SALE";
  reviewStatus?: "PENDING" | "APPROVED" | "REJECTED";
  reviewStatusText?: string;
  reviewRemark?: string;
  visibleToUser?: boolean;
  coverUrl?: string;
  detailImageUrls?: string[];
  storeNames?: string[];
  submittedAt?: string;
  updatedAt?: string;
  reviewedAt?: string | null;
  imageTone: string;
}

export interface AdminStore {
  id: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  status: string;
  statusText: string;
  acceptOrderSwitch: boolean;
  autoTransferSwitch: boolean;
  voiceReminderSwitch: boolean;
  weeklyOrderCount: number;
  weeklyCommission: number;
  orderCount: number;
  productCount: number;
  acceptRate: string;
  deliverySummary?: {
    status: string;
    statusText: string;
    readyForBusiness: boolean;
  };
  deliveryReadiness?: {
    provider: string;
    providerName: string;
    mode: "mock" | "http";
    enabled: boolean;
    storeEnabled: boolean;
    providerShopId: string;
    serviceCode: string;
    readyForMock: boolean;
    readyForHttp: boolean;
    readyForBusiness: boolean;
    status: string;
    statusText: string;
    missing: string[];
  }[];
  deliveryConfigs: {
    id: string;
    provider: string;
    providerName: string;
    providerShopId: string;
    enabled: boolean;
    serviceCode: string;
    contactName: string;
    contactPhone: string;
    remark: string;
    readiness?: {
      provider: string;
      providerName: string;
      mode: "mock" | "http";
      enabled: boolean;
      storeEnabled: boolean;
      providerShopId: string;
      serviceCode: string;
      readyForMock: boolean;
      readyForHttp: boolean;
      readyForBusiness: boolean;
      status: string;
      statusText: string;
      missing: string[];
    } | null;
  }[];
  createdAt: string;
}

export interface StoreApplicationEntry {
  id: string;
  applicantName: string;
  applicantPhone: string;
  storeName: string;
  city: string;
  district: string;
  address: string;
  businessLicenseNo: string;
  businessLicenseImageUrl?: string;
  storefrontImageUrl?: string;
  categoryNote: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  statusText: string;
  reviewRemark: string;
  reviewedAt?: string | null;
  storeId?: string | null;
  storeCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemConfigEntry {
  id: string;
  key: string;
  value: Record<string, unknown>;
  remark?: string | null;
  updatedAt: string;
}

export interface PromotionConfigEntry {
  id: string;
  code: string;
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface AdminRiskItem {
  id: string;
  target: string;
  label: string;
  level: "低" | "中" | "高";
  type: string;
  status: string;
  createdAt: string;
}

export interface AdminRiskGroups {
  users: AdminRiskItem[];
  orders: AdminRiskItem[];
  riders: AdminRiskItem[];
  promoters: AdminRiskItem[];
}

export interface AdminCategory {
  id: string;
  name: string;
  icon: string;
  iconRaw?: string;
  sort?: number;
  status?: "ENABLED" | "DISABLED";
  statusText?: string;
  count: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SettlementPreview {
  period: string;
  storePendingAmount: number;
  riderPendingAmount: number;
  promoterPendingAmount: number;
  totalPendingAmount: number;
  completedOrderCount: number;
  settlements: {
    type: string;
    target: string;
    period: string;
    amount: number;
    orderCount: number;
    status: string;
  }[];
}

const emptyFinanceSummary: FinanceSummary = {
  totalIncome: 0,
  totalCost: 0,
  totalProfit: 0,
  orderCount: 0,
  negativeOrders: 0,
  roleCosts: [
    { role: "门店结算", amount: 0 },
    { role: "配送成本", amount: 0 },
    { role: "门店佣金", amount: 0 },
    { role: "骑手奖励", amount: 0 },
    { role: "推广员佣金", amount: 0 },
    { role: "用户优惠", amount: 0 }
  ],
  daily: Array.from({ length: 7 }, (_, index) => ({
    date: `D${index + 1}`,
    income: 0,
    profit: 0
  }))
};

const emptyDashboardSummary: DashboardSummary = {
  todayOrders: 0,
  todaySales: 0,
  todayProfit: 0,
  negativeOrders: 0,
  pendingOrders: 0,
  orderTrend: Array.from({ length: 7 }, () => 0),
  profitTrend: Array.from({ length: 7 }, () => 0),
  productRanks: [],
  recentOrders: [],
  storeRanks: []
};

function emptyAdminOrder(id: string): AdminOrder {
  return {
    id,
    orderNo: id,
    user: "-",
    phone: "-",
    storeName: "-",
    status: "未读取",
    statusCode: "UNKNOWN",
    payStatus: "UNKNOWN",
    payableAmount: 0,
    transferCount: 0,
    rejectCount: 0,
    netProfit: 0,
    platformIncome: 0,
    storeSettleAmount: 0,
    deliveryFeeCost: 0,
    deliveryFeeCharged: 0,
    storeCommission: 0,
    riderBonus: 0,
    promoterCommission: 0,
    userDiscountAmount: 0,
    goodsAmount: 0,
    createdAt: new Date(0).toISOString(),
    items: [],
    logs: [],
    paymentRecords: [],
    deliveryTask: null
  };
}

async function adminHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get("jss_admin_token")?.value;

  return {
    ...(token ? { "x-admin-token": token } : {})
  };
}

async function apiGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      headers: await adminHeaders()
    });
    if (!response.ok) {
      return fallback;
    }
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

async function apiPatch<T>(path: string, data: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(await adminHeaders())
    },
    body: JSON.stringify(data),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${path}`);
  }

  return (await response.json()) as T;
}

async function apiPost<T>(path: string, data: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(await adminHeaders())
    },
    body: JSON.stringify(data),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${path}`);
  }

  return (await response.json()) as T;
}

export function getAdminOrders() {
  return apiGet<AdminOrder[]>("/admin/orders", []);
}

export function getAdminOrder(id: string) {
  return apiGet<AdminOrder>(`/admin/orders/${id}`, emptyAdminOrder(id));
}

export function getFinanceSummary() {
  return apiGet<FinanceSummary>("/admin/finance/summary", emptyFinanceSummary);
}

export function getDashboardSummary() {
  return apiGet<DashboardSummary>("/admin/dashboard", emptyDashboardSummary);
}

export function getAdminCategories() {
  return apiGet<AdminCategory[]>("/admin/categories", []);
}

export function createCategory(data: {
  name: string;
  icon?: string;
  sort?: number;
  status?: "ENABLED" | "DISABLED";
}) {
  return apiPost<AdminCategory[]>("/admin/categories", data);
}

export function updateCategory(
  id: string,
  data: {
    name?: string;
    icon?: string;
    sort?: number;
    status?: "ENABLED" | "DISABLED";
  }
) {
  return apiPatch<AdminCategory[]>(`/admin/categories/${id}`, data);
}

export function getSettlementPreview() {
  return apiGet<SettlementPreview>("/admin/finance/settlements", {
    period: "本周",
    storePendingAmount: 0,
    riderPendingAmount: 0,
    promoterPendingAmount: 0,
    totalPendingAmount: 0,
    completedOrderCount: 0,
    settlements: []
  });
}

export function getAdminProducts() {
  return apiGet<AdminProduct[]>("/admin/products", []);
}

export function approveProduct(productId: string, remark?: string) {
  return apiPost<AdminProduct[]>(`/admin/products/${productId}/approve`, { remark });
}

export function rejectProduct(productId: string, remark?: string) {
  return apiPost<AdminProduct[]>(`/admin/products/${productId}/reject`, { remark });
}

export function getAdminStores() {
  return apiGet<AdminStore[]>("/admin/stores", []);
}

export function updateStoreDeliveryProvider(
  storeId: string,
  provider: string,
  data: {
    providerShopId?: string;
    enabled?: boolean;
    serviceCode?: string;
    contactName?: string;
    contactPhone?: string;
    remark?: string;
  }
) {
  return apiPost<AdminStore["deliveryConfigs"][number]>(
    `/admin/stores/${storeId}/delivery-providers/${provider}`,
    data
  );
}

export function getStoreApplications() {
  return apiGet<StoreApplicationEntry[]>("/admin/store-applications", []);
}

export function approveStoreApplication(id: string, remark?: string) {
  return apiPost<StoreApplicationEntry>(`/admin/store-applications/${id}/approve`, { remark });
}

export function rejectStoreApplication(id: string, remark?: string) {
  return apiPost<StoreApplicationEntry>(`/admin/store-applications/${id}/reject`, { remark });
}

export function operateAdminOrder(
  id: string,
  action: "cancel" | "refund" | "force-complete",
  reason?: string
) {
  return apiPost<AdminOrder>(`/admin/orders/${id}/actions/${action}`, { reason });
}

export function getSystemConfigs() {
  return apiGet<SystemConfigEntry[]>("/admin/configs", [
    {
      id: "delivery",
      key: "delivery",
      value: { userDeliveryFee: 4, platformDeliveryCost: 4, freeDeliveryThreshold: 19 },
      remark: "配送费和平台配送成本配置",
      updatedAt: new Date().toISOString()
    },
    {
      id: "commission",
      key: "commission",
      value: {
        storeFixedCommission: 1,
        generalAgentRate: 0.03,
        riderBaseBonus: 1.5,
        riderStepCount: 10,
        riderStepBonus: 5,
        promoterCommission: 2
      },
      remark: "门店、骑手、推广员佣金配置",
      updatedAt: new Date().toISOString()
    },
    {
      id: "finance",
      key: "finance",
      value: { lossWarningThreshold: 0 },
      remark: "财务预警配置",
      updatedAt: new Date().toISOString()
    },
    {
      id: "order_flow",
      key: "order_flow",
      value: { storeAcceptTimeoutMinutes: 3, rejectRefundThreshold: 2 },
      remark: "订单转单和拒单退款配置",
      updatedAt: new Date().toISOString()
    },
    {
      id: "delivery_aggregation",
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
            serviceCode: "4031",
            mockBaseFee: 5.8,
            mockEtaMinutes: 38
          },
          {
            code: "FENGNIAO",
            name: "蜂鸟即配",
            enabled: true,
            mode: "mock",
            serviceCode: "即时配送",
            mockBaseFee: 5.5,
            mockEtaMinutes: 42
          }
        ]
      },
      remark: "多平台即时配送配置",
      updatedAt: new Date().toISOString()
    }
  ]);
}

export function updateSystemConfig(key: string, value: Record<string, unknown>, remark?: string) {
  return apiPatch<SystemConfigEntry>(`/admin/configs/${key}`, { value, remark });
}

export function retryDelivery(orderId: string) {
  return apiPost<AdminOrder>(`/admin/delivery/${orderId}/retry`, {});
}

export function getPromotionConfigs() {
  return apiGet<PromotionConfigEntry[]>("/admin/promotions", [
    {
      id: "NEW_USER_FIRST_ORDER",
      code: "NEW_USER_FIRST_ORDER",
      name: "新人首单立减",
      type: "COUPON",
      enabled: true,
      config: { amount: 5, cityScope: ["福州市"], lifetimeLimit: 1 }
    },
    {
      id: "REFERRAL_COUPON",
      code: "REFERRAL_COUPON",
      name: "老带新奖励券",
      type: "COUPON",
      enabled: true,
      config: { amount: 2, validDays: 7, weeklyLimit: 3 }
    },
    {
      id: "ORDER_DISCOUNT",
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
    },
    {
      id: "FREE_DELIVERY",
      code: "FREE_DELIVERY",
      name: "满 19 元免配送费",
      type: "DELIVERY",
      enabled: true,
      config: { threshold: 19 }
    }
  ]);
}

export function updatePromotionConfig(
  code: string,
  data: {
    enabled?: boolean;
    config?: Record<string, unknown>;
    startsAt?: string | null;
    endsAt?: string | null;
  }
) {
  return apiPatch<PromotionConfigEntry>(`/admin/promotions/${code}`, data);
}

export function getRiskGroups() {
  return apiGet<AdminRiskGroups>("/admin/risk", {
    users: [],
    orders: [],
    riders: [],
    promoters: []
  });
}

export function resolveRiskEvent(id: string) {
  return apiPost<AdminRiskItem>(`/admin/risk/${id}/resolve`, {});
}

export function ignoreRiskEvent(id: string) {
  return apiPost<AdminRiskItem>(`/admin/risk/${id}/ignore`, {});
}
