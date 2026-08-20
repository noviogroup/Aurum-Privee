import { NextResponse } from "next/server";
import crypto from "node:crypto";
import Stripe from "stripe";
import { z } from "zod";
import { getCatalogProductsByIds } from "@/lib/catalog";
import { siteConfig } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase";
import { calculateAddedTax, grossFromNet } from "@/lib/tax";
import { isConfiguredSecret } from "@/lib/env";
import { consumeRateLimit, readJsonBody, RequestBodyTooLargeError } from "@/lib/request-security";
import { checkoutIsEnabled } from "@/lib/checkout-availability";

const requestSchema = z.object({
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(10) })).min(1).max(20),
}).superRefine(({ items }, context) => {
  if (new Set(items.map((item) => item.productId)).size !== items.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate products are not allowed" });
  }
});

export async function POST(request: Request) {
  try {
    if (!checkoutIsEnabled(process.env.NEXT_PUBLIC_CHECKOUT_ENABLED)) {
      return NextResponse.json({ error: "Online checkout is not open yet." }, { status: 503 });
    }
    const key = process.env.STRIPE_SECRET_KEY;
    if (!isConfiguredSecret(key)) {
      return NextResponse.json({ error: "Secure checkout is ready for a Stripe key. Add it to the environment to continue." }, { status: 503 });
    }
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Live inventory reservations are not configured." }, { status: 503 });

    const rateLimit = await consumeRateLimit({ supabase, request, scope: "checkout", limit: 5, windowSeconds: 600 });
    if (!rateLimit.configured) return NextResponse.json({ error: "Secure checkout protection is not configured." }, { status: 503 });
    if (!rateLimit.allowed) return NextResponse.json({ error: "Too many checkout attempts. Please wait before trying again." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } });
    const globalLimit = await consumeRateLimit({ supabase, request, scope: "checkout-global", limit: 120, windowSeconds: 60, global: true });
    if (!globalLimit.allowed) return NextResponse.json({ error: "Checkout is briefly busy. Please try again shortly." }, { status: 503, headers: { "Retry-After": String(globalLimit.retryAfter) } });

    const input = requestSchema.parse(await readJsonBody<unknown>(request, 16_384));
    const products = await getCatalogProductsByIds(input.items.map((item) => item.productId));
    if (products.length !== new Set(input.items.map((item) => item.productId)).size) {
      return NextResponse.json({ error: "One or more fragrances are no longer available." }, { status: 400 });
    }

    let addedTaxAmount = 0;
    const addedTaxNames = new Set<string>();
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = input.items.map((line) => {
      const product = products.find((item) => item.id === line.productId)!;
      if (product.stock < line.quantity) throw new Error(`${product.name} has only ${product.stock} available.`);
      const taxes = product.loyverseTaxes || [];
      const serializedTaxes = JSON.stringify(taxes);
      if (serializedTaxes.length > 500) throw new Error(`Tax configuration for ${product.name} is too large for secure checkout metadata.`);
      addedTaxAmount += calculateAddedTax(product.price * line.quantity, taxes);
      taxes.filter((tax) => tax.type === "ADDED").forEach((tax) => addedTaxNames.add(tax.name));
      return {
        quantity: line.quantity,
        price_data: {
          currency: siteConfig.currency.toLowerCase(),
          unit_amount: Math.round(product.price * 100),
          product_data: {
            name: `${product.brand} ${product.name}`,
            description: `${product.concentration}, ${product.size}`,
            images: product.image.startsWith("http") ? [product.image] : undefined,
            metadata: {
              product_id: product.id,
              loyverse_variant_id: product.loyverseVariantId || "",
              loyverse_tax_ids: (product.loyverseTaxIds || []).join(","),
              loyverse_taxes: serializedTaxes,
            },
          },
        },
      };
    });
    addedTaxAmount = Math.round(addedTaxAmount * 100) / 100;
    if (addedTaxAmount > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: siteConfig.currency.toLowerCase(),
          unit_amount: Math.round(addedTaxAmount * 100),
          product_data: {
            name: addedTaxNames.size === 1 ? [...addedTaxNames][0] : "Value Added Tax",
            description: "Tax calculated from the live Loyverse catalog",
            metadata: { line_kind: "added_tax" },
          },
        },
      });
    }

    const deliveryBaseAmount = Number(process.env.NEXT_PUBLIC_DELIVERY_FEE || 10);
    const deliveryAddedTaxRate = Number(process.env.LOYVERSE_DELIVERY_ADDED_TAX_RATE || 0);
    if (!Number.isFinite(deliveryBaseAmount) || deliveryBaseAmount < 0) throw new Error("The delivery fee is invalid.");
    if (!Number.isFinite(deliveryAddedTaxRate) || deliveryAddedTaxRate < 0) throw new Error("The delivery tax rate is invalid.");
    const deliveryGrossAmount = grossFromNet(deliveryBaseAmount, deliveryAddedTaxRate);

    const checkoutReference = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 35 * 60 * 1000);
    const reservationExpiresAt = new Date(sessionExpiresAt.getTime() + 15 * 60 * 1000);
    const { error: reservationError } = await supabase.rpc("reserve_checkout_inventory", {
      p_checkout_reference: checkoutReference,
      p_items: input.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
      p_expires_at: reservationExpiresAt.toISOString(),
      p_actor_key_hash: rateLimit.keyHash,
    });
    if (reservationError) return NextResponse.json({ error: "Those quantities are no longer available. Please review your bag." }, { status: 409 });

    const stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" as Stripe.LatestApiVersion });
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${siteConfig.url}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteConfig.url}/shop`,
      customer_creation: "always",
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      payment_intent_data: { metadata: { channel: "lola-lily-web", checkout_reference: checkoutReference } },
      shipping_address_collection: { allowed_countries: ["BS"] },
      shipping_options: [
        { shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 0, currency: siteConfig.currency.toLowerCase() }, display_name: siteConfig.pickupLabel } },
        { shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: Math.round(deliveryGrossAmount * 100), currency: siteConfig.currency.toLowerCase() }, display_name: "New Providence delivery", delivery_estimate: { minimum: { unit: "business_day", value: 1 }, maximum: { unit: "business_day", value: 3 } } } },
      ],
      expires_at: Math.floor(sessionExpiresAt.getTime() / 1000),
      metadata: {
        channel: "lola-lily-web",
        checkout_reference: checkoutReference,
        delivery_base_amount: deliveryBaseAmount.toFixed(2),
        delivery_added_tax_rate: deliveryAddedTaxRate.toString(),
      },
      });
    } catch (error) {
      await supabase.rpc("release_checkout_inventory", { p_checkout_reference: checkoutReference, p_status: "released" });
      throw error;
    }

    if (!session.url) {
      await supabase.rpc("release_checkout_inventory", { p_checkout_reference: checkoutReference, p_status: "released" });
      throw new Error("Stripe did not return a checkout URL.");
    }
    const { error: linkError } = await supabase.from("checkout_reservations").update({ stripe_session_id: session.id }).eq("checkout_reference", checkoutReference);
    if (linkError) {
      await Promise.allSettled([
        stripe.checkout.sessions.expire(session.id),
        supabase.rpc("release_checkout_inventory", { p_checkout_reference: checkoutReference, p_status: "released" }),
      ]);
      throw new Error("Checkout inventory could not be linked securely. Please try again.");
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "The checkout request is too large." }, { status: 413 });
    if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError) {
      return NextResponse.json({ error: "The shopping bag contains invalid quantities." }, { status: 400 });
    }
    console.error("Checkout could not be started", error);
    return NextResponse.json({ error: "Checkout could not be started. Please try again." }, { status: 500 });
  }
}
