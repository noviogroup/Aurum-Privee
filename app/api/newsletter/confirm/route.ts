import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { readRequestText, RequestBodyTooLargeError } from "@/lib/request-security";
import { confirmNewsletterSubscription } from "@/lib/netlify-commerce";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type")?.split(";", 1)[0];
    if (contentType !== "application/x-www-form-urlencoded") return NextResponse.json({ error: "Unsupported confirmation request" }, { status: 415 });
    const token = new URLSearchParams(await readRequestText(request, 1_024)).get("token") || "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return NextResponse.redirect(new URL("/newsletter/confirm?status=invalid", request.url), 303);
    const supabase = getSupabaseAdmin();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (!supabase) {
      const email = await confirmNewsletterSubscription(tokenHash);
      return NextResponse.redirect(new URL(`/newsletter/confirm?status=${email ? "confirmed" : "invalid"}`, request.url), 303);
    }
    const { data: email, error } = await supabase.rpc("confirm_newsletter_subscription", { p_token_hash: tokenHash });
    if (error) throw error;
    return NextResponse.redirect(new URL(`/newsletter/confirm?status=${email ? "confirmed" : "invalid"}`, request.url), 303);
  } catch (error) {
    if (!(error instanceof RequestBodyTooLargeError)) console.error("Newsletter confirmation failed", error);
    return NextResponse.redirect(new URL("/newsletter/confirm?status=invalid", request.url), 303);
  }
}
