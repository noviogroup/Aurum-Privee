"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowSquareOut, CheckCircle, EnvelopeSimple, FileText, Gear, ImageSquare, LockKey, MagnifyingGlass, Package, SignOut, Storefront, Tag, Users, WarningCircle } from "@phosphor-icons/react";
import type { OperationsQuoteRequests, QuoteRequestStatus } from "@/lib/operations-quote-types";

type View = "all" | "open" | "quoted" | "closed";
const labels: Record<View, string> = { all: "All requests", open: "Open", quoted: "Quoted", closed: "Closed" };
const statusLabels: Record<QuoteRequestStatus, string> = { new: "New", reviewing: "Reviewing", needs_info: "Needs information", quoted: "Quoted", closed: "Closed" };
function dateTime(value: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }

export function OperationsQuotesConsole({ initialData }: { initialData: OperationsQuoteRequests }) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>("open");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState((initialData.requests.find((request) => request.status === "new") || initialData.requests[0])?.id || "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const selected = data.requests.find((request) => request.id === selectedId) || data.requests[0];
  const visible = useMemo(() => data.requests.filter((request) => {
    const segment = view === "all" || (view === "open" ? ["new", "reviewing", "needs_info"].includes(request.status) : request.status === view);
    const term = query.trim().toLowerCase();
    return segment && (!term || [request.reference, request.companyName, request.contactName, request.email, request.buyerType].join(" ").toLowerCase().includes(term));
  }), [data.requests, query, view]);

  async function refresh() {
    const response = await fetch("/api/operations/quote-requests", { cache: "no-store" });
    const body = await response.json() as OperationsQuoteRequests & { error?: string };
    if (!response.ok) throw new Error(body.error || "Quote requests could not be refreshed");
    setData(body);
  }
  async function updateStatus(status: QuoteRequestStatus) {
    if (!selected) return;
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/operations/quote-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: selected.id, status }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Quote request could not be updated");
      await refresh();
      setNotice({ tone: "success", text: `${selected.reference} is now ${statusLabels[status].toLowerCase()}.` });
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "Quote request could not be updated" }); }
    finally { setBusy(false); }
  }
  async function signOut() { await fetch("/api/operations/session", { method: "DELETE" }); window.location.assign("/operations/login"); }

  return <div className="operations-app operations-inquiries-app">
    <aside className="operations-sidebar"><div className="operations-wordmark">AURUM PRIVÉE</div><p className="operations-rail-label">Operations</p><nav aria-label="Operations navigation">
      <Link href="/operations"><Package size={21} weight="light" />Orders</Link><Link className="is-selected" href="/operations/quotes"><FileText size={21} weight="light" />Quote requests</Link><Link href="/operations/inquiries"><EnvelopeSimple size={21} weight="light" />Client care</Link><Link href="/operations/catalog"><Tag size={21} weight="light" />Catalog</Link><Link href="/operations/images"><ImageSquare size={21} weight="light" />Product images</Link><Link href="/operations/customers"><Users size={21} weight="light" />Customers</Link><Link href="/operations/integrations"><Gear size={21} weight="light" />Integrations</Link>
    </nav><div className="operations-rail-utilities"><a href="/" target="_blank" rel="noreferrer"><ArrowSquareOut size={20} weight="light" />View storefront</a><button type="button" onClick={signOut}><SignOut size={20} weight="light" />Sign out</button></div></aside>
    <section className="operations-workspace"><header className="operations-topbar"><div><Storefront size={18} weight="light" /><span>Trade catalogue</span></div><div className="operations-sync"><FileText size={18} weight="light" />Quote requests</div></header><div className="operations-page-head operations-inquiries-page-head"><h1>Quote requests</h1><p>Review buyer selections, quantities and trade requirements.</p></div>{!data.configured && <div className="operations-preview-banner"><WarningCircle size={17} weight="fill" />Private quote storage is unavailable.</div>}
      <div className="operations-frame operations-inquiries-frame"><section className="operations-queue operations-inquiries-queue"><div className="operations-summary operations-inquiries-summary"><button onClick={() => setView("all")}><span>Requests</span><strong>{data.totals.all}</strong></button><button onClick={() => setView("open")}><span>Open</span><strong>{data.totals.open}</strong></button><button onClick={() => setView("quoted")}><span>Quoted</span><strong>{data.totals.quoted}</strong></button><button onClick={() => setView("closed")}><span>Closed</span><strong>{data.totals.closed}</strong></button></div><div className="operations-search-wrap"><MagnifyingGlass size={19} /><label className="sr-only" htmlFor="quote-search">Search quote requests</label><input id="quote-search" placeholder="Search company, buyer or reference" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="operations-tabs" role="tablist">{(Object.keys(labels) as View[]).map((key) => <button key={key} role="tab" aria-selected={view === key} onClick={() => setView(key)}>{labels[key]}<span>{data.totals[key]}</span></button>)}</div>
        <div className="operations-inquiry-list">{visible.length ? visible.map((request) => <button key={request.id} className={selected?.id === request.id ? "is-selected" : ""} onClick={() => { setSelectedId(request.id); setNotice(null); }}><span className={`operations-inquiry-dot is-${request.status}`} /><span><strong>{request.companyName}</strong><small>{request.buyerType} · {request.lines.length} {request.lines.length === 1 ? "line" : "lines"}</small><p>{request.contactName} · {request.reference}</p></span><span><i>{statusLabels[request.status]}</i><small>{dateTime(request.createdAt)}</small></span></button>) : <div className="operations-empty"><FileText size={30} weight="thin" /><h2>No requests here.</h2><p>Trade enquiries matching this view will appear here.</p></div>}</div></section>
        <aside className="operations-inspector operations-inquiry-inspector">{selected && <><div className="operations-inquiry-title"><div><p className="utility-label">{selected.reference}</p><h2>{selected.companyName}</h2><span className={`operations-status operations-status-${selected.status}`}>{statusLabels[selected.status]}</span></div></div><dl className="operations-inquiry-meta"><div><dt>Buyer</dt><dd>{selected.contactName}</dd></div><div><dt>Email</dt><dd><a href={`mailto:${selected.email}`}>{selected.email}</a></dd></div>{selected.phone && <div><dt>Phone</dt><dd>{selected.phone}</dd></div>}<div><dt>Buyer type</dt><dd>{selected.buyerType}</dd></div>{selected.destinationCountry && <div><dt>Destination</dt><dd>{selected.destinationCountry}</dd></div>}<div><dt>Received</dt><dd>{dateTime(selected.createdAt)}</dd></div></dl><section className="operations-quote-lines"><h3>Requested products</h3>{selected.lines.map((line) => <article key={line.productId}><div><strong>{line.brand} {line.name}</strong><span>{[line.concentration, line.size].filter(Boolean).join(" · ")}</span>{line.note && <p>{line.note}</p>}</div><b>Qty {line.quantity}</b></article>)}</section>{selected.message && <section className="operations-inquiry-message"><h3>Buyer’s note</h3><p>{selected.message}</p></section>}
          <div className="operations-quote-status"><label htmlFor="quote-status">Workflow status</label><select id="quote-status" value={selected.status} disabled={busy || !data.configured} onChange={(event) => void updateStatus(event.target.value as QuoteRequestStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>{notice && <div className={`operations-notice is-${notice.tone}`} role="status">{notice.tone === "success" ? <CheckCircle size={18} weight="fill" /> : <WarningCircle size={18} weight="fill" />}{notice.text}</div>}<a className="operations-primary-button operations-email-buyer" href={`mailto:${selected.email}?subject=${encodeURIComponent(`Aurum Privée quote request ${selected.reference}`)}`}><EnvelopeSimple size={15} /> Email buyer</a><p className="operations-customer-privacy"><LockKey size={14} />Pricing and buyer information remain private to authorized staff.</p></>}</aside></div>
    </section>
  </div>;
}
