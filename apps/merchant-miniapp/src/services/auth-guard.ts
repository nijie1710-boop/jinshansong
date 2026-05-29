import { getMerchantToken } from "./api";

const PUBLIC_PAGE_PATHS = new Set(["/pages/login/index", "/pages/legal/index"]);
const TAB_PAGE_PATHS = new Set([
  "/pages/home/index",
  "/pages/order/list",
  "/pages/reconciliation/index",
  "/pages/product/manage",
  "/pages/settings/index"
]);

let guardInstalled = false;
let redirectingToLogin = false;

type PageLike = {
  route?: string;
  options?: Record<string, unknown>;
  $page?: {
    options?: Record<string, unknown>;
  };
};

type NavigationArgs = {
  url?: string;
};

function normalizeUrl(url: string) {
  return url.startsWith("/") ? url : `/${url}`;
}

function normalizePath(url: string) {
  return normalizeUrl(url).split("?")[0];
}

function stringifyQuery(options?: Record<string, unknown>) {
  if (!options) {
    return "";
  }

  return Object.entries(options)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}

function currentPageUrl() {
  const pages = getCurrentPages() as PageLike[];
  const currentPage = pages[pages.length - 1];
  if (!currentPage?.route) {
    return "/pages/home/index";
  }

  const path = normalizeUrl(currentPage.route);
  const query = stringifyQuery(currentPage.options || currentPage.$page?.options);
  return query ? `${path}?${query}` : path;
}

function loginUrl(redirectUrl: string) {
  const target = normalizeUrl(redirectUrl || "/pages/home/index");
  return `/pages/login/index?redirect=${encodeURIComponent(target)}`;
}

function isPublicPage(url: string) {
  return PUBLIC_PAGE_PATHS.has(normalizePath(url));
}

export function hasMerchantLogin() {
  return Boolean(getMerchantToken());
}

export function requireMerchantLogin(url = currentPageUrl()) {
  if (hasMerchantLogin() || isPublicPage(url)) {
    return true;
  }

  if (redirectingToLogin) {
    return false;
  }

  redirectingToLogin = true;
  uni.reLaunch({
    url: loginUrl(url),
    complete() {
      setTimeout(() => {
        redirectingToLogin = false;
      }, 300);
    }
  });
  return false;
}

export function resolveMerchantLoginRedirect(rawRedirect?: string) {
  if (!rawRedirect) {
    return "/pages/home/index";
  }

  let decoded = rawRedirect;
  for (let index = 0; index < 3; index += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        break;
      }
      decoded = next;
    } catch {
      break;
    }
  }

  const target = normalizeUrl(decoded || "/pages/home/index");
  return isPublicPage(target) ? "/pages/home/index" : target;
}

export function goAfterMerchantLogin(rawRedirect?: string) {
  const target = resolveMerchantLoginRedirect(rawRedirect);
  const path = normalizePath(target);

  if (TAB_PAGE_PATHS.has(path)) {
    uni.switchTab({ url: path });
    return;
  }

  uni.redirectTo({
    url: target,
    fail() {
      uni.reLaunch({ url: "/pages/home/index" });
    }
  });
}

export function installMerchantAuthGuard() {
  if (!guardInstalled) {
    guardInstalled = true;
    ["navigateTo", "redirectTo", "reLaunch", "switchTab"].forEach((method) => {
      uni.addInterceptor(method, {
        invoke(args: NavigationArgs) {
          return requireMerchantLogin(args.url || currentPageUrl());
        }
      });
    });
  }

  setTimeout(() => {
    requireMerchantLogin();
  }, 0);
}
