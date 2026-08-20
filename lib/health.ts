import { getSupabaseAdmin } from "@/lib/supabase";

export type HealthStatus = {
  status: "ok" | "degraded" | "unavailable";
  checkedAt: string;
  database: "ok" | "unavailable";
  catalogProducts: number;
  lastCatalogSyncAt: string | null;
  catalogSyncFresh: boolean;
  failedOrderSyncs: number;
  failedRefundSyncs: number;
  stuckOrderSyncs: number;
  stuckRefundSyncs: number;
  exhaustedOrderSyncs: number;
  exhaustedRefundSyncs: number;
  failedTransactionalEmails: number;
  stuckTransactionalEmails: number;
  failedContactNotifications: number;
  failedWebhookEvents: number;
  overdueReservations: number;
};

export async function getHealthStatus(now = new Date()): Promise<HealthStatus> {
  const checkedAt = now.toISOString();
  const supabase = getSupabaseAdmin();
  if (!supabase) return { status: "unavailable", checkedAt, database: "unavailable", catalogProducts: 0, lastCatalogSyncAt: null, catalogSyncFresh: false, failedOrderSyncs: 0, failedRefundSyncs: 0, stuckOrderSyncs: 0, stuckRefundSyncs: 0, exhaustedOrderSyncs: 0, exhaustedRefundSyncs: 0, failedTransactionalEmails: 0, stuckTransactionalEmails: 0, failedContactNotifications: 0, failedWebhookEvents: 0, overdueReservations: 0 };
  const staleEmailAt = new Date(now.getTime() - 20 * 60 * 1000).toISOString();
  const staleLoyverseAt = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const [catalog, lastSync, failedOrders, failedRefunds, stuckOrders, stuckRefunds, exhaustedOrders, exhaustedRefunds, failedConfirmations, failedFulfillment, stuckConfirmations, stuckFulfillment, stuckContacts, failedContacts, failedWebhooks, overdue] = await Promise.all([
    supabase.from("catalog_products_available").select("id", { count: "exact", head: true }),
    supabase.from("integration_runs").select("completed_at").eq("provider", "loyverse").eq("operation", "catalog_sync").eq("status", "succeeded").order("completed_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("loyverse_sync_status", "failed"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("loyverse_refund_sync_status", "failed"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("loyverse_sync_status", "processing").or(`loyverse_sync_claimed_at.is.null,loyverse_sync_claimed_at.lte.${staleLoyverseAt}`),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("loyverse_refund_sync_status", "processing").or(`loyverse_refund_sync_claimed_at.is.null,loyverse_refund_sync_claimed_at.lte.${staleLoyverseAt}`),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("loyverse_sync_status", ["pending", "processing", "failed"]).gte("loyverse_sync_attempts", 8),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("loyverse_refund_sync_status", ["pending", "processing", "failed"]).gte("loyverse_refund_sync_attempts", 8),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("confirmation_email_status", "failed"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("fulfillment_email_status", "failed"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("confirmation_email_status", "processing").lte("confirmation_email_updated_at", staleEmailAt),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("fulfillment_email_status", "processing").lte("fulfillment_email_updated_at", staleEmailAt),
    supabase.from("contact_inquiries").select("id", { count: "exact", head: true }).eq("notification_status", "processing").lte("notification_updated_at", staleEmailAt),
    supabase.from("contact_inquiries").select("id", { count: "exact", head: true }).eq("notification_status", "failed"),
    supabase.from("loyverse_webhook_events").select("event_hash", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("checkout_reservations").select("id", { count: "exact", head: true }).eq("status", "active").lte("expires_at", checkedAt),
  ]);
  const error = catalog.error || lastSync.error || failedOrders.error || failedRefunds.error || stuckOrders.error || stuckRefunds.error || exhaustedOrders.error || exhaustedRefunds.error || failedConfirmations.error || failedFulfillment.error || stuckConfirmations.error || stuckFulfillment.error || stuckContacts.error || failedContacts.error || failedWebhooks.error || overdue.error;
  if (error) throw new Error("Health database checks failed");
  const completedAt = lastSync.data?.completed_at || null;
  const catalogSyncFresh = Boolean(completedAt && now.getTime() - new Date(completedAt).getTime() <= 36 * 60 * 60 * 1000);
  const counts = {
    catalogProducts: catalog.count || 0,
    failedOrderSyncs: failedOrders.count || 0,
    failedRefundSyncs: failedRefunds.count || 0,
    stuckOrderSyncs: stuckOrders.count || 0,
    stuckRefundSyncs: stuckRefunds.count || 0,
    exhaustedOrderSyncs: exhaustedOrders.count || 0,
    exhaustedRefundSyncs: exhaustedRefunds.count || 0,
    failedTransactionalEmails: (failedConfirmations.count || 0) + (failedFulfillment.count || 0),
    stuckTransactionalEmails: (stuckConfirmations.count || 0) + (stuckFulfillment.count || 0) + (stuckContacts.count || 0),
    failedContactNotifications: failedContacts.count || 0,
    failedWebhookEvents: failedWebhooks.count || 0,
    overdueReservations: overdue.count || 0,
  };
  const degraded = !catalogSyncFresh || counts.catalogProducts < 1 || counts.failedOrderSyncs > 0 || counts.failedRefundSyncs > 0 || counts.stuckOrderSyncs > 0 || counts.stuckRefundSyncs > 0 || counts.exhaustedOrderSyncs > 0 || counts.exhaustedRefundSyncs > 0 || counts.failedTransactionalEmails > 0 || counts.stuckTransactionalEmails > 0 || counts.failedContactNotifications > 0 || counts.failedWebhookEvents > 0 || counts.overdueReservations > 0;
  return { status: degraded ? "degraded" : "ok", checkedAt, database: "ok", lastCatalogSyncAt: completedAt, catalogSyncFresh, ...counts };
}
