import { API_BASE_URL } from "../config/api";

const MERCHANT_TOKEN_KEY = "jss_merchant_token";
const MERCHANT_STORE_CODE_KEY = "jss_merchant_store_code";
const MERCHANT_STORE_KEY = "jss_merchant_store";
const MERCHANT_STORES_KEY = "jss_merchant_stores";
const DEFAULT_STORE_CODE = "FZ-TAIJIANG-001";

export interface MerchantOrder {
  id: string;
  orderNo: string;
  status: string;
  statusCode: string;
  customer: string;
  phone: string;
  address: string;
  productName: string;
  skuName: string;
  quantity: number;
  amount: number;
  payableAmount: number;
  goodsAmount: number;
  distance: string;
  countdownSeconds: number;
  inventoryReservedAt?: string | null;
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
  logs?: {
    id: string;
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    operatorType: string;
    message?: string | null;
    createdAt: string;
  }[];
  riderNo: string;
  storeName: string;
  createdAt: string;
}

export interface MerchantStats {
  pending: number;
  todayOrders: number;
  waitingShipment: number;
  pendingSettlement: number;
}

export interface MerchantReconciliation {
  period: string;
  store: { id: string; code: string; name: string };
  pendingAmount: number;
  settledAmount: number;
  weeklyOrderCount: number;
  goodsAmount: number;
  weeklyCommission: number;
  withdrawal?: {
    availableAmount: number;
    pendingReviewAmount: number;
    approvedAmount: number;
    paidAmount: number;
    canApply: boolean;
    latest?: {
      id: string;
      amount: number;
      status: string;
      statusText: string;
      createdAt: string;
      settleTime?: string | null;
    } | null;
  };
  items: {
    orderId: string;
    orderNo: string;
    date: string;
    productName: string;
    goodsAmount: number;
    storeSettleAmount: number;
    storeCommission: number;
    amount: number;
    status: string;
  }[];
}

export interface MerchantStore {
  id: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  status: string;
  acceptOrderSwitch: boolean;
  autoTransferSwitch: boolean;
  voiceReminderSwitch: boolean;
  businessHours: string;
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
}

export interface StoreApplication {
  id: string;
  applicantName: string;
  applicantPhone: string;
  storeName: string;
  city: string;
  district: string;
  address: string;
  businessLicenseNo: string;
  businessLicenseImageUrl: string;
  storefrontImageUrl: string;
  categoryNote: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  statusText: string;
  reviewRemark: string;
  reviewedAt?: string | null;
  storeId?: string | null;
  storeCode?: string;
  createdAt: string;
  updatedAt: string;
}

export type StoreApplicationPayload = {
  applicantName: string;
  applicantPhone: string;
  storeName: string;
  city?: string;
  district: string;
  address: string;
  businessLicenseNo?: string;
  businessLicenseImageUrl?: string;
  storefrontImageUrl?: string;
  categoryNote?: string;
};

export interface MerchantLoginResult {
  canLogin: boolean;
  message?: string;
  loginMode?: "mock" | "real";
  openId?: string;
  token?: string;
  store?: MerchantStore;
  stores?: MerchantStore[];
  application?: StoreApplication | null;
}

export interface MerchantCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface MerchantProduct {
  id: string;
  storeSkuId: string;
  productId: string;
  skuId: string;
  name: string;
  skuName: string;
  categoryId?: string | null;
  categoryName: string;
  description: string;
  salePrice: number;
  settlePrice: number;
  grossMargin?: number;
  stock: number;
  status: "ON_SALE" | "OFF_SALE";
  reviewStatus: "PENDING" | "APPROVED" | "REJECTED";
  reviewStatusText: string;
  reviewRemark: string;
  visibleToUser: boolean;
  available: boolean;
  visibilityIssues?: string[];
  visibilityStatusText?: string;
  coverUrl: string;
  skuImageUrl?: string;
  detailImageUrls: string[];
  imageTone: string;
}

export type MerchantSkuPayload = {
  skuName?: string;
  salePrice?: number;
  settlePrice?: number;
  stock?: number;
  imageUrl?: string;
};

export type MerchantProductPayload = {
  categoryId?: string;
  name: string;
  skuName?: string;
  description?: string;
  salePrice: number;
  settlePrice?: number;
  stock: number;
  imageUrl?: string;
  skus?: MerchantSkuPayload[];
  coverUrl?: string;
  detailImageUrls?: string[];
};

export type MerchantProductUpdatePayload = {
  stock?: number;
  salePrice?: number;
  settlePrice?: number;
  skuName?: string;
  description?: string;
  imageUrl?: string;
  coverUrl?: string;
  detailImageUrls?: string[];
  status?: "ON_SALE" | "OFF_SALE";
};

