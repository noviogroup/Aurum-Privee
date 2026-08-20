"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
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
  UploadSimple,
  Users,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type { OperationsImageCatalog, OperationsImageProduct } from "@/lib/operations-image-types";

type View = "missing" | "curated" | "loyverse" | "all";

const labels: Record<View, string> = { missing: "Needs images", curated: "Curated", loyverse: "From Loyverse", all: "All products" };

function imageStatus(product: OperationsImageProduct) {
  if (product.missing) return "Needs image";
  if (product.curated) return "Curated";
  return "Loyverse";
}

export function OperationsImagesConsole({ initialCatalog }: { initialCatalog: OperationsImageCatalog }) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [view, setView] = useState<View>(initialCatalog.totals.missing ? "missing" : "all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState((initialCatalog.products.find((product) => product.missing) || initialCatalog.products[0])?.id || "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return catalog.products.filter((product) => {
      const matchesView = view === "all" || (view === "missing" ? product.missing : view === "curated" ? product.curated : !product.missing && !product.curated);
      const matchesQuery = !term || [product.brand, product.name, product.sku || "", product.barcode || "", product.category || ""].join(" ").toLowerCase().includes(term);
      return matchesView && matchesQuery;
    });
  }, [catalog.products, view, query]);
  const selected = catalog.products.find((product) => product.id === selectedId) || visible[0] || catalog.products[0];

  function chooseProduct(product: OperationsImageProduct) {
    setSelectedId(product.id);
    resetFile();
  }

  function resetFile() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setFile(null);
    setPreviewUrl(null);
    setNotice(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function acceptFile(next: File | undefined) {
    resetFile();
    if (!next) return;
    if (next.size > 10_000_000) {
      setNotice({ tone: "error", text: "Image must be 10 MB or smaller." });
      return;
    }
    setFile(next);
    const objectUrl = URL.createObjectURL(next);
    previewUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    acceptFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  }

  async function refreshCatalog() {
    const response = await fetch("/api/operations/images", { cache: "no-store" });
    const body = await response.json() as OperationsImageCatalog & { error?: string };
    if (!response.ok) throw new Error(body.error || "Product images could not be refreshed");
    setCatalog(body);
  }

  async function upload() {
    if (!selected || !file) return;
    setBusy(true);
    setNotice(null);
    const form = new FormData();
    form.set("productId", selected.id);
    form.set("image", file);
    try {
      const response = await fetch("/api/operations/images", { method: "POST", body: form });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Product image could not be published");
      await refreshCatalog();
      resetFile();
      setNotice({ tone: "success", text: `${selected.brand} ${selected.name} now has a curated product image.` });
    } catch (caught) {
      setNotice({ tone: "error", text: caught instanceof Error ? caught.message : "Product image could not be published" });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/operations/session", { method: "DELETE" });
    window.location.assign("/operations/login");
  }

  return (
    <div className="operations-app operations-images-app">
      <aside className="operations-sidebar">
        <div className="operations-wordmark">AURUM PRIVÉE</div>
        <p className="operations-rail-label">Operations</p>
        <nav aria-label="Operations navigation">
          <Link href="/operations"><Package size={21} weight="light" />Orders</Link>
          <Link href="/operations/inquiries"><EnvelopeSimple size={21} weight="light" />Client care</Link>
          <Link href="/operations/catalog"><Tag size={21} weight="light" />Catalog</Link>
          <Link className="is-selected" href="/operations/images"><ImageSquare size={21} weight="light" />Product images</Link>
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
          <div className="operations-sync"><span>Catalog</span>{catalog.preview ? <WarningCircle size={18} weight="fill" /> : <CheckCircle size={18} weight="fill" />}{catalog.preview ? "Preview" : "Live"}</div>
        </header>
        <div className="operations-page-head operations-image-page-head">
          <h1>Product images</h1>
          <p>Complete the catalog with approved retail photography.</p>
        </div>
        {catalog.preview && <div className="operations-preview-banner"><WarningCircle size={17} weight="fill" />Local catalog preview. Connect Supabase Storage to publish images from this screen.</div>}

        <div className="operations-frame operations-image-frame">
          <section className="operations-queue operations-image-queue">
            <div className="operations-summary operations-image-summary" aria-label="Product image summary">
              <button type="button" onClick={() => setView("missing")}><span>Needs images</span><strong>{catalog.totals.missing}</strong></button>
              <button type="button" onClick={() => setView("curated")}><span>Curated</span><strong>{catalog.totals.curated}</strong></button>
              <button type="button" onClick={() => setView("loyverse")}><span>From Loyverse</span><strong>{catalog.totals.loyverse}</strong></button>
              <button type="button" onClick={() => setView("all")}><span>Catalog</span><strong>{catalog.totals.all}</strong></button>
            </div>
            <div className="operations-search-wrap">
              <MagnifyingGlass size={19} weight="light" />
              <label htmlFor="operations-product-search" className="sr-only">Search product, SKU or barcode</label>
              <input id="operations-product-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, SKU or barcode" />
            </div>
            <div className="operations-tabs" role="tablist" aria-label="Product image status">
              {(Object.keys(labels) as View[]).map((key) => (
                <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)}>
                  {labels[key]}<span>{key === "all" ? catalog.totals.all : catalog.totals[key]}</span>
                </button>
              ))}
            </div>
            <div className="operations-product-list" role="list" aria-label="Catalog products">
              {visible.length ? visible.map((product) => (
                <button key={product.id} type="button" role="listitem" className={selected?.id === product.id ? "is-selected" : ""} onClick={() => chooseProduct(product)}>
                  <span className="operations-product-thumb">
                    {!product.missing && product.imageUrl ? <Image src={product.imageUrl} alt="" width={58} height={68} /> : <ImageSquare size={22} weight="thin" />}
                  </span>
                  <span className="operations-product-copy"><small>{product.brand}</small><strong>{product.name}</strong><small>{product.sku ? `SKU ${product.sku}` : product.category || "Fragrance"}</small></span>
                  <span className={`operations-image-status is-${product.missing ? "missing" : product.curated ? "curated" : "loyverse"}`}>{imageStatus(product)}</span>
                </button>
              )) : <div className="operations-empty"><ImageSquare size={30} weight="thin" /><h2>No products here.</h2><p>Try a different image status or search term.</p></div>}
            </div>
          </section>

          <aside className="operations-inspector operations-image-inspector" aria-live="polite">
            {selected ? <>
              <div className="operations-inspector-head"><div><h2>{selected.brand}</h2><p>{selected.name}</p></div><span className={`operations-image-status is-${selected.missing ? "missing" : selected.curated ? "curated" : "loyverse"}`}>{imageStatus(selected)}</span></div>
              <div className="operations-image-current">
                {previewUrl ? <Image src={previewUrl} alt="New product image preview" fill unoptimized /> : !selected.missing && selected.imageUrl ? <Image src={selected.imageUrl} alt={`${selected.brand} ${selected.name}`} fill /> : <div><ImageSquare size={44} weight="thin" /><p>No approved image</p></div>}
              </div>
              <dl className="operations-details operations-product-meta">
                <div><dt>SKU</dt><dd>{selected.sku || "Not assigned"}</dd></div>
                <div><dt>Barcode</dt><dd>{selected.barcode || "Not assigned"}</dd></div>
                <div><dt>Category</dt><dd>{selected.category || "Fragrance"}</dd></div>
                <div><dt>Stock</dt><dd>{selected.stock}</dd></div>
              </dl>
              <div
                className={`operations-upload-zone ${dragging ? "is-dragging" : ""}`}
                onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <input ref={inputRef} id="product-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/tiff" onChange={onFileChange} />
                <UploadSimple size={25} weight="light" />
                <strong>Drag and drop an image here</strong>
                <label htmlFor="product-image-file">Choose a photograph</label>
                <p>JPG, PNG, WebP, AVIF or TIFF. Minimum 800×800, maximum 10 MB.</p>
              </div>
              {file && <div className="operations-file-row"><div><strong>{file.name}</strong><span>{(file.size / 1_000_000).toFixed(2)} MB</span></div><button type="button" aria-label="Remove selected image" onClick={resetFile}><X size={16} /></button></div>}
              {notice && <div className={`operations-notice is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.tone === "success" ? <CheckCircle size={18} weight="fill" /> : <WarningCircle size={18} weight="fill" />}{notice.text}</div>}
              <div className="operations-actions operations-image-actions">
                <button type="button" className="operations-primary-button" disabled={!file || busy || catalog.preview} onClick={upload}>{busy ? "Publishing" : catalog.preview ? "Connect storage" : "Publish image"}</button>
                {selected.imageUrl && !selected.missing && <a href={selected.imageUrl} target="_blank" rel="noreferrer">View current</a>}
              </div>
              <p className="operations-image-rights">Only publish Aurum Privée-owned photography or supplier/manufacturer assets licensed for retail use.</p>
            </> : <div className="operations-empty"><ImageSquare size={30} weight="thin" /><h2>Select a product.</h2></div>}
          </aside>
        </div>
      </section>
    </div>
  );
}
