import { API_BASE_URL } from "../config/api";

const USER_TOKEN_KEY = "jss_user_token";
const USER_PROFILE_KEY = "jss_user_profile";

export interface ApiProduct {
  id: string;
  skuId: string;
  slug?: string;
  name: string;
  categoryId?: string | null;
  categoryName?: string;
  price: number;
  originPrice: number;
  settlePrice: number;
  grossMargin?: number;
  sales: number;
  stock: number;
  storeCount?: number;
  tags: string[];
  specs: string[];
  color: string;
  description: string;
  coverUrl: string;
  detailImageUrls: string[];
  imageTone: string;
  storeNames?: string[];
  nearestStoreName?: string;
  nearestStoreDistanceKm?: number | null;
  deliveryEtaMinutes?: number;
  matchedByLocation?: boolean;
  serviceRadiusKm?: number;
  skus?: {
    id: string;
    name: string;
    imageUrl?: string;
    price: number;
    stock: number;
    nearestStoreName?: string | null;
    nearestStoreDistanceKm?: number | null;
  }[];
}

export interface ApiCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface ApiAddress {
  id: string;
  name: string;
  phone: string;
  city: string;
  district: string;
  detail: string;
  latitude?: string | null;
  longitude?: string | null;
  isDefault: boolean;
}

export type AddressPayload = {
  name: string;
  phone: string;
  city: string;
  district: string;
  detail: string;
  latitude?: string;
  longitude?: string;
  isDefault?: boolean;
};

export interface ApiQuote {
  store: { id: string; name: string };
  goodsAmount: number;
  deliveryFeeCharged: number;
  deliveryFeeCost?: number;
  userDiscountAmount: number;
  couponDiscount?: number;
  payableAmount: number;
  netProfit: number;
  selectedDelivery?: ApiDeliveryQuoteOption | null;
  deliveryOptions?: ApiDeliveryQuoteOption[];
}

export interface ApiDeliveryQuoteOption {
  provider: string;
  providerName: string;
  serviceCode?: string;
  mode: "mock" | "http";
  available: boolean;
  feeCost: number;
  userFee: number;
  estimatedMinutes: number;
  distanceKm: number;
  reason?: string;
}

export interface PublicConfig {
  serviceArea: {
    city: string;
    enabledDistricts: string[];
    note?: string;
  };
}

export interface ApiCoupon {
  id: string;
  title: string;
  type: string;
  amount: number;
  threshold: string;
  expires: string;
  status: "UNUSED" | "USED" | "EXPIRED" | "CANCELLED";
  statusText: string;
  usable: boolean;
  virtual: boolean;
}

export interface ApiOrder {
  id: string;
  orderNo: string;
  status: string;
  statusCode: string;
  payStatus: string;
  pickStatus: string;
  productName: string;
  skuName: string;
  quantity: number;
  goodsAmount: number;
  deliveryFeeCharged: number;
  userDiscountAmount: number;
  payableAmount: number;
  amount: number;
  netProfit: number;
  storeName: string;
  storePhone: string;
  storeAddress: string;
  riderNo: string;
  deliveryTask?: {
    provider?: string;
    providerName?: string;
    status?: string;
    statusText?: string;
    riderNo?: string | null;
    riderName?: string | null;
    riderPhone?: string | null;
  } | null;
  receiver: string;
  address: string;
  paidAt?: string | null;
  acceptedAt?: string | null;
  readyAt?: string | null;
  pickedUpAt?: string | null;
  completedAt?: string | null;
  refundedAt?: string | null;
  inventoryReservedAt?: string | null;
  logs?: {
    id: string;
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    operatorType: string;
    message?: string | null;
    createdAt: string;
  }[];
  createdAt: string;
  eta: string;
}

export interface UserProfile {
  id: string;
  nickname: string;
  phone: string;
  isNewUser: boolean;
  firstOrderStatus: string;
}

export interface UserSession {
  token: string;
  loginMode?: "mock" | "real";
  openId?: string;
  user: UserProfile;
}

export type WechatLoginPayload = {
  code?: string;
  phoneCode?: string;
  phone?: string;
  nickname?: string;
};

export interface WechatPaymentParams {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: "RSA";
  paySign: string;
}

export type PaymentStartResult =
  | {
      mode: "mock" | "paid";
      order: ApiOrder;
    }
  | {
      mode: "wechat";
      order: ApiOrder;
      outTradeNo: string;
      payment: WechatPaymentParams;
    };

export type ProductQuery = {
  keyword?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
};

export class ApiRequestError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
  }
}

function responseErrorMessage(data: unknown) {
  if (typeof data === "string") {
    return data;
  }
  if (data && typeof data === "object") {
    const record = data as { message?: unknown; error?: unknown };
    if (Array.isArray(record.message)) {
      return record.message.filter((item): item is string => typeof item === "string").join("，");
    }
    if (typeof record.message === "string") {
      return record.message;
    }
    if (typeof record.error === "string") {
      return record.error;
    }
  }
  return "接口请求失败";
}