export interface UploadResult {
  id?: string;
  url: string;
  path: string;
  fileName: string;
  size: number;
  scene?: string;
  storageDriver?: string;
}

export interface MerchantSession {
  token: string;
  store: MerchantStore;
  stores?: MerchantStore[];
}

export type WechatMerchantLoginPayload = {
  code?: string;
  phoneCode?: string;
  phone?: string;
};

export type WechatPhoneResult = {
  phone: string;
  loginMode?: "mock" | "real";
};

function getStorageString(key: string) {
  const value = uni.getStorageSync(key);
  return typeof value === "string" ? value : "";
}

export function getMerchantStoreCode() {
  return getStorageString(MERCHANT_STORE_CODE_KEY);
}

export function getMerchantToken() {
  return getStorageString(MERCHANT_TOKEN_KEY);
}

function authHeaders() {
  const token = getMerchantToken();
  const storeCode = getMerchantStoreCode();
  return {
    ...(storeCode ? { "x-store-code": storeCode } : {}),
    ...(token ? { "x-merchant-token": token } : {})
  };
}

export function clearMerchantStoreContext() {
  uni.removeStorageSync(MERCHANT_STORE_CODE_KEY);
  uni.removeStorageSync(MERCHANT_STORE_KEY);
  uni.removeStorageSync(MERCHANT_STORES_KEY);
}

export function saveMerchantSession(session: MerchantSession) {
  uni.setStorageSync(MERCHANT_TOKEN_KEY, session.token);
  uni.setStorageSync(MERCHANT_STORE_CODE_KEY, session.store.code);
  uni.setStorageSync(MERCHANT_STORE_KEY, session.store);
  saveCachedMerchantStores(session.stores?.length ? session.stores : [session.store]);
}

type MerchantRequestOptions = {
  method?: "GET" | "POST";
  data?: unknown;
  _retryingAfterStoreMismatch?: boolean;
};

export function saveCachedMerchantStore(store: MerchantStore) {
  uni.setStorageSync(MERCHANT_STORE_CODE_KEY, store.code);
  uni.setStorageSync(MERCHANT_STORE_KEY, store);
}

export function saveCachedMerchantStores(stores: MerchantStore[]) {
  uni.setStorageSync(MERCHANT_STORES_KEY, stores);
}

export function getCachedMerchantStore() {
  const store = uni.getStorageSync(MERCHANT_STORE_KEY);
  return store && typeof store === "object" ? (store as MerchantStore) : null;
}

export function getCachedMerchantStores() {
  const stores = uni.getStorageSync(MERCHANT_STORES_KEY);
  return Array.isArray(stores) ? (stores as MerchantStore[]) : [];
}

export function clearMerchantSession() {
  uni.removeStorageSync(MERCHANT_TOKEN_KEY);
  uni.removeStorageSync(MERCHANT_STORE_CODE_KEY);
  uni.removeStorageSync(MERCHANT_STORE_KEY);
  uni.removeStorageSync(MERCHANT_STORES_KEY);
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function responseMessage(data: unknown) {
  if (typeof data === "string") {
    return data;
  }
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (Array.isArray(message)) {
      return message.join("，");
    }
    if (typeof message === "string") {
      return message;
    }
  }
  return "接口请求失败";
}

function ensureMerchantLoginPage() {
  const pages = getCurrentPages();
  const currentRoute = pages[pages.length - 1]?.route ?? "";
  if (currentRoute && currentRoute.indexOf("pages/login/index") >= 0) {
    return;
  }
  uni.reLaunch({ url: "/pages/login/index" });
}

export function request<T>(
  path: string,
  options: MerchantRequestOptions = {}
) {
  const retrying = Boolean(options._retryingAfterStoreMismatch);
  return new Promise<T>((resolve, reject) => {
    const headers = authHeaders();
    const requestStoreCode = "x-store-code" in headers;
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method: options.method ?? "GET",
      data: options.data as Record<string, unknown> | string | ArrayBuffer | undefined,
      header: {
        "content-type": "application/json",
        ...headers
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T);
          return;
        }

        if (
          !retrying &&
          requestStoreCode &&
          (response.statusCode === 401 || response.statusCode === 403) &&
          Boolean(response.data)
        ) {
          clearMerchantStoreContext();
          void request<T>(path, {
            ...options,
            _retryingAfterStoreMismatch: true
          }).then(resolve).catch(reject);
          return;
        }

        if ((response.statusCode === 401 || response.statusCode === 403) && getMerchantToken()) {
          if (!retrying && requestStoreCode) {
            clearMerchantStoreContext();
          } else {
            clearMerchantSession();
            if (responseMessage(response.data) !== "请先登录商户端") {
              ensureMerchantLoginPage();
            }
          }
        }
        reject(new ApiRequestError(responseMessage(response.data), response.statusCode));
      },
      fail(error) {
        reject(error);
      }
    });
  });
}

