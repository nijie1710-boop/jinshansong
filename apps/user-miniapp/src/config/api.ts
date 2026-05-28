let rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

// #ifdef MP-WEIXIN
rawBaseUrl = import.meta.env.VITE_MP_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3001";
// #endif

export const API_BASE_URL = rawBaseUrl.endsWith("/api") ? rawBaseUrl : `${rawBaseUrl}/api`;
