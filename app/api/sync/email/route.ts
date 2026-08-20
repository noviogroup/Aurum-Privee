import { NextResponse } from "next/server";
import { z } from "zod";
import { hasBearerSecret } from "@/lib/env";
import { readRequestText, RequestBodyTooLargeError } from "@/lib/request-security";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  deliverContactNotification,
  deliverFulfillmentUpdate,
  deliverOrderConfirmation,
} from "@/lib/transactional-email";

const schema = z.object({ limit: z.number().int().min(1).max(50).default(25) }).default({ limit: 25 });

type Result = { kind: "confirmation" | "fulfillment" | "contact"; id: string; status: "sent" | "failed"; error?: string };

export async function POST(request: Request) {
  if (!hasBearerSecret(request, process.env.SYNC_SECRET)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  try {
    const text = await readRequestText(request, 2_048);
    const input = schema.parse(text ? JSON.parse(text) : undefined);
    const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const [confirmations, fulfillments, contacts] = await Promise.all([
      supabase.from("orders")
        .select("id,order_number,customer_name,customer_email,total,line_items")
        .or(`confirmation_email_status.in.(pending,failed),and(confirmation_email_status.eq.processing,confirmation_email_updated_at.lt.${staleBefore})`)
        .lt("confirmation_email_attempts", 8)
        .order("created_at", { ascending: true }).limit(input.limit),
      supabase.from("orders")
        .select("id,order_number,customer_name,customer_email,shipping_amount,fulfillment_status")
        .or(`fulfillment_email_status.in.(pending,failed),and(fulfillment_email_status.eq.processing,fulfillment_email_updated_at.lt.${staleBefore})`)
        .lt("fulfillment_email_attempts", 8)
        .in("fulfillment_status", ["ready", "fulfilled", "cancelled"])
        .order("updated_at", { ascending: true }).limit(input.limit),
      supabase.from("contact_inquiries")
        .select("id,reference,customer_name,customer_email,customer_phone,topic,order_number,message")
        .or(`notification_status.in.(pending,failed),and(notification_status.eq.processing,notification_updated_at.lt.${staleBefore})`)
        .lt("notification_attempts", 8)
        .order("created_at", { ascending: true }).limit(input.limit),
    ]);
    const queryError = confirmations.error || fulfillments.error || contacts.error;
    if (queryError) throw queryError;

    const work = [
      ...(confirmations.data || []).map((row) => ({ kind: "confirmation" as const, id: row.id, run: () => deliverOrderConfirmation(supabase, row) })),
      ...(fulfillments.data || []).map((row) => ({ kind: "fulfillment" as const, id: row.id, run: () => deliverFulfillmentUpdate(supabase, row as Parameters<typeof deliverFulfillmentUpdate>[1]) })),
      ...(contacts.data || []).map((row) => ({ kind: "contact" as const, id: row.id, run: () => deliverContactNotification(supabase, row) })),
    ].slice(0, input.limit);

    const results: Result[] = [];
    for (const item of work) {
      try {
        const outcome = await item.run();
        if (outcome.claimed) results.push({ kind: item.kind, id: item.id, status: "sent" });
      } catch (error) {
        results.push({ kind: item.kind, id: item.id, status: "failed", error: error instanceof Error ? error.message : "Delivery failed" });
      }
    }
    return NextResponse.json({ processed: results.length, sent: results.filter((item) => item.status === "sent").length, failed: results.filter((item) => item.status === "failed").length, results });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Retry request is too large" }, { status: 413 });
    if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError) return NextResponse.json({ error: "Invalid retry request" }, { status: 400 });
    console.error("Transactional email retry failed", error);
    return NextResponse.json({ error: "Transactional email retry failed" }, { status: 500 });
  }
}