function parseUploadResponse(data: unknown) {
  if (typeof data === "string") {
    return JSON.parse(data) as UploadResult;
  }
  return data as UploadResult;
}

function uploadFile<T>(
  path: string,
  filePath: string,
  formData: Record<string, string> = {},
  withAuth = true
) {
  return new Promise<T>((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}${path}`,
      filePath,
      name: "file",
      formData,
      header: withAuth ? authHeaders() : {},
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          try {
            resolve(parseUploadResponse(response.data) as T);
          } catch (error) {
            reject(error);
          }
          return;
        }
        reject(new ApiRequestError(response.data || "图片上传失败", response.statusCode));
      },
      fail(error) {
        reject(error);
      }
    });
  });
}

export const api = {
  mockLogin: (storeCode = DEFAULT_STORE_CODE) =>
    request<MerchantSession>("/auth/merchant/mock-login", { method: "POST", data: { storeCode } }),
  wechatLogin: (data: WechatMerchantLoginPayload) =>
    request<MerchantLoginResult>("/auth/merchant/wechat-login", { method: "POST", data }),
  wechatPhone: (data: { phoneCode?: string; phone?: string }) =>
    request<WechatPhoneResult>("/auth/merchant/wechat-phone", { method: "POST", data }),
  apply: (data: StoreApplicationPayload) =>
    request<StoreApplication>("/auth/merchant/apply", { method: "POST", data }),
  stores: () => request<MerchantStore[]>("/auth/merchant/stores"),
  applications: () => request<StoreApplication[]>("/auth/merchant/applications"),
  switchStore: (storeCode: string) =>
    request<MerchantSession>("/auth/merchant/switch-store", {
      method: "POST",
      data: { storeCode }
    }),
  applicationStatus: (phone: string) =>
    request<StoreApplication | null>("/auth/merchant/application-status", {
      method: "POST",
      data: { phone }
    }),
  me: () => request<MerchantStore>("/merchant/store/settings"),
  categories: () => request<MerchantCategory[]>("/categories"),
  products: () => request<MerchantProduct[]>("/merchant/products"),
  reconciliation: () => request<MerchantReconciliation>("/merchant/reconciliation"),
  applyWithdrawal: () =>
    request<MerchantReconciliation>("/merchant/withdrawals", { method: "POST" }),
  updateStoreSettings: (data: {
    acceptOrderSwitch?: boolean;
    autoTransferSwitch?: boolean;
    voiceReminderSwitch?: boolean;
  }) => request<MerchantStore>("/merchant/store/settings", { method: "POST", data }),
  uploadImage: (data: { fileName?: string; dataUrl: string }) =>
    request<UploadResult>("/merchant/uploads/images", { method: "POST", data }),
  uploadImageFile: (filePath: string, scene = "product") =>
    uploadFile<UploadResult>("/merchant/uploads/images/file", filePath, { scene }),
  uploadApplicationImage: (data: {
    fileName?: string;
    dataUrl: string;
    scene?: string;
    ownerPhone?: string;
  }) => request<UploadResult>("/auth/merchant/uploads/images", { method: "POST", data }),
  uploadApplicationImageFile: (filePath: string, scene: string, ownerPhone?: string) =>
    uploadFile<UploadResult>(
      "/auth/merchant/uploads/images/file",
      filePath,
      { scene, ownerPhone: ownerPhone ?? "" },
      false
    ),
  createProduct: (data: MerchantProductPayload) =>
    request<MerchantProduct>("/merchant/products", { method: "POST", data }),
  updateProduct: (storeSkuId: string, data: MerchantProductUpdatePayload) =>
    request<MerchantProduct>(`/merchant/products/${storeSkuId}/update`, { method: "POST", data }),
  pendingOrders: () => request<MerchantOrder[]>("/merchant/orders/pending"),
  orders: () => request<MerchantOrder[]>("/merchant/orders"),
  stats: () => request<MerchantStats>("/merchant/stats"),
  order: (id: string) => request<MerchantOrder>(`/merchant/orders/${id}`),
  action: (id: string, action: "accept" | "reject" | "ready" | "pickup" | "complete") =>
    request<MerchantOrder>(`/merchant/orders/${id}/actions/${action}`, { method: "POST" }),
  retryDelivery: (id: string) =>
    request<MerchantOrder>(`/merchant/orders/${id}/delivery/retry`, { method: "POST" })
};
