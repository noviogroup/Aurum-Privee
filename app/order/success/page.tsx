import Link from "next/link";
import { CheckCircle, ClockCountdown, Storefront, Truck } from "@phosphor-icons/react/dist/ssr";
import Stripe from "stripe";
import { formatMoney, siteConfig } from "@/lib/config";
import { isConfiguredSecret } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase";
import { OrderSuccessCartClear } from "@/components/order-success-cart-clear";

export const dynamic = "force-dynamic";

type OrderLine = { name?: string; quantity?: number; amount?: number };

async function getVerifiedOrder(sessionId: string) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId) || sessionId.length > 255) return null;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const supabase = getSupabaseAdmin();
  if (!isConfiguredSecret(stripeKey) || !supabase) return null;
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" as Stripe.LatestApiVersion });
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.channel !== "aurum-privee-web" || session.payment_status !== "paid") return null;
  const { data } = await supabase.from("orders")
    .select("order_number,total,currency,customer_email,line_items,shipping_amount,fulfillment_status,confirmation_email_status")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  return data ? { session, order: data } : { session, order: null };
}

export default async function OrderSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
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
        <p className="utility-label">Payment confirmation</p>
        <h1>We are confirming your order.</h1>
        <p>If you completed payment, keep this page open briefly and check your email. Do not submit a second payment. Contact client care if confirmation does not arrive.</p>
        <Link href="/shop" className="button button-primary">Return to the collection</Link>
      </div>
    );
  }

  const { session, order } = verified;
  const isDelivery = Number(order?.shipping_amount || 0) > 0;
  const orderNumber = order?.order_number || `AP-${session.id.slice(-8).toUpperCase()}`;
  const lines = (order?.line_items || []) as OrderLine[];
  const rawEmail = order?.customer_email || session.customer_details?.email;
  const email = rawEmail ? rawEmail.replace(/^(.{1,2}).*(@.*)$/, "$1•••$2") : null;
  const confirmationSent = order?.confirmation_email_status === "sent";
  return (
    <div className="status-page order-receipt-page section-shell page-top">
      <OrderSuccessCartClear paid />
      <CheckCircle size={48} weight="thin" />
      <p className="utility-label">Payment confirmed · {orderNumber}</p>
      <h1>Your fragrance is reserved.</h1>
      <p>{email && confirmationSent ? `A confirmation has been sent to ${email}.` : email ? `Your receipt is being delivered to ${email}.` : "Your payment is confirmed."} We will send the next update when your order is ready.</p>
      <div className="order-receipt-card">
        <div className="order-receipt-method">
          {isDelivery ? <Truck size={24} weight="light" /> : <Storefront size={24} weight="light" />}
          <div><strong>{isDelivery ? "New Providence delivery" : siteConfig.pickupLabel}</strong><span>{isDelivery ? "Delivery details will be confirmed by email." : "We will email as soon as pickup is ready."}</span></div>
        </div>
        {lines.length > 0 && <div className="order-receipt-lines">{lines.map((line, index) => <div key={`${line.name}-${index}`}><span>{line.name || "Fragrance"} × {line.quantity || 1}</span><strong>{formatMoney(Number(line.amount || 0))}</strong></div>)}</div>}
        <div className="order-receipt-total"><span>Total paid</span><strong>{formatMoney(Number(order?.total ?? (session.amount_total || 0) / 100))}</strong></div>
      </div>
      <div className="order-next-actions"><Link href="/shop" className="button button-primary">Keep browsing</Link><Link href="/pages/contact" className="text-link">Questions about this order</Link></div>
    </div>
  );
}
