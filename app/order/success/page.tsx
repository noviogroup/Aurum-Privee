import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, ClockCountdown, Storefront } from "@phosphor-icons/react/dist/ssr";
import Stripe from "stripe";
import { isConfiguredSecret } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase";
import { OrderSuccessCartClear } from "@/components/order-success-cart-clear";
import { getCommerceOrderBySession } from "@/lib/netlify-commerce";
import { getConfirmedWixOrder } from "@/lib/wix-order";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false, follow: false },
};

type OrderLine = { name?: string; quantity?: number };

async function getVerifiedOrder(sessionId: string) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId) || sessionId.length > 255) return null;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const supabase = getSupabaseAdmin();
  if (!isConfiguredSecret(stripeKey)) return null;
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" as Stripe.LatestApiVersion });
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.channel !== "aurum-privee-web" || session.payment_status !== "paid") return null;
  if (supabase) {
    const { data } = await supabase.from("orders")
      .select("order_number,total,currency,customer_email,line_items,shipping_amount,fulfillment_status,confirmation_email_status")
      .eq("stripe_session_id", session.id)
      .maybeSingle();
    return data ? { session, order: data } : { session, order: null };
  }
  const stored = await getCommerceOrderBySession(session.id);
  return {
    session,
    order: stored ? {
      order_number: stored.orderNumber,
      total: stored.total,
      currency: stored.currency,
      customer_email: stored.customerEmail,
      line_items: stored.lineItems,
      shipping_amount: stored.shippingAmount,
      fulfillment_status: stored.fulfillmentStatus,
      confirmation_email_status: stored.confirmationEmailStatus,
    } : null,
  };
}

export default async function OrderSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string; provider?: string; orderId?: string }> }) {
  const { session_id: sessionId, provider, orderId } = await searchParams;
  const isWixOrder = provider === "wix";

  if (isWixOrder) {
    const wixOrder = await getConfirmedWixOrder(orderId);
    return (
      <div className="status-page order-receipt-page section-shell page-top">
        <OrderSuccessCartClear completed={Boolean(wixOrder)} />
        {wixOrder ? <CheckCircle size={48} weight="thin" /> : <ClockCountdown size={48} weight="thin" />}
        <p className="utility-label">{wixOrder ? `Order received${wixOrder.number ? ` · ${wixOrder.number}` : ""}` : "Order confirmation"}</p>
        <h1>{wixOrder ? "Your fragrance is reserved." : "We are confirming your order."}</h1>
        <p>
          {wixOrder
            ? "Your order is now in the Aurum Privée order system. A member of our team will confirm the next steps by email."
            : "If you recently placed an order, please check your email before trying again. Contact client care if your confirmation does not arrive."}
        </p>
        {wixOrder && (
          <div className="order-receipt-card">
            <div className="order-receipt-method">
              <Storefront size={24} weight="light" />
              <div>
                <strong>Order confirmation</strong>
                <span>Client care will confirm the next steps directly by email.</span>
              </div>
            </div>
          </div>
        )}
        <div className="order-next-actions"><Link href="/shop" className="button button-primary">Keep browsing</Link><Link href="/contact" className="text-link">Questions about this order</Link></div>
      </div>
    );
  }

  let verified: Awaited<ReturnType<typeof getVerifiedOrder>> = null;
  try {
    if (sessionId) verified = await getVerifiedOrder(sessionId);
  } catch {
    verified = null;
  }

  if (!verified) {
    return (
      <div className="status-page section-shell page-top">
        <ClockCountdown size={48} weight="thin" />
        <p className="utility-label">Order confirmation</p>
        <h1>We are confirming your order.</h1>
        <p>If you recently placed an order, keep this page open briefly and check your email. Contact client care if confirmation does not arrive.</p>
        <Link href="/shop" className="button button-primary">Return to the collection</Link>
      </div>
    );
  }

  const { session, order } = verified;
  const orderNumber = order?.order_number || `AP-${session.id.slice(-8).toUpperCase()}`;
  const lines = (order?.line_items || []) as OrderLine[];
  const rawEmail = order?.customer_email || session.customer_details?.email;
  const email = rawEmail ? rawEmail.replace(/^(.{1,2}).*(@.*)$/, "$1•••$2") : null;
  const confirmationSent = order?.confirmation_email_status === "sent";
  return (
    <div className="status-page order-receipt-page section-shell page-top">
      <OrderSuccessCartClear completed />
      <CheckCircle size={48} weight="thin" />
      <p className="utility-label">Order confirmed · {orderNumber}</p>
      <h1>Your fragrance is reserved.</h1>
      <p>{email && confirmationSent ? `A confirmation has been sent to ${email}.` : email ? `Your confirmation is being delivered to ${email}.` : "Your order is confirmed."} We will send the next update when it is ready.</p>
      <div className="order-receipt-card">
        <div className="order-receipt-method">
          <Storefront size={24} weight="light" />
          <div><strong>Order service</strong><span>Client care will confirm the next steps by email.</span></div>
        </div>
        {lines.length > 0 && <div className="order-receipt-lines">{lines.map((line, index) => <div key={`${line.name}-${index}`}><span>{line.name || "Fragrance"} × {line.quantity || 1}</span></div>)}</div>}
      </div>
      <div className="order-next-actions"><Link href="/shop" className="button button-primary">Keep browsing</Link><Link href="/contact" className="text-link">Questions about this order</Link></div>
    </div>
  );
}
