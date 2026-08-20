"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MagnifyingGlass, X } from "@phosphor-icons/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/config";

export function StoreSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("search-is-open");
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("search-is-open");
    };
  }, [open, onClose]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const parameters = new URLSearchParams({ query: term, limit: "5", offset: "0" });
        const response = await fetch(`/api/catalog?${parameters}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search unavailable");
        const body = await response.json() as { products: Product[]; total: number };
        setResults(body.products);
        setTotal(body.total);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResults([]);
          setTotal(0);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    window.location.assign(`/shop?query=${encodeURIComponent(term)}`);
  }

  if (!open) return null;

  return (
    <div className="store-search-layer" role="dialog" aria-modal="true" aria-label="Search Aurum Privée fragrances">
      <button type="button" className="store-search-scrim" aria-label="Close search" onClick={onClose} />
      <section className="store-search-panel">
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
            {!loading && results.map((product) => (
              <Link className="store-search-result" href={`/shop/${product.slug}`} onClick={onClose} key={product.id}>
                <span><Image src={product.image} alt="" fill sizes="72px" /></span>
                <div><small>{product.brand}</small><strong>{product.name}</strong><p>{product.concentration} · {product.size}</p></div>
                <b>{formatMoney(product.price)}</b>
                <ArrowRight size={17} />
              </Link>
            ))}
            {!loading && total === 0 && <div className="store-search-none"><strong>No exact match yet.</strong><p>Check the spelling, search the brand, or browse a scent family below.</p></div>}
            {!loading && total > 0 && <Link className="store-search-all" href={`/shop?query=${encodeURIComponent(query.trim())}`} onClick={onClose}>See all {total} results <ArrowRight size={17} /></Link>}
          </div>
        )}
      </section>
    </div>
  );
}