function getStorageString(key: string) {
  const value = uni.getStorageSync(key);
  return typeof value === "string" ? value : "";
}

export function getUserToken() {
  return getStorageString(USER_TOKEN_KEY);
}

function authHeaders() {
  const token = getUserToken();
  return token ? { "x-user-token": token } : {};
}

export function saveUserSession(session: UserSession) {
  uni.setStorageSync(USER_TOKEN_KEY, session.token);
  uni.setStorageSync(USER_PROFILE_KEY, session.user);
}

export function saveCachedUserProfile(profile: UserProfile) {
  uni.setStorageSync(USER_PROFILE_KEY, profile);
}

export function getCachedUserProfile() {
  const profile = uni.getStorageSync(USER_PROFILE_KEY);
  return profile && typeof profile === "object" ? (profile as UserProfile) : null;
}

export function clearUserSession() {
  uni.removeStorageSync(USER_TOKEN_KEY);
  uni.removeStorageSync(USER_PROFILE_KEY);
}

export function request<T>(
  path: string,
  options: { method?: "GET" | "POST" | "DELETE"; data?: unknown } = {}
) {
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method: options.method ?? "GET",
      data: options.data as Record<string, unknown> | string | ArrayBuffer | undefined,
      header: {
        "content-type": "application/json",
        ...authHeaders()
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T);
          return;
        }
        reject(new ApiRequestError(responseErrorMessage(response.data), response.statusCode));
      },
      fail(error) {
        reject(error);
      }
    });
  });
}

function productQueryString(query: string | ProductQuery) {
  const params: string[] = [];
  const normalizedQuery = typeof query === "string" ? { keyword: query } : query;
  const keyword = normalizedQuery.keyword?.trim();

  if (keyword) {
    params.push(`keyword=${encodeURIComponent(keyword)}`);
  }
  if (Number.isFinite(normalizedQuery.latitude)) {
    params.push(`latitude=${encodeURIComponent(String(normalizedQuery.latitude))}`);
  }
  if (Number.isFinite(normalizedQuery.longitude)) {
    params.push(`longitude=${encodeURIComponent(String(normalizedQuery.longitude))}`);
  }
  if (Number.isFinite(normalizedQuery.radiusKm)) {
    params.push(`radiusKm=${encodeURIComponent(String(normalizedQuery.radiusKm))}`);
  }

  const value = params.join("&");
  return value ? `?${value}` : "";
}

export const api = {
  publicConfig: () => request<PublicConfig>("/config/public"),
  mockLogin: () => request<UserSession>("/auth/user/mock-login", { method: "POST" }),
  wechatLogin: (data: WechatLoginPayload) =>
    request<UserSession>("/auth/user/wechat-login", { method: "POST", data }),
  me: () => request<UserProfile>("/auth/user/me"),
  coupons: () => request<ApiCoupon[]>("/coupons"),
  claimReferralCoupon: () => request<ApiCoupon>("/coupons/referral/mock-claim", { method: "POST" }),
  categories: () => request<ApiCategory[]>("/categories"),
  products: (query: string | ProductQuery = "") =>
    request<ApiProduct[]>(`/products${productQueryString(query)}`),
  product: (id: string, query: ProductQuery = {}) =>
    request<ApiProduct>(`/products/${id}${productQueryString(query)}`),
  addresses: () => request<ApiAddress[]>("/addresses"),
  address: (id: string) => request<ApiAddress>(`/addresses/${id}`),
  createAddress: (data: AddressPayload) =>
    request<ApiAddress>("/addresses", { method: "POST", data }),
  updateAddress: (id: string, data: Partial<AddressPayload>) =>
    request<ApiAddress>(`/addresses/${id}/update`, { method: "POST", data }),
  setDefaultAddress: (id: string) =>
    request<ApiAddress>(`/addresses/${id}/default`, { method: "POST" }),
  deleteAddress: (id: string) =>
    request<{ success: boolean }>(`/addresses/${id}`, { method: "DELETE" }),
  quote: (data: {
    addressId?: string;
    items: { skuId: string; quantity: number }[];
    riderNo?: string;
    promoterCode?: string;
  }) => request<ApiQuote>("/orders/quote", { method: "POST", data }),
  createOrder: (data: {
    addressId?: string;
    items: { skuId: string; quantity: number }[];
    riderNo?: string;
    promoterCode?: string;
  }) => request<ApiOrder>("/orders", { method: "POST", data }),
  mockPay: (orderId: string) =>
    request<ApiOrder>(`/payments/${orderId}/mock-pay`, { method: "POST" }),
  wechatPay: (orderId: string) =>
    request<PaymentStartResult>(`/payments/${orderId}/wechat-jsapi`, { method: "POST" }),
  myOrders: () => request<ApiOrder[]>("/orders/my"),
  order: (id: string) => request<ApiOrder>(`/orders/${id}`)
};
