import type { Metadata } from "next";
import Link from "next/link";
import { Package, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { AccountSignIn } from "@/components/account-sign-in";
import { AccountSignOut } from "@/components/account-sign-out";
import { formatMoney } from "@/lib/config";
import { listCommerceOrders } from "@/lib/netlify-commerce";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createSupabaseServerClient, getSupabaseAuthConfig } from "@/lib/supabase-auth-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My account",
  description: "View Aurum Privée orders and account details.",
};

type AccountOrder = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  fulfillmentStatus: string;
  createdAt: string;
};

async function ordersForEmail(email: string): Promise<AccountOrder[]> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data } = await admin.from("orders")
      .select("id,order_number,total,status,fulfillment_status,created_at")
      .ilike("customer_email", email)
      .order("created_at", { ascending: false })
      .limit(30);
    return (data || []).map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      total: Number(order.total),
      status: order.status,
      fulfillmentStatus: order.fulfillment_status,
      createdAt: order.created_at,
    }));
  }
  try {
    return (await listCommerceOrders(500))
      .filter((order) => order.customerEmail.toLowerCase() === email.toLowerCase())
      .slice(0, 30)
      .map((order) => ({ id: order.id, orderNumber: order.orderNumber, total: order.total, status: order.status, fulfillmentStatus: order.fulfillmentStatus, createdAt: order.createdAt }));
  } catch {
    return [];
  }
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const authConfig = getSupabaseAuthConfig();
  const supabase = await createSupabaseServerClient();
  const { data } = supabase ? await supabase.auth.getClaims() : { data: null };
  const email = typeof data?.claims?.email === "string" ? data.claims.email : "";
  const orders = email ? await ordersForEmail(email) : [];
  const params = await searchParams;

  if (!email) {
    return (
      <div className="account-page section-shell page-top">
        <section className="account-intro">
          <UserCircle size={34} weight="thin" />
          <h1>Your fragrance account.</h1>
          <p>Sign in to see your orders, keep checkout details connected and receive a more personal level of service.</p>
          {params.error && <p className="form-error" role="alert">That sign-in link could not be completed. Please request a new one.</p>}
          <AccountSignIn configured={Boolean(authConfig)} supabaseUrl={authConfig?.url} publishableKey={authConfig?.publishableKey} />
        </section>
        <aside className="account-benefits">
          <div><span>01</span><h2>Order history</h2><p>See paid orders and fulfillment progress in one place.</p></div>
          <div><span>02</span><h2>Faster checkout</h2><p>Your verified email carries into checkout automatically.</p></div>
          <div><span>03</span><h2>Private by design</h2><p>Secure email links replace reusable passwords.</p></div>
        </aside>
      </div>
    );
  }

  return (
    <div className="account-dashboard section-shell page-top">
      <header><div><p>Signed in as {email}</p><h1>My account</h1></div>{authConfig && <AccountSignOut supabaseUrl={authConfig.url} publishableKey={authConfig.publishableKey} />}</header>
      <section className="account-orders" aria-labelledby="account-orders-title">
        <div className="account-orders-head"><h2 id="account-orders-title">Orders</h2><Link href="/shop">Shop fragrances</Link></div>
        {orders.length ? orders.map((order) => (
          <article key={order.id}>
            <Package size={24} weight="light" />
            <div><strong>{order.orderNumber}</strong><span>{new Intl.DateTimeFormat("en-BS", { dateStyle: "medium" }).format(new Date(order.createdAt))}</span></div>
            <div><span>{order.fulfillmentStatus.replaceAll("_", " ")}</span><strong>{formatMoney(order.total)}</strong></div>
          </article>
        )) : <div className="account-empty"><Package size={34} weight="thin" /><h3>No orders yet.</h3><p>Your completed purchases will appear here.</p><Link href="/shop" className="button button-primary">Explore the collection</Link></div>}
      </section>
    </div>
  );
}
