import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  authenticateLoyverseWebhook,
  getLoyverseItem,
  getLoyverseInventoryLevel,
  LoyverseApiError,
  LoyverseItem,
} from "@/lib/loyverse";
import { normalizeLoyverseStock, syncLoyverseCatalog } from "@/lib/loyverse-sync";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isStrongSecret } from "@/lib/env";
import { readRequestText, RequestBodyTooLargeError } from "@/lib/request-security";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const uuid = z.string().uuid();
const payloadSchema = z.object({
  merchant_id: uuid,
  type: z.enum(["inventory_levels.update", "items.update"]),
  created_at: z.string().datetime().optional(),
  inventory_levels: z.array(z.object({ variant_id: uuid, store_id: uuid, in_stock: z.number().finite(), updated_at: z.string().datetime() }).strip()).max(100).optional(),
  items: z.array(z.object({ id: uuid }).passthrough()).max(25).optional(),
  item_id: uuid.optional(),
  item_ids: z.array(uuid).max(25).optional(),
  deleted_object_ids: z.array(uuid).max(25).optional(),
}).strip();
type LoyverseWebhookPayload = z.infer<typeof payloadSchema>;

async function syncItemUpdate(payload: LoyverseWebhookPayload, supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const notifiedIds = [...new Set([
    ...(payload.items || []).map((item) => item.id),
    ...(payload.item_ids || []),
    ...(payload.item_id ? [payload.item_id] : []),
    ...(payload.deleted_object_ids || []),
  ])].slice(0, 25);
  const deletedItemIds = new Set<string>();
  const items: LoyverseItem[] = [];
  for (let index = 0; index < notifiedIds.length; index += 5) {
    const batch = notifiedIds.slice(index, index + 5);
    const fetched = await Promise.allSettled(batch.map((id) => getLoyverseItem(id)));
    fetched.forEach((result, resultIndex) => {
      if (result.status === "fulfilled" && !result.value.deleted_at) items.push(result.value);
      else if (result.status === "fulfilled" && result.value.deleted_at) deletedItemIds.add(batch[resultIndex]);
      else if (result.status === "rejected" && result.reason instanceof LoyverseApiError && result.reason.status === 404) deletedItemIds.add(batch[resultIndex]);
    });
  }

  if (deletedItemIds.size) {
    const { error } = await supabase.from("products").update({ active: false, stock: 0, synced_at: new Date().toISOString() }).in("loyverse_item_id", [...deletedItemIds]);
    if (error) throw error;
  }

  if (items.length) return syncLoyverseCatalog({ supabase, items, deactivateMissing: false, source: "webhook" });
  return { total: 0, inserted: 0, updated: 0, deactivated: deletedItemIds.size, source: "webhook" };
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-loyverse-signature");
  const token = new URL(request.url).searchParams.get("token");
  const mode = process.env.LOYVERSE_WEBHOOK_AUTH_MODE || (process.env.LOYVERSE_CLIENT_SECRET ? "oauth" : "token");
  if (mode === "token" && (!isStrongSecret(process.env.LOYVERSE_WEBHOOK_TOKEN) || !token || token.length !== process.env.LOYVERSE_WEBHOOK_TOKEN.length)) {
    return NextResponse.json({ error: "Invalid Loyverse webhook authentication" }, { status: 401 });
  }
  let rawBody: string;
  try {
    rawBody = await readRequestText(request, 262_144);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Loyverse webhook body is too large" }, { status: 413 });
    return NextResponse.json({ error: "Loyverse webhook could not be read" }, { status: 400 });
  }
  if (!authenticateLoyverseWebhook(rawBody, signature, token)) {
    return NextResponse.json({ error: "Invalid Loyverse webhook authentication" }, { status: 401 });
  }

  const apiVersion = request.headers.get("x-loyverse-api-version");
  if (apiVersion && apiVersion !== "v1.0") {
    return NextResponse.json({ error: `Unsupported Loyverse API version: ${apiVersion}` }, { status: 400 });
  }

  let payload: LoyverseWebhookPayload;
  try {
    payload = payloadSchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
  if (!isStrongSecret(process.env.LOYVERSE_MERCHANT_ID, 32) || payload.merchant_id !== process.env.LOYVERSE_MERCHANT_ID) {
    return NextResponse.json({ error: "Webhook merchant does not match the approved account" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Catalog database is not configured" }, { status: 503 });
  const eventHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const { data: claimed, error: claimError } = await supabase.rpc("claim_loyverse_webhook_event", {
    p_event_hash: eventHash,
    p_event_type: payload.type,
    p_payload_created_at: payload.created_at || null,
  });
  if (claimError) return NextResponse.json({ error: "Webhook event claim failed" }, { status: 500 });
  if (!claimed) return NextResponse.json({ received: true, duplicate: true });

  try {
    if (payload.type === "inventory_levels.update" && payload.inventory_levels?.length) {
      const storeId = process.env.LOYVERSE_STORE_ID;
      if (!storeId) throw new Error("LOYVERSE_STORE_ID is required for inventory webhooks");
      const matching = payload.inventory_levels.filter((level) => level.store_id === storeId).slice(0, 100);
      for (const level of matching) {
        const authoritative = mode === "token" ? await getLoyverseInventoryLevel(level.variant_id) : level;
        if (!authoritative || authoritative.store_id !== storeId || !authoritative.updated_at) continue;
        const { error } = await supabase.rpc("apply_loyverse_inventory_level", {
          p_variant_id: authoritative.variant_id,
          p_stock: normalizeLoyverseStock(authoritative.in_stock),
          p_source_updated_at: authoritative.updated_at,
        });
        if (error) throw error;
      }
    } else if (payload.type === "items.update") {
      await syncItemUpdate(payload, supabase);
    }

    await supabase.from("loyverse_webhook_events").update({ status: "processed", processed_at: new Date().toISOString(), error: null }).eq("event_hash", eventHash);
    return NextResponse.json({ received: true, type: payload.type });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    await supabase.from("loyverse_webhook_events").update({ status: "failed", error: message }).eq("event_hash", eventHash);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
