"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowSquareOut, CheckCircle, EnvelopeSimple, ImageSquare, LockKey, MagnifyingGlass, Package, PlugsConnected, SignOut, Storefront, Tag, Users, WarningCircle } from "@phosphor-icons/react";
import { maskCustomerEmail } from "@/lib/customer-profile";
import type { OperationsCustomer, OperationsCustomers } from "@/lib/operations-customer-types";
import type { ScentFamily } from "@/lib/types";

type View = "all" | "returning" | "vip" | "newsletter";
const families: ScentFamily[] = ["Floral", "Fresh", "Woody", "Amber", "Gourmand"];

function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function money(customer: OperationsCustomer, amount: number) { return new Intl.NumberFormat("en-BS", { style: "currency", currency: customer.currency }).format(amount); }
function date(value: string) { const day = new Date(value); const now = new Date(); return day.toDateString() === now.toDateString() ? "Today" : new Intl.DateTimeFormat("en-BS", { dateStyle: "medium" }).format(day); }

export function OperationsCustomersConsole({ initialCustomers }: { initialCustomers: OperationsCustomers }) {
  const [data, setData] = useState(initialCustomers);
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState((initialCustomers.customers.find((customer) => customer.vip) || initialCustomers.customers[0])?.email || "");
  const initial = initialCustomers.customers.find((customer) => customer.email === selectedEmail) || initialCustomers.customers[0];
  const [familiesDraft, setFamiliesDraft] = useState<ScentFamily[]>(initial?.preferredFamilies || []);
  const [notes, setNotes] = useState(initial?.staffNotes || "");
  const [vip, setVip] = useState(Boolean(initial?.vip));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const selected = data.customers.find((customer) => customer.email === selectedEmail) || data.customers[0];
  const visible = useMemo(() => data.customers.filter((customer) => {
    const segment = view === "all" || (view === "returning" ? customer.orderCount > 1 : view === "vip" ? customer.vip : customer.newsletterStatus === "subscribed");
    const term = query.trim().toLowerCase();
    return segment && (!term || [customer.name, customer.email, customer.phone || ""].join(" ").toLowerCase().includes(term));
  }), [data.customers, query, view]);

  function choose(customer: OperationsCustomer) { setSelectedEmail(customer.email); setFamiliesDraft(customer.preferredFamilies); setNotes(customer.staffNotes); setVip(customer.vip); setNotice(null); }
  function toggleFamily(family: ScentFamily) { setFamiliesDraft((current) => current.includes(family) ? current.filter((item) => item !== family) : [...current, family]); }
  async function refresh(email: string) { const response = await fetch("/api/operations/customers", { cache: "no-store" }); const body = await response.json() as OperationsCustomers & { error?: string }; if (!response.ok) throw new Error(body.error || "Customers could not be refreshed"); setData(body); const profile = body.customers.find((customer) => customer.email === email); if (profile) { setFamiliesDraft(profile.preferredFamilies); setNotes(profile.staffNotes); setVip(profile.vip); } }
  async function save() { if (!selected) return; setBusy(true); setNotice(null); try { const response = await fetch("/api/operations/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: selected.email, preferredFamilies: familiesDraft, staffNotes: notes, vip }) }); const body = await response.json() as { error?: string }; if (!response.ok) throw new Error(body.error || "Client profile could not be saved"); await refresh(selected.email); setNotice({ tone: "success", text: `${selected.name}'s client profile is saved.` }); } catch (caught) { setNotice({ tone: "error", text: caught instanceof Error ? caught.message : "Client profile could not be saved" }); } finally { setBusy(false); } }
  async function signOut() { await fetch("/api/operations/session", { method: "DELETE" }); window.location.assign("/operations/login"); }

  return <div className="operations-app operations-customers-app">
    <aside className="operations-sidebar"><div className="operations-wordmark">AURUM PRIVÉE</div><p className="operations-rail-label">Operations</p><nav aria-label="Operations navigation">
      <Link href="/operations"><Package size={21} weight="light" />Orders</Link><Link href="/operations/inquiries"><EnvelopeSimple size={21} weight="light" />Client care</Link><Link href="/operations/catalog"><Tag size={21} weight="light" />Catalog</Link><Link href="/operations/images"><ImageSquare size={21} weight="light" />Product images</Link><Link href="/operations/integrations"><PlugsConnected size={21} weight="light" />Integrations</Link><Link className="is-selected" href="/operations/customers"><Users size={21} weight="light" />Customers</Link>
    </nav><div className="operations-rail-utilities"><a href="/" target="_blank" rel="noreferrer"><ArrowSquareOut size={20} weight="light" />View storefront</a><button type="button" onClick={signOut}><SignOut size={20} weight="light" />Sign out</button></div></aside>
    <section className="operations-workspace"><header className="operations-topbar"><div><Storefront size={18} weight="light" /><span>Nassau store</span></div><div>Clienteling</div></header><div className="operations-page-head operations-customers-page-head"><h1>Customers</h1><p>Recognize returning clients and serve every fragrance order with context.</p></div>
      <div className="operations-frame operations-customers-frame"><section className="operations-queue operations-customers-queue">
        <div className="operations-summary operations-customers-summary"><button onClick={() => setView("all")}><span>Customers</span><strong>{data.totals.all}</strong></button><button onClick={() => setView("returning")}><span>Returning</span><strong>{data.totals.returning}</strong></button><button onClick={() => setView("vip")}><span>VIP</span><strong>{data.totals.vip}</strong></button><button onClick={() => setView("newsletter")}><span>Newsletter</span><strong>{data.totals.newsletter}</strong></button></div>
        <div className="operations-search-wrap"><MagnifyingGlass size={19} /><label className="sr-only" htmlFor="customer-search">Search customer, email or phone</label><input id="customer-search" placeholder="Search customer, email or phone" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <div className="operations-tabs" role="tablist">{(["all", "returning", "vip", "newsletter"] as View[]).map((key) => <button key={key} role="tab" aria-selected={view === key} onClick={() => setView(key)}>{key === "all" ? "All customers" : key[0].toUpperCase() + key.slice(1)}<span>{key === "all" ? data.totals.all : data.totals[key]}</span></button>)}</div>
        <div className="operations-customer-head"><span>Customer</span><span>Most recent order</span><span>Orders</span><span>Lifetime spend</span><span>Segment</span></div>
        <div className="operations-customer-list">{visible.map((customer) => <button key={customer.email} className={selected?.email === customer.email ? "is-selected" : ""} onClick={() => choose(customer)}><span className="operations-avatar">{initials(customer.name)}</span><span className="operations-customer-name"><strong>{customer.name}</strong><small>{maskCustomerEmail(customer.email)}</small></span><span>{date(customer.lastOrderAt)}</span><span>{customer.orderCount}</span><span>{money(customer, customer.lifetimeSpend)}</span><span>{customer.vip ? "VIP" : "—"}</span></button>)}</div>
      </section><aside className="operations-inspector operations-customer-inspector">{selected && <><div className="operations-customer-title"><div><h2>{selected.name}</h2><p>{maskCustomerEmail(selected.email)}</p><p>{selected.phone || "No phone provided"}</p></div><label className="operations-vip-toggle"><input type="checkbox" checked={vip} onChange={(event) => setVip(event.target.checked)} />VIP</label></div>
        <dl className="operations-customer-stats"><div><dt>Lifetime {selected.currency}</dt><dd>{money(selected, selected.lifetimeSpend)}</dd></div><div><dt>Orders</dt><dd>{selected.orderCount}</dd></div><div><dt>Last order</dt><dd>{date(selected.lastOrderAt)}</dd></div><div><dt>Newsletter</dt><dd>{selected.newsletterStatus === "subscribed" ? "Subscribed" : "Not subscribed"}</dd></div></dl>
        <section className="operations-client-profile"><h3>Client profile</h3><p>Preferred fragrance families</p><div className="operations-family-options">{families.map((family) => <label key={family}><input type="checkbox" checked={familiesDraft.includes(family)} onChange={() => toggleFamily(family)} />{family}</label>)}</div><label className="operations-notes-label">Notes (staff only)<textarea maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} /><small>{notes.length} / 1000</small></label></section>
        <section className="operations-customer-orders"><h3>Order history</h3>{selected.orders.slice(0, 4).map((order) => <Link key={order.id} href={`/operations?order=${order.id}`}><span>{order.orderNumber}</span><span>{date(order.createdAt)}</span><span>{order.status}</span><strong>{money(selected, order.total)}</strong><ArrowRight size={15} /></Link>)}</section>
        <section className="operations-connected-records"><h3>Connected records</h3><div><span>Loyverse customer</span><strong className={selected.loyverseLinked ? "is-linked" : ""}>{selected.loyverseLinked ? "Linked" : "Not linked"}</strong></div><div><span>Newsletter</span><strong>{selected.newsletterStatus === "subscribed" ? "Subscribed" : "Not subscribed"}</strong></div></section>
        {notice && <div className={`operations-notice is-${notice.tone}`} role="status">{notice.tone === "success" ? <CheckCircle size={18} weight="fill" /> : <WarningCircle size={18} weight="fill" />}{notice.text}</div>}
        <div className="operations-customer-actions"><button className="operations-primary-button" disabled={busy || data.preview} onClick={save}>{busy ? "Saving" : data.preview ? "Connect database" : "Save client profile"}</button><Link href={`/operations?order=${selected.orders[0]?.id || ""}`}>Open latest order</Link></div><p className="operations-customer-privacy"><LockKey size={14} />Staff notes stay inside Aurum Privée and are never sent to Loyverse.</p>
      </>}</aside></div>
    </section>
  </div>;
}
