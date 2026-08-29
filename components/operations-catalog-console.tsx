"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowSquareOut,
  CheckCircle,
  EnvelopeSimple,
  ImageSquare,
  LockKey,
  MagnifyingGlass,
  Package,
  PlugsConnected,
  SignOut,
  Storefront,
  Tag,
  Users,
  WarningCircle,
} from "@phosphor-icons/react";
import type { OperationsCatalog, OperationsCatalogProduct } from "@/lib/operations-catalog-types";
import type { ScentFamily } from "@/lib/types";

type View = "needsCuration" | "featured" | "hidden" | "all";
type Draft = Pick<OperationsCatalogProduct, "description" | "scentFamily" | "featured" | "newArrival" | "storefrontVisible" | "sortOrder"> & {
  topNotes: string;
  heartNotes: string;
  baseNotes: string;
};

const families: ScentFamily[] = ["Floral", "Fresh", "Woody", "Amber", "Gourmand"];

function draftFor(product: OperationsCatalogProduct): Draft {
  return {
    description: product.description,
    scentFamily: product.scentFamily,
    topNotes: product.notes.top.join(", "),
    heartNotes: product.notes.heart.join(", "),
    baseNotes: product.notes.base.join(", "),
    featured: product.featured,
    newArrival: product.newArrival,
    storefrontVisible: product.storefrontVisible,
    sortOrder: product.sortOrder,
  };
}

