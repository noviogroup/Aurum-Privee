"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MagnifyingGlass, X } from "@phosphor-icons/react";
import { FormEvent, KeyboardEvent as ReactKeyboardEvent, RefObject, useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { parseClientCatalogResponse } from "@/lib/client-catalog-response";
import { requestJson } from "@/lib/client-json-request";

export function StoreSearch({ open, onClose, returnFocusRef }: { open: boolean; onClose: () => void; returnFocusRef: RefObject<HTMLElement | null> }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const returnFocus = returnFocusRef.current;
    inputRef.current?.focus({ preventScroll: true });
    document.body.classList.add("search-is-open");
    return () => {
      document.body.classList.remove("search-is-open");
      window.requestAnimationFrame(() => {
        if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      });
    };
  }, [open, returnFocusRef]);

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  useEffect(() => {
    const term = query.trim();
    if (!open || term.length < 2) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      setError("");
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = window.setTimeout(async () => {
      try {
        const parameters = new URLSearchParams({ query: term, limit: "5", offset: "0" });
        const { response, data } = await requestJson<unknown>(`/api/catalog?${parameters}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search unavailable");
        const body = parseClientCatalogResponse(data);
        setResults(body.products);
        setTotal(body.total);
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setTotal(0);
          setError("Search is temporarily unavailable. Open the full collection to keep browsing.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    window.location.assign(`/shop?query=${encodeURIComponent(term)}`);
  }

  if (!open) return null;

  return (
    <div className="store-search-layer" role="dialog" aria-modal="true" aria-label="Search Aurum Privée fragrances" onKeyDown={handleDialogKeyDown}>
      <button type="button" className="store-search-scrim" aria-label="Close search" onClick={onClose} />
      <section className="store-search-panel" ref={panelRef}>
        <div className="store-search-topline">
          <p className="utility-label">Fragrance search</p>
          <button type="button" aria-label="Close search" onClick={onClose}><X size={22} /></button>
        </div>
        <form className="store-search-form" onSubmit={submit}>
          <MagnifyingGlass size={28} weight="light" />
          <label className="sr-only" htmlFor="site-fragrance-search">Search by fragrance, brand, note or type</label>
          <input ref={inputRef} id="site-fragrance-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “Dunhill red”, “vanilla” or “EDP”" autoComplete="off" />
          {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={19} /></button>}
        </form>

        {query.trim().length < 2 ? (
          <div className="store-search-start">
            <p>Browse by scent character</p>
            <div>
              {['Floral', 'Fresh', 'Woody', 'Amber', 'Gourmand'].map((family) => <Link key={family} href={`/shop?family=${family}`} onClick={onClose}>{family}</Link>)}
            </div>
          </div>
        ) : (
          <div className="store-search-results" aria-live="polite" aria-busy={loading}>
            <div className="store-search-result-head"><span>{loading ? "Searching the collection" : `${total} ${total === 1 ? "match" : "matches"}`}</span></div>
            {error && <div className="store-search-none" role="alert"><strong>Search needs a moment.</strong><p>{error}</p><Link href="/shop" onClick={onClose}>Browse all fragrances <ArrowRight size={17} /></Link></div>}
            {!loading && !error && results.map((product) => (
              <Link className="store-search-result" href={`/shop/${product.slug}`} onClick={onClose} key={product.id}>
                <span><Image src={product.image} alt="" fill sizes="72px" /></span>
                <div><small>{product.brand}</small><strong>{product.name}</strong><p>{product.concentration} · {product.size}</p></div>
                <ArrowRight size={17} />
              </Link>
            ))}
            {!loading && !error && total === 0 && <div className="store-search-none"><strong>No exact match yet.</strong><p>Check the spelling, search the brand, or browse a scent family below.</p></div>}
            {!loading && !error && total > 0 && <Link className="store-search-all" href={`/shop?query=${encodeURIComponent(query.trim())}`} onClick={onClose}>See all {total} results <ArrowRight size={17} /></Link>}
          </div>
        )}
      </section>
    </div>
  );
}
