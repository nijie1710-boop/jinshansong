import { createHmac, timingSafeEqual } from "node:crypto";
import { UnauthorizedException } from "@nestjs/common";

export type SessionTokenType = "user" | "merchant" | "admin";

export interface SessionTokenPayload {
  type: SessionTokenType;
  sub: string;
  iat: number;
  exp: number;
  account?: string;
  role?: string;
  storeId?: string;
  storeCode?: string;
}

const TOKEN_PREFIX = "jss";

function tokenSecret() {
  return process.env.JWT_SECRET || "dev-only-change-me";
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function sign(encodedPayload: string) {
  return base64UrlEncode(createHmac("sha256", tokenSecret()).update(encodedPayload).digest());
}

export function createSessionToken(
  payload: Omit<SessionTokenPayload, "iat" | "exp">,
  ttlSeconds = 60 * 60 * 24 * 30
) {
  const now = Math.floor(Date.now() / 1000);
  const encodedPayload = base64UrlEncode(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + ttlSeconds
    })
  );

  return `${TOKEN_PREFIX}.${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(token: string, expectedType?: SessionTokenType) {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
    throw new UnauthorizedException("登录状态无效，请重新登录");
  }

  const [, encodedPayload, signature] = parts;
  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new UnauthorizedException("登录状态签名无效，请重新登录");
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionTokenPayload;
  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedException("登录状态已过期，请重新登录");
  }
  if (expectedType && payload.type !== expectedType) {
    throw new UnauthorizedException("登录身份不匹配");
  }

  return payload;
}
