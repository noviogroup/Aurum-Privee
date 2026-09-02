import crypto from "node:crypto";

const obviousPlaceholder = /(?:replace(?:_|-)?(?:me|with)|change(?:_|-)?me|yourdomain\.com|^(?:secret|password|test|testing|development|dev|changeme)$)/i;

export function isConfiguredSecret(value: string | undefined | null): value is string {
  if (!value) return false;
  return !obviousPlaceholder.test(value.trim());
}

export function isStrongSecret(value: string | undefined | null, minimumLength = 32): value is string {
  return Boolean(isConfiguredSecret(value) && value.trim().length >= minimumLength);
}

export function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function hasBearerSecret(request: Request, secret: string | undefined) {
  if (!isStrongSecret(secret)) return false;
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  return timingSafeEqual(authorization.slice(7), secret);
}
