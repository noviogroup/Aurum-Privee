"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle, FileText, Minus, Plus, Trash, WarningCircle } from "@phosphor-icons/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useWishlist } from "@/components/wishlist-provider";
import { parseClientCatalogResponse } from "@/lib/client-catalog-response";
import { requestJson } from "@/lib/client-json-request";
import { buyerTypes } from "@/lib/quote-request";
import type { PublicProduct } from "@/lib/types";

type BuyerForm = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  buyerType: typeof buyerTypes[number];
  destinationCountry: string;
  message: string;
  consent: boolean;
  website: string;
};

const initialForm: BuyerForm = { companyName: "", contactName: "", email: "", phone: "", buyerType: "Retailer", destinationCountry: "", message: "", consent: false, website: "" };

export function QuoteList() {
  const { items, savedIds, totalQuantity, hydrated, setQuantity, setNote, removeItem, clearItems } = useWishlist();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<BuyerForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [reference, setReference] = useState("");
  const submissionId = useRef("");
  const requestPending = useRef(false);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => () => requestController.current?.abort(), []);

  useEffect(() => {
    if (!hydrated || savedIds.length === 0) {
      setProducts([]);
      setLoading(false);
      setLoadError("");
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    void (async () => {
      try {
        const { response, data } = await requestJson<unknown>(`/api/catalog?ids=${encodeURIComponent(savedIds.join(","))}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Quote list could not be loaded.");
        const result = parseClientCatalogResponse(data);
        const byId = new Map(result.products.map((product) => [product.id, product]));
        setProducts(savedIds.map((id) => byId.get(id)).filter((product): product is PublicProduct => Boolean(product)));
      } catch {
        if (!controller.signal.aborted) setLoadError("We could not load your quote list. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [hydrated, savedIds]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (formElement.dataset.submitting === "true" || requestPending.current || !form.consent || products.length === 0) return;
    formElement.dataset.submitting = "true";
    requestPending.current = true;
    const controller = new AbortController();
    requestController.current = controller;
    setSubmitting(true);
    setSubmitError("");
    submissionId.current ||= crypto.randomUUID();
    try {
      const body = {
        ...form,
        submissionId: submissionId.current,
        lines: items.filter((item) => products.some((product) => product.id === item.productId)),
      };
      const { response, data } = await requestJson<{ message?: string; reference?: string }>("/api/quote-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok || !data.reference) throw new Error(data.message || "Your quote request could not be sent.");
      setReference(data.reference);
      clearItems();
      setForm(initialForm);
    } catch (error) {
      if (controller.signal.aborted) return;
      setSubmitError(error instanceof Error ? error.message : "Your quote request could not be sent.");
    } finally {
      if (requestController.current === controller) {
        delete formElement.dataset.submitting;
        requestController.current = null;
        requestPending.current = false;
        setSubmitting(false);
      }
    }
  }

  if (reference) return (
    <div className="quote-list-page page-top">
      <section className="quote-success section-shell" aria-labelledby="quote-success-title">
        <CheckCircle size={42} weight="light" aria-hidden="true" />
        <p className="utility-label">Reference {reference}</p>
        <h1 id="quote-success-title">Your request is with us.</h1>
        <p>We have sent an acknowledgement to your inbox. Our team will review availability, quantities and trade terms before responding.</p>
        <div><Link className="button button-primary" href="/shop">Continue browsing</Link><button className="button button-secondary" type="button" onClick={() => { setReference(""); submissionId.current = ""; }}>Start another request</button></div>
      </section>
    </div>
  );

  return (
    <div className="quote-list-page page-top">
      <section className="saved-heading section-shell entrance">
        <h1>Quote list</h1>
        <p>Build a trade enquiry, set your quantities and send the complete list to our team for a tailored quote.</p>
      </section>
      {!hydrated || loading ? <div className="saved-status section-shell" role="status">Preparing your quote list…</div> : loadError ? (
        <section className="saved-empty section-shell" role="alert"><WarningCircle size={30} weight="light" /><h2>Your list is still here.</h2><p>{loadError}</p><button type="button" className="button button-primary" onClick={() => window.location.reload()}>Try again</button></section>
      ) : products.length === 0 ? (
        <section className="saved-empty section-shell"><span className="saved-empty-icon"><FileText size={29} weight="light" /></span><h2>Build your trade request.</h2><p>Add fragrances from the collection, then return here to choose quantities and request wholesale terms.</p><Link className="button button-primary" href="/shop">Browse the catalogue</Link></section>
      ) : (
        <div className="quote-workspace section-shell">
          <section className="quote-selection" aria-labelledby="quote-selection-title">
            <header><div><p className="utility-label">Your selection</p><h2 id="quote-selection-title">{products.length} {products.length === 1 ? "fragrance" : "fragrances"}</h2></div><p>{totalQuantity} {totalQuantity === 1 ? "unit" : "units"} requested</p></header>
            <div className="quote-line-list">{products.map((product) => {
              const item = items.find((candidate) => candidate.productId === product.id)!;
              return <article className="quote-line" key={product.id}>
                <Link className="quote-line-image" href={`/shop/${product.slug}`}><Image src={product.image} alt={product.imageAlt} fill sizes="112px" /></Link>
                <div className="quote-line-copy"><p>{product.brand}</p><h3><Link href={`/shop/${product.slug}`}>{product.name}</Link></h3><span>{[product.concentration, product.size].filter(Boolean).join(" · ")}</span><label>Buyer note<textarea maxLength={500} value={item.note || ""} onChange={(event) => setNote(product.id, event.target.value)} placeholder="Case pack, preferred edition or other detail" /></label></div>
                <div className="quote-line-controls"><label htmlFor={`quantity-${product.id}`}>Quantity</label><div><button type="button" aria-label={`Decrease ${product.name} quantity`} onClick={() => setQuantity(product.id, item.quantity - 1)}><Minus size={14} /></button><input id={`quantity-${product.id}`} type="number" min="1" max="999" inputMode="numeric" value={item.quantity} onChange={(event) => setQuantity(product.id, Number(event.target.value))} /><button type="button" aria-label={`Increase ${product.name} quantity`} onClick={() => setQuantity(product.id, item.quantity + 1)}><Plus size={14} /></button></div><button className="quote-remove" type="button" onClick={() => removeItem(product.id)}><Trash size={15} /> Remove</button></div>
              </article>;
            })}</div>
            <Link className="quote-continue" href="/shop"><Plus size={16} /> Add more fragrances</Link>
          </section>
          <form className="quote-request-form" onSubmit={submit}>
            <div><p className="utility-label">Trade enquiry</p><h2>Request your quote</h2><p>Pricing is prepared privately after our team reviews your business and requested quantities.</p></div>
            <label>Company name<input required minLength={2} maxLength={140} autoComplete="organization" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></label>
            <label>Contact name<input required minLength={2} maxLength={100} autoComplete="name" value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} /></label>
            <label>Business email<input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <div className="quote-form-split"><label>Phone <span>Optional</span><input maxLength={40} autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>Buyer type<select value={form.buyerType} onChange={(event) => setForm({ ...form, buyerType: event.target.value as BuyerForm["buyerType"] })}>{buyerTypes.map((type) => <option key={type}>{type}</option>)}</select></label></div>
            <label>Destination country <span>Optional</span><input maxLength={80} autoComplete="country-name" value={form.destinationCountry} onChange={(event) => setForm({ ...form, destinationCountry: event.target.value })} /></label>
            <label>Request notes <span>Optional</span><textarea maxLength={2000} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Tell us about timing, assortment or delivery requirements." /></label>
            <label className="quote-honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></label>
            <label className="quote-consent"><input required type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} /><span>I agree that Aurum Privée may use these details to prepare and respond to this trade enquiry.</span></label>
            {submitError && <div className="quote-form-error" role="alert"><WarningCircle size={18} />{submitError}</div>}
            <button className="button button-primary" type="submit" disabled={submitting || !form.consent}>{submitting ? "Sending request…" : "Send quote request"}</button>
            <small>This request is not an order, reservation or binding quotation.</small>
          </form>
        </div>
      )}
    </div>
  );
}
