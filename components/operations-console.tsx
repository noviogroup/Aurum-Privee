"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowSquareOut,
  CheckCircle,
  EnvelopeSimple,
  Gear,
  ImageSquare,
  MagnifyingGlass,
  Package,
  SignOut,
  Storefront,
  Tag,
  Users,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { orderNeedsAttention, type OperationsOrder } from "@/lib/operations-types";

type Filter = "attention" | "unfulfilled" | "ready" | "fulfilled";

const filterLabels: Record<Filter, string> = {
  attention: "Needs attention",
  unfulfilled: "Unfulfilled",
  ready: "Ready",
  fulfilled: "Completed",
};

function money(order: OperationsOrder, amount: number) {
  return new Intl.NumberFormat("en-BS", { style: "currency", currency: order.currency || "BSD" }).format(amount);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-BS", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function time(value: string) {
  return new Intl.DateTimeFormat("en-BS", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function maskedEmail(email: string) {
  return email.replace(/^(.{1,2}).*(@.*)$/, "$1••••$2");
}

function deliveryAddress(order: OperationsOrder) {
  const details = order.deliveryDetails;
  if (!details) return "Nassau store pickup";
  const address = (details.address || details) as Record<string, unknown>;
  return [address.line1, address.line2, address.city, address.state, address.country]
    .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
    .join(", ") || "New Providence delivery";
}

function statusLabel(order: OperationsOrder) {
  if (orderNeedsAttention(order)) return "Needs attention";
  if (order.fulfillmentStatus === "unfulfilled") return order.paymentStatus === "paid" ? "Payment confirmed" : "Unfulfilled";
  return order.fulfillmentStatus.charAt(0).toUpperCase() + order.fulfillmentStatus.slice(1);
}

export function OperationsConsole({ initialOrders, preview = false, initialOrder }: { initialOrders: OperationsOrder[]; preview?: boolean; initialOrder?: string }) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<Filter>("unfulfilled");
  const [query, setQuery] = useState("");
  const linkedOrder = initialOrders.find((order) => order.id === initialOrder || order.orderNumber === initialOrder);
  const [selectedId, setSelectedId] = useState((linkedOrder || initialOrders.find((order) => order.fulfillmentStatus === "unfulfilled") || initialOrders[0])?.id || "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [confirmation, setConfirmation] = useState<{ status: "ready" | "fulfilled" | "cancelled"; order: OperationsOrder } | null>(null);

  const counts = useMemo(() => ({
    attention: orders.filter(orderNeedsAttention).length,
    unfulfilled: orders.filter((order) => order.fulfillmentStatus === "unfulfilled").length,
    ready: orders.filter((order) => order.fulfillmentStatus === "ready").length,
    fulfilled: orders.filter((order) => order.fulfillmentStatus === "fulfilled").length,
  }), [orders]);
  const todaysRevenue = useMemo(() => {
    const today = new Date();
    return orders.filter((order) => {
      const created = new Date(order.createdAt);
      return order.paymentStatus === "paid"
        && created.getFullYear() === today.getFullYear()
        && created.getMonth() === today.getMonth()
        && created.getDate() === today.getDate();
    }).reduce((sum, order) => sum + order.total, 0);
  }, [orders]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesFilter = filter === "attention" ? orderNeedsAttention(order) : order.fulfillmentStatus === filter;
      const matchesQuery = !term || [order.orderNumber, order.customerName, order.customerEmail, order.customerPhone || ""].join(" ").toLowerCase().includes(term);
      return matchesFilter && matchesQuery;
    });
  }, [orders, filter, query]);
  const selected = orders.find((order) => order.id === selectedId) || visible[0] || orders[0];

  function chooseFilter(next: Filter) {
    setFilter(next);
    const first = orders.find((order) => next === "attention" ? orderNeedsAttention(order) : order.fulfillmentStatus === next);
    if (first) setSelectedId(first.id);
  }

  async function refresh() {
    const response = await fetch("/api/operations/orders", { cache: "no-store" });
    const body = await response.json() as { orders?: OperationsOrder[]; error?: string };
    if (!response.ok || !body.orders) throw new Error(body.error || "Orders could not be refreshed");
    setOrders(body.orders);
  }

  async function transition(status: "ready" | "fulfilled" | "cancelled", order: OperationsOrder) {
    setConfirmation(null);
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/operations/orders/fulfillment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, status }),
      });
      const body = await response.json() as { error?: string };
      await refresh();
      if (!response.ok) throw new Error(body.error || "Order could not be updated");
      setNotice({ tone: "success", text: `${order.orderNumber} is now ${status}. Customer email sent.` });
    } catch (caught) {
      setNotice({ tone: "error", text: caught instanceof Error ? caught.message : "Order could not be updated" });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/operations/session", { method: "DELETE" });
    window.location.assign("/operations/login");
  }

  return (
    <div className="operations-app">
      <aside className="operations-sidebar">
        <div className="operations-wordmark">AURUM PRIVÉE</div>
        <p className="operations-rail-label">Operations</p>
        <nav aria-label="Operations navigation">
          <a className="is-selected" href="/operations"><Package size={21} weight="light" />Orders</a>
          <Link href="/operations/inquiries"><EnvelopeSimple size={21} weight="light" />Client care</Link>
          <Link href="/operations/catalog"><Tag size={21} weight="light" />Catalog</Link>
          <Link href="/operations/images"><ImageSquare size={21} weight="light" />Product images</Link>
          <Link href="/operations/customers"><Users size={21} weight="light" />Customers</Link>
          <Link href="/operations/integrations"><Gear size={21} weight="light" />Integrations</Link>
        </nav>
        <div className="operations-rail-utilities">
          <a href="/" target="_blank" rel="noreferrer"><ArrowSquareOut size={20} weight="light" />View storefront</a>
          <button type="button" onClick={signOut}><SignOut size={20} weight="light" />Sign out</button>
        </div>
      </aside>

      <section className="operations-workspace">
        <header className="operations-topbar">
          <div><Storefront size={18} weight="light" /><span>Nassau store</span></div>
          <div className="operations-sync"><span>Loyverse</span>{preview ? <WarningCircle size={18} weight="fill" /> : <CheckCircle size={18} weight="fill" />}{preview ? "Preview" : "Synced"}</div>
        </header>
        <div className="operations-page-head">
          <h1>Orders</h1>
          <p>{new Intl.DateTimeFormat("en-BS", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</p>
        </div>
        {preview && <div className="operations-preview-banner"><WarningCircle size={17} weight="fill" />Local preview data. Deployed orders are stored privately in Netlify Blobs.</div>}

        <div className="operations-frame">
          <section className="operations-queue">
            <div className="operations-summary" aria-label="Order summary">
              <button type="button" onClick={() => chooseFilter("attention")}><span>Needs attention</span><strong>{counts.attention}</strong></button>
              <button type="button" onClick={() => chooseFilter("unfulfilled")}><span>Unfulfilled</span><strong>{counts.unfulfilled}</strong></button>
              <button type="button" onClick={() => chooseFilter("ready")}><span>Ready</span><strong>{counts.ready}</strong></button>
              <div><span>Today</span><strong>{orders[0] ? money(orders[0], todaysRevenue) : "BSD $0.00"}</strong></div>
            </div>
            <div className="operations-search-wrap">
              <MagnifyingGlass size={19} weight="light" />
              <label htmlFor="operations-order-search" className="sr-only">Search order or customer</label>
              <input id="operations-order-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order or customer" />
            </div>
            <div className="operations-tabs" role="tablist" aria-label="Order status">
              {(Object.keys(filterLabels) as Filter[]).map((key) => (
                <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => chooseFilter(key)}>
                  {filterLabels[key]}<span>{counts[key]}</span>
                </button>
              ))}
            </div>
            <div className="operations-table-wrap">
              {visible.length ? (
                <table className="operations-table">
                  <thead><tr><th>Order</th><th>Customer</th><th>Method</th><th>Total</th><th>Status</th><th>Time</th></tr></thead>
                  <tbody>{visible.map((order) => (
                    <tr key={order.id} className={selected?.id === order.id ? "is-selected" : ""} onClick={() => setSelectedId(order.id)}>
                      <td><button type="button" onClick={() => setSelectedId(order.id)}>{order.orderNumber}</button></td>
                      <td>{order.customerName}</td>
                      <td>{order.shippingAmount > 0 ? "Delivery" : "Pickup"}</td>
                      <td>{money(order, order.total)}</td>
                      <td><span className={`operations-status operations-status-${order.fulfillmentStatus}`}>{statusLabel(order)}</span></td>
                      <td>{time(order.createdAt)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              ) : (
                <div className="operations-empty"><Package size={30} weight="thin" /><h2>No orders here.</h2><p>Orders matching this view will appear as soon as payment is confirmed.</p></div>
              )}
            </div>
          </section>

          <aside className="operations-inspector" aria-live="polite">
            {selected ? (
              <>
                <div className="operations-inspector-head">
                  <div><h2>Order {selected.orderNumber}</h2><p>{statusLabel(selected)}</p></div>
                  {orderNeedsAttention(selected) && <WarningCircle size={24} weight="light" aria-label="Needs attention" />}
                </div>
                <dl className="operations-details">
                  <div><dt>Customer</dt><dd>{selected.customerName}</dd></div>
                  <div><dt>Email</dt><dd>{maskedEmail(selected.customerEmail)}</dd></div>
                  {selected.customerPhone && <div><dt>Phone</dt><dd>{selected.customerPhone}</dd></div>}
                  <div><dt>Fulfillment</dt><dd>{selected.shippingAmount > 0 ? "Delivery" : "Pickup"}<small>{deliveryAddress(selected)}</small></dd></div>
                </dl>
                <div className="operations-items">
                  <div className="operations-section-label"><span>Items</span><span>Qty</span><span>Price</span></div>
                  {selected.lineItems.map((item, index) => (
                    <div className="operations-item" key={`${item.name}-${index}`}>
                      <div className="operations-item-image">
                        {item.image ? <Image src={item.image} alt="" width={56} height={64} /> : <Package size={20} weight="thin" />}
                      </div>
                      <div><strong>{item.name}</strong></div>
                      <span>{item.quantity}</span>
                      <span>{money(selected, item.amount)}</span>
                    </div>
                  ))}
                </div>
                <dl className="operations-totals">
                  <div><dt>Subtotal</dt><dd>{money(selected, selected.subtotal)}</dd></div>
                  {selected.shippingAmount > 0 && <div><dt>Delivery</dt><dd>{money(selected, selected.shippingAmount)}</dd></div>}
                  <div><dt>VAT</dt><dd>{money(selected, selected.taxAmount)}</dd></div>
                  <div className="operations-total"><dt>Total</dt><dd>{money(selected, selected.total)}</dd></div>
                </dl>
                <dl className="operations-integrations">
                  <div><dt>Loyverse sale</dt><dd>{selected.loyverseSyncStatus} · {selected.loyverseSyncAttempts}/8 attempts</dd></div>
                  {selected.loyverseRefundSyncStatus && selected.loyverseRefundSyncStatus !== "not_required" && <div><dt>Loyverse refund</dt><dd>{selected.loyverseRefundSyncStatus} · {selected.loyverseRefundSyncAttempts}/8 attempts</dd></div>}
                  <div><dt>Confirmation email</dt><dd>{selected.confirmationEmailStatus}</dd></div>
                  <div><dt>Fulfillment email</dt><dd>{selected.fulfillmentEmailStatus}</dd></div>
                  <div><dt>Order received</dt><dd>{dateTime(selected.createdAt)}</dd></div>
                </dl>
                {notice && <div className={`operations-notice is-${notice.tone}`} role="status">{notice.tone === "success" ? <CheckCircle size={18} weight="fill" /> : <WarningCircle size={18} weight="fill" />}{notice.text}</div>}
                <div className="operations-actions">
                  {selected.fulfillmentStatus === "unfulfilled" && <button type="button" className="operations-primary-button" disabled={busy || preview} onClick={() => setConfirmation({ status: "ready", order: selected })}>{preview ? "Preview only" : "Mark ready"}</button>}
                  {selected.fulfillmentStatus === "ready" && <button type="button" className="operations-primary-button" disabled={busy || preview} onClick={() => setConfirmation({ status: "fulfilled", order: selected })}>{preview ? "Preview only" : "Mark fulfilled"}</button>}
                  {!preview && !['fulfilled', 'cancelled'].includes(selected.fulfillmentStatus) && <button type="button" className="operations-cancel-button" disabled={busy} onClick={() => setConfirmation({ status: "cancelled", order: selected })}>Cancel order</button>}
                </div>
                <div className="operations-activity">
                  <h3>Activity</h3>
                  <div><span aria-hidden="true" /><p><strong>Payment {selected.paymentStatus}</strong><small>{money(selected, selected.total)} received online</small></p><time>{dateTime(selected.createdAt)}</time></div>
                  <div><span aria-hidden="true" /><p><strong>Order received</strong><small>Order placed online</small></p><time>{dateTime(selected.createdAt)}</time></div>
                </div>
              </>
            ) : <div className="operations-empty"><Package size={30} weight="thin" /><h2>Select an order.</h2></div>}
          </aside>
        </div>
      </section>

      {confirmation && (
        <div className="operations-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setConfirmation(null)}>
          <div className="operations-modal" role="alertdialog" aria-modal="true" aria-labelledby="operations-confirm-title">
            <button type="button" className="operations-modal-close" onClick={() => setConfirmation(null)} aria-label="Close"><X size={18} /></button>
            <h2 id="operations-confirm-title">{confirmation.status === "cancelled" ? "Cancel this order?" : `Mark order ${confirmation.status}?`}</h2>
            <p>{confirmation.status === "cancelled" ? "The customer will receive a cancellation email. Payment refunds remain a separate workflow." : `The customer will receive a ${confirmation.status} update by email.`}</p>
            <div><button type="button" className={confirmation.status === "cancelled" ? "operations-danger-button" : "operations-primary-button"} disabled={busy} onClick={() => transition(confirmation.status, confirmation.order)}>Confirm {confirmation.status}</button><button type="button" onClick={() => setConfirmation(null)}>Go back</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
