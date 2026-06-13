let rawBaseUrl = "";

rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

// #ifdef MP-WEIXIN
rawBaseUrl = import.meta.env.VITE_MP_API_BASE_URL || rawBaseUrl;
// #endif

if (!rawBaseUrl) {
  // #ifdef MP-WEIXIN
  rawBaseUrl = "https://api.jssbuy.cn";
  // #endif
  // #ifndef MP-WEIXIN
  rawBaseUrl = "http://localhost:3001";
  // #endif
}

export const API_BASE_URL = rawBaseUrl.endsWith("/api") ? rawBaseUrl : `${rawBaseUrl}/api`;