function splitNotes(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function money(amount: number) {
  return new Intl.NumberFormat("en-BS", { style: "currency", currency: "BSD" }).format(amount);
}

function curationLabel(product: OperationsCatalogProduct) {
  if (!product.storefrontVisible) return "Hidden";
  if (!product.curatedAt) return "Needs curation";
  return "Curated";
}

export function OperationsCatalogConsole({ initialCatalog }: { initialCatalog: OperationsCatalog }) {
  const initialSelected = initialCatalog.products.find((product) => product.name.includes("Dolce Rose")) || initialCatalog.products.find((product) => !product.curatedAt) || initialCatalog.products[0];
  const [catalog, setCatalog] = useState(initialCatalog);
  const [view, setView] = useState<View>(initialCatalog.totals.needsCuration ? "needsCuration" : "all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialSelected?.id || "");
  const [draft, setDraft] = useState<Draft | null>(initialSelected ? draftFor(initialSelected) : null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const initialSelectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    initialSelectedRef.current?.scrollIntoView({ block: "start" });
  }, []);

  const selected = catalog.products.find((product) => product.id === selectedId) || catalog.products[0];
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return catalog.products.filter((product) => {
      const matchesView = view === "all"
        || (view === "needsCuration" ? !product.curatedAt : view === "featured" ? product.featured : !product.storefrontVisible);
      const matchesQuery = !term || [product.brand, product.name, product.sku || "", product.barcode || "", product.category || ""].join(" ").toLowerCase().includes(term);
      return matchesView && matchesQuery;
    });
  }, [catalog.products, query, view]);

  function chooseProduct(product: OperationsCatalogProduct) {
    setSelectedId(product.id);
    setDraft(draftFor(product));
    setNotice(null);
  }

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setNotice(null);
  }

  async function refreshCatalog(productId: string) {
    const response = await fetch("/api/operations/catalog", { cache: "no-store" });
    const body = await response.json() as OperationsCatalog & { error?: string };
    if (!response.ok) throw new Error(body.error || "Catalog could not be refreshed");
    setCatalog(body);
    const refreshed = body.products.find((product) => product.id === productId);
    if (refreshed) setDraft(draftFor(refreshed));
  }

  async function save() {
    if (!selected || !draft) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/operations/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selected.id,
          description: draft.description,
          scentFamily: draft.scentFamily,
          notes: { top: splitNotes(draft.topNotes), heart: splitNotes(draft.heartNotes), base: splitNotes(draft.baseNotes) },
          featured: draft.featured,
          newArrival: draft.newArrival,
          storefrontVisible: draft.storefrontVisible,
          sortOrder: draft.sortOrder,
        }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Curation could not be saved");
      await refreshCatalog(selected.id);
      setNotice({ tone: "success", text: `${selected.brand} ${selected.name} is curated and published.` });
    } catch (caught) {
      setNotice({ tone: "error", text: caught instanceof Error ? caught.message : "Curation could not be saved" });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/operations/session", { method: "DELETE" });
    window.location.assign("/operations/login");
  }

  return (
    <div className="operations-app operations-catalog-app">
      <aside className="operations-sidebar">
        <div className="operations-wordmark">AURUM PRIVÉE</div>
        <p className="operations-rail-label">Operations</p>
        <nav aria-label="Operations navigation">
          <Link href="/operations"><Package size={21} weight="light" />Orders</Link>
          <Link href="/operations/inquiries"><EnvelopeSimple size={21} weight="light" />Client care</Link>
          <Link className="is-selected" href="/operations/catalog"><Tag size={21} weight="light" />Catalog</Link>
          <Link href="/operations/images"><ImageSquare size={21} weight="light" />Product images</Link>
          <Link href="/operations/integrations"><PlugsConnected size={21} weight="light" />Integrations</Link>
          <Link href="/operations/customers"><Users size={21} weight="light" />Customers</Link>
        </nav>
        <div className="operations-rail-utilities">
          <a href="/" target="_blank" rel="noreferrer"><ArrowSquareOut size={20} weight="light" />View storefront</a>
          <button type="button" onClick={signOut}><SignOut size={20} weight="light" />Sign out</button>
        </div>
      </aside>

      <section className="operations-workspace">
        <header className="operations-topbar">
          <div><Storefront size={18} weight="light" /><span>Nassau store</span></div>
          <div className="operations-sync"><CheckCircle size={18} weight="fill" />{catalog.totals.all} active</div>
        </header>
        <div className="operations-page-head operations-catalog-page-head">
          <h1>Catalog</h1>
          <p>Shape how the live Loyverse assortment appears in the Aurum Privée store.</p>
        </div>

        <div className="operations-frame operations-catalog-frame">
          <section className="operations-queue operations-catalog-queue">
            <div className="operations-summary operations-catalog-summary">
              <button type="button" onClick={() => setView("all")}><span>Catalog</span><strong>{catalog.totals.all}</strong></button>
              <button type="button" onClick={() => setView("needsCuration")}><span>Needs curation</span><strong>{catalog.totals.needsCuration}</strong></button>
              <button type="button" onClick={() => setView("featured")}><span>Featured</span><strong>{catalog.totals.featured}</strong></button>
              <button type="button" onClick={() => setView("hidden")}><span>Hidden</span><strong>{catalog.totals.hidden}</strong></button>
            </div>
            <div className="operations-search-wrap">
              <MagnifyingGlass size={19} weight="light" />
              <label htmlFor="operations-catalog-search" className="sr-only">Search product, SKU or barcode</label>
              <input id="operations-catalog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, SKU or barcode" />
            </div>
            <div className="operations-tabs" role="tablist" aria-label="Catalog curation status">
              {(["needsCuration", "featured", "hidden", "all"] as View[]).map((key) => {
                const labels = { needsCuration: "Needs curation", featured: "Featured", hidden: "Hidden", all: "All products" };
                const count = key === "all" ? catalog.totals.all : catalog.totals[key];
                return <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)}>{labels[key]}<span>{count}</span></button>;
              })}
            </div>
            <div className="operations-catalog-list" role="list" aria-label="Catalog products">
              {visible.length ? visible.map((product) => (
                <button ref={product.id === initialSelected?.id ? initialSelectedRef : undefined} key={product.id} type="button" role="listitem" className={selected?.id === product.id ? "is-selected" : ""} onClick={() => chooseProduct(product)}>
                  <span className="operations-catalog-thumb">{product.imageUrl === "/images/product-awaiting-photography.webp" ? <ImageSquare size={21} weight="thin" /> : <Image src={product.imageUrl} alt="" width={58} height={68} />}</span>
                  <span className="operations-catalog-copy"><small>{product.brand}</small><strong>{product.name}</strong><small>{product.sku ? `SKU ${product.sku}` : product.category || "Fragrance"}</small></span>
                  <span className={`operations-curation-status is-${!product.storefrontVisible ? "hidden" : product.curatedAt ? "curated" : "needed"}`}>{curationLabel(product)}</span>
                  <ArrowRight size={17} weight="light" />
                </button>
              )) : <div className="operations-empty"><Tag size={30} weight="thin" /><h2>No products here.</h2><p>Try a different status or search term.</p></div>}
            </div>
          </section>

          <aside className="operations-inspector operations-catalog-inspector" aria-live="polite">
            {selected && draft ? <>
              <div className="operations-catalog-inspector-head">
                <span>{selected.imageUrl === "/images/product-awaiting-photography.webp" ? <ImageSquare size={25} weight="thin" /> : <Image src={selected.imageUrl} alt="" width={78} height={92} />}</span>
                <div><small>{selected.brand}</small><h2>{selected.name}</h2><p className={`is-${selected.curatedAt ? "curated" : "needed"}`}><i />{curationLabel(selected)}</p></div>
              </div>
              <div className="operations-curation-form">
                <label><span>Scent family</span><select value={draft.scentFamily} onChange={(event) => updateDraft("scentFamily", event.target.value as ScentFamily)}>{families.map((family) => <option key={family}>{family}</option>)}</select></label>
                <label className="is-description"><span>Storefront description</span><textarea value={draft.description} maxLength={1200} onChange={(event) => updateDraft("description", event.target.value)} /></label>
                <label><span>Top notes</span><input value={draft.topNotes} placeholder="Comma-separated" onChange={(event) => updateDraft("topNotes", event.target.value)} /></label>
                <label><span>Heart notes</span><input value={draft.heartNotes} placeholder="Comma-separated" onChange={(event) => updateDraft("heartNotes", event.target.value)} /></label>
                <label><span>Base notes</span><input value={draft.baseNotes} placeholder="Comma-separated" onChange={(event) => updateDraft("baseNotes", event.target.value)} /></label>
                <label className="operations-switch-row"><span>Featured collection</span><input type="checkbox" checked={draft.featured} onChange={(event) => updateDraft("featured", event.target.checked)} /><i /></label>
                <label className="operations-switch-row"><span>New arrival</span><input type="checkbox" checked={draft.newArrival} onChange={(event) => updateDraft("newArrival", event.target.checked)} /><i /></label>
                <label className="operations-switch-row"><span>Visible online</span><input type="checkbox" checked={draft.storefrontVisible} onChange={(event) => updateDraft("storefrontVisible", event.target.checked)} /><i /></label>
                <label className="is-sort"><span>Sort order</span><input type="number" min="0" max="100000" value={draft.sortOrder} onChange={(event) => updateDraft("sortOrder", Number(event.target.value))} /></label>
              </div>
              <div className="operations-loyverse-source-head"><span><CheckCircle size={16} weight="fill" />Synced from Loyverse</span></div>
              <dl className="operations-loyverse-source">
                <div><dt>Price BSD</dt><dd>{money(selected.price)}</dd></div><div><dt>Stock</dt><dd>{selected.stock}</dd></div><div><dt>SKU</dt><dd>{selected.sku || "Not set"}</dd></div><div><dt>Barcode</dt><dd>{selected.barcode || "Not set"}</dd></div>
              </dl>
              <p className="operations-source-note"><LockKey size={14} weight="light" />Price, stock, SKU and barcode remain controlled by Loyverse.</p>
              {notice && <div className={`operations-notice is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.tone === "success" ? <CheckCircle size={18} weight="fill" /> : <WarningCircle size={18} weight="fill" />}{notice.text}</div>}
              <div className="operations-catalog-actions"><button type="button" className="operations-primary-button" disabled={busy || catalog.preview} onClick={save}>{busy ? "Saving" : catalog.preview ? "Connect database" : "Save curation"}</button><Link href={`/shop/${selected.slug}`} target="_blank">View product <ArrowRight size={15} /></Link></div>
            </> : <div className="operations-empty"><Tag size={30} weight="thin" /><h2>Select a product.</h2></div>}
          </aside>
        </div>
      </section>
    </div>
  );
}
