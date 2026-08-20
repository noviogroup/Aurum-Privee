import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isStrongSecret } from "@/lib/env";

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body is too large");
    this.name = "RequestBodyTooLargeError";
  }
}

export async function readRequestText(request: Request, maximumBytes: number) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) throw new RequestBodyTooLargeError();
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maximumBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export async function readJsonBody<T>(request: Request, maximumBytes: number): Promise<T> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") throw new TypeError("Content-Type must be application/json");
  return JSON.parse(await readRequestText(request, maximumBytes)) as T;
}

export function requestFingerprint(request: Request) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!isStrongSecret(secret)) return null;
  const clientAddress = request.headers.get("x-nf-client-connection-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  return crypto.createHmac("sha256", secret).update(clientAddress).digest("hex");
}

export async function consumeRateLimit(input: {
  supabase: SupabaseClient;
  request: Request;
  scope: string;
  limit: number;
  windowSeconds: number;
  global?: boolean;
}) {
  const secret = process.env.RATE_LIMIT_SECRET;
  const keyHash = input.global && isStrongSecret(secret)
    ? crypto.createHmac("sha256", secret).update("global").digest("hex")
    : requestFingerprint(input.request);
  if (!keyHash) return { configured: false, allowed: false, keyHash: null, remaining: 0, retryAfter: input.windowSeconds };
  const { data, error } = await input.supabase.rpc("consume_rate_limit", {
    p_scope: input.scope,
    p_key_hash: keyHash,
    p_limit: input.limit,
    p_window_seconds: input.windowSeconds,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    configured: true,
    allowed: Boolean(row?.allowed),
    keyHash,
    remaining: Number(row?.remaining || 0),
    retryAfter: Math.max(1, Number(row?.retry_after_seconds || input.windowSeconds)),
  };
}
