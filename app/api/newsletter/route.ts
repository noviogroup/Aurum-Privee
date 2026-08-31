import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendNewsletterConfirmation } from "@/lib/email";
import { isConfiguredSecret } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase";
import { consumeRateLimit, readJsonBody, RequestBodyTooLargeError } from "@/lib/request-security";
import { consumeBlobRateLimit, saveNewsletterConfirmation } from "@/lib/netlify-commerce";

const schema = z.object({ email: z.string().trim().email().max(254) });

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    if (!isConfiguredSecret(process.env.RESEND_API_KEY) || !isConfiguredSecret(process.env.RESEND_FROM_EMAIL)) {
      return NextResponse.json({ message: "Email signup will open when confirmation email is configured." }, { status: 503 });
    }
    const rateLimit = supabase
      ? await consumeRateLimit({ supabase, request, scope: "newsletter", limit: 4, windowSeconds: 3600 })
      : await consumeBlobRateLimit({ request, scope: "newsletter", limit: 4, windowSeconds: 3600 });
    if (!rateLimit.configured) return NextResponse.json({ message: "Email signup protection is not configured." }, { status: 503 });
    if (!rateLimit.allowed) return NextResponse.json({ message: "Please wait before requesting another confirmation." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } });
    const globalLimit = supabase
      ? await consumeRateLimit({ supabase, request, scope: "newsletter-global", limit: 300, windowSeconds: 3600, global: true })
      : await consumeBlobRateLimit({ request, scope: "newsletter-global", limit: 300, windowSeconds: 3600, global: true });
    if (!globalLimit.allowed) return NextResponse.json({ message: "Email signup is briefly busy. Please try again later." }, { status: 503, headers: { "Retry-After": String(globalLimit.retryAfter) } });

    const parsed = schema.safeParse(await readJsonBody<unknown>(request, 2_048));
    if (!parsed.success) return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
    const email = parsed.data.email.toLowerCase();
    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    if (!supabase) {
      await saveNewsletterConfirmation({ email, tokenHash, expiresAt });
      await sendNewsletterConfirmation({ email, token });
      return NextResponse.json({ message: "Check your inbox to confirm your subscription." });
    }
    const { data: state, error } = await supabase.rpc("request_newsletter_confirmation", {
      p_email: email,
      p_source: "storefront",
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
    });
    if (error) throw error;
    if (state !== "subscribed") await sendNewsletterConfirmation({ email, token });
    return NextResponse.json({ message: "Check your inbox to confirm your subscription." });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ message: "That request is too large." }, { status: 413 });
    if (error instanceof SyntaxError || error instanceof TypeError) return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
    console.error("Newsletter confirmation request failed", error);
    return NextResponse.json({ message: "We could not start confirmation. Try again shortly." }, { status: 500 });
  }
}
