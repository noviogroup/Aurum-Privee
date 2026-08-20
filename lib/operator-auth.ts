import crypto from "node:crypto";
import { isStrongSecret, timingSafeEqual } from "@/lib/env";

const sessionVersion = 1;
export const operatorSessionMaxAge = 60 * 60 * 8;

type OperatorSessionPayload = {
  v: number;
  exp: number;
  nonce: string;
};

function signingSecret() {
  const secret = process.env.OPERATIONS_SESSION_SECRET;
  return isStrongSecret(secret) ? secret : null;
}

export function operatorCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-aurum_privee_ops" : "aurum_privee_ops";
}

export function createOperatorSession(now = Date.now()) {
  const secret = signingSecret();
  if (!secret) return null;
  const payload: OperatorSessionPayload = {
    v: sessionVersion,
    exp: Math.floor(now / 1000) + operatorSessionMaxAge,
    nonce: crypto.randomBytes(16).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyOperatorSession(token: string | undefined | null, now = Date.now()) {
  const secret = signingSecret();
  if (!secret || !token || token.length > 512) return false;
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return false;
  const expectedSignature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  if (!timingSafeEqual(suppliedSignature, expectedSignature)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OperatorSessionPayload;
    return payload.v === sessionVersion
      && Number.isInteger(payload.exp)
      && payload.exp > Math.floor(now / 1000)
      && payload.exp <= Math.floor(now / 1000) + operatorSessionMaxAge + 60
      && typeof payload.nonce === "string"
      && payload.nonce.length >= 16;
  } catch {
    return false;
  }
}

export function verifyOperatorPassword(password: string) {
  const configured = process.env.OPERATIONS_PASSWORD;
  return Boolean(isStrongSecret(configured, 12) && password.length <= 256 && timingSafeEqual(password, configured));
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url);
    if (originUrl.origin === expected.origin) return true;
    if (process.env.NODE_ENV !== "production") return originUrl.host === new URL(request.url).host;
    return false;
  } catch {
    return false;
  }
}
