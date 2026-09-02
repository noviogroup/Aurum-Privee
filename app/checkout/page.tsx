import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout-client";
import { checkoutIsEnabled } from "@/lib/checkout-availability";
import { siteConfig } from "@/lib/config";
import { isConfiguredSecret } from "@/lib/env";
import { grossFromNet } from "@/lib/tax";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Review your Aurum Privée order and continue to secure payment.",
};

function paymentIsReady() {
  return checkoutIsEnabled(process.env.NEXT_PUBLIC_CHECKOUT_ENABLED)
    && [
      process.env.STRIPE_SECRET_KEY,
      process.env.LOYVERSE_ACCESS_TOKEN,
      process.env.LOYVERSE_STORE_ID,
      process.env.LOYVERSE_PAYMENT_TYPE_ID,
      process.env.RESEND_API_KEY,
      process.env.RESEND_FROM_EMAIL,
      process.env.STORE_NOTIFICATION_EMAIL,
      process.env.RATE_LIMIT_SECRET,
    ].every(isConfiguredSecret);
}

async function signedInEmail() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return "";
  const { data } = await supabase.auth.getClaims();
  return typeof data?.claims?.email === "string" ? data.claims.email : "";
}

export default async function CheckoutPage() {
  const deliveryBase = Number(process.env.NEXT_PUBLIC_DELIVERY_FEE || 10);
  const deliveryTaxRate = Number(process.env.LOYVERSE_DELIVERY_ADDED_TAX_RATE || 0);
  const deliveryFee = grossFromNet(
    Number.isFinite(deliveryBase) && deliveryBase >= 0 ? deliveryBase : 10,
    Number.isFinite(deliveryTaxRate) && deliveryTaxRate >= 0 ? deliveryTaxRate : 0,
  );

  return (
    <CheckoutClient
      initialEmail={await signedInEmail()}
      paymentReady={paymentIsReady()}
      pickupLabel={siteConfig.pickupLabel}
      deliveryFee={deliveryFee}
    />
  );
}
