import { getSupabaseAdmin } from "@/lib/supabase";
import type { OperationsCustomer, OperationsCustomers } from "@/lib/operations-customer-types";
import type { ScentFamily } from "@/lib/types";

type OrderRow = {
  id: string; order_number: string; status: string; total: number | string; currency: string;
  customer_email: string; customer_name: string | null; customer_phone: string | null;
  loyverse_customer_id: string | null; created_at: string;
};

function totals(customers: OperationsCustomer[]) {
  return {
    all: customers.length,
    returning: customers.filter((customer) => customer.orderCount > 1).length,
    vip: customers.filter((customer) => customer.vip).length,
    newsletter: customers.filter((customer) => customer.newsletterStatus === "subscribed").length,
  };
}

function localCustomers(): OperationsCustomers {
  const now = Date.now();
  const inputs = [
    ["Amara Clarke", "amara@example.com", 126, "(242) 555-0148"],
    ["Marcus Rolle", "marcus@example.com", 184.5, "(242) 555-0112"],
    ["Priya Nair", "priya@example.com", 96, "(242) 555-0193"],
    ["Jada Knowles", "jada@example.com", 212.75, "(242) 555-0177"],
    ["Darren Bain", "darren@example.com", 78, "(242) 555-0184"],
  ] as const;
  const customers: OperationsCustomer[] = inputs.map(([name, email, spend, phone], index) => ({
    email, name, phone, orderCount: 1, lifetimeSpend: spend, currency: "BSD",
    lastOrderAt: new Date(now - (18 + index * 29) * 60_000).toISOString(), newsletterStatus: "none",
    loyverseLinked: true, preferredFamilies: index === 0 ? ["Floral"] : [],
    staffNotes: index === 0 ? "Prefers soft florals and gift-ready packaging." : "",
    vip: index === 0, profileUpdatedAt: null,
    orders: [{ id: `10000000-0000-0000-0000-00000000000${index + 1}`, orderNumber: `AP-${1048 - index}`, status: "paid", total: spend, currency: "BSD", createdAt: new Date(now - (18 + index * 29) * 60_000).toISOString() }],
  }));
  return { customers, configured: false, preview: true, totals: totals(customers) };
}

export async function getOperationsCustomers(): Promise<OperationsCustomers> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return localCustomers();
  const orders: OrderRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("orders")
      .select("id,order_number,status,total,currency,customer_email,customer_name,customer_phone,loyverse_customer_id,created_at")
      .not("customer_email", "is", null).order("created_at", { ascending: false }).range(from, from + 999);
    if (error) throw new Error("Customers could not be loaded");
    orders.push(...((data || []) as OrderRow[]));
    if (!data || data.length < 1000) break;
  }
  const emails = [...new Set(orders.map((order) => order.customer_email.trim().toLowerCase()).filter(Boolean))];
  if (!emails.length) return { customers: [], configured: true, preview: false, totals: { all: 0, returning: 0, vip: 0, newsletter: 0 } };
  const [profilesResult, newsletterResult] = await Promise.all([
    supabase.from("customer_profiles").select("email_normalized,preferred_families,staff_notes,vip,updated_at").in("email_normalized", emails.slice(0, 1000)),
    supabase.from("newsletter_subscribers").select("email,status").in("email", emails.slice(0, 1000)),
  ]);
  if (profilesResult.error || newsletterResult.error) throw new Error("Customer profiles could not be loaded");
  const profiles = new Map((profilesResult.data || []).map((row) => [row.email_normalized, row]));
  const newsletter = new Map((newsletterResult.data || []).map((row) => [row.email.toLowerCase(), row.status]));
  const groups = new Map<string, OrderRow[]>();
  for (const order of orders) {
    const email = order.customer_email.trim().toLowerCase();
    groups.set(email, [...(groups.get(email) || []), order]);
  }
  const customers: OperationsCustomer[] = [...groups].map(([email, customerOrders]) => {
    const latest = customerOrders[0];
    const profile = profiles.get(email);
    return {
      email, name: latest.customer_name || "Client", phone: latest.customer_phone,
      orderCount: customerOrders.length,
      lifetimeSpend: customerOrders.filter((order) => !["refunded", "cancelled"].includes(order.status)).reduce((sum, order) => sum + Number(order.total), 0),
      currency: latest.currency.toUpperCase(), lastOrderAt: latest.created_at,
      newsletterStatus: (newsletter.get(email) || "none") as OperationsCustomer["newsletterStatus"],
      loyverseLinked: customerOrders.some((order) => Boolean(order.loyverse_customer_id)),
      preferredFamilies: (profile?.preferred_families || []) as ScentFamily[], staffNotes: profile?.staff_notes || "",
      vip: Boolean(profile?.vip), profileUpdatedAt: profile?.updated_at || null,
      orders: customerOrders.slice(0, 20).map((order) => ({ id: order.id, orderNumber: order.order_number, status: order.status, total: Number(order.total), currency: order.currency.toUpperCase(), createdAt: order.created_at })),
    };
  });
  return { customers, configured: true, preview: false, totals: totals(customers) };
}

export async function publishCustomerProfile(input: { email: string; preferredFamilies: ScentFamily[]; staffNotes: string; vip: boolean }) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.rpc("publish_customer_profile", {
    p_email: input.email,
    p_preferred_families: input.preferredFamilies,
    p_staff_notes: input.staffNotes,
    p_vip: input.vip,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Customer profile could not be saved");
  return { email: row.email_normalized as string, updatedAt: row.updated_at as string };
}
