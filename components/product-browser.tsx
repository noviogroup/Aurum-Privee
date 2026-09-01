"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlass, SlidersHorizontal, X } from "@phosphor-icons/react";
import { Product, ScentFamily } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { matchesCatalogSearch } from "@/lib/catalog-search";

type CatalogFilter = ScentFamily | "All" | "New";
const families: CatalogFilter[] = ["All", "New", "Floral", "Fresh", "Woody", "Amber", "Gourmand"];

type CatalogSort = "featured" | "price-asc" | "price-desc" | "name";

export function ProductBrowser({ products, compact = false, searchable = false, initialFilter = "All", initialQuery = "", initialSort = "featured", remote = false, catalogTotal }: { products: Product[]; compact?: boolean; searchable?: boolean; initialFilter?: CatalogFilter; initialQuery?: string; initialSort?: string; remote?: boolean; catalogTotal?: number }) {
  const [family, setFamily] = useState<CatalogFilter>(initialFilter);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<CatalogSort>((["featured", "price-asc", "price-desc", "name"].includes(initialSort) ? initialSort : "featured") as CatalogSort);
  const [visibleCount, setVisibleCount] = useState(compact ? 6 : 24);
  const [remoteProducts, setRemoteProducts] = useState(products);
  const [remoteTotal, setRemoteTotal] = useState(catalogTotal ?? products.length);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const skipInitialRemoteRequest = useRef(true);
  const filtered = useMemo(() => (remote ? remoteProducts : products.filter((product) => {
    const familyMatch = family === "All" || (family === "New" ? product.newArrival : product.family === family);
    return familyMatch && matchesCatalogSearch(product, query);
  }).sort((left, right) => sort === "price-asc" ? left.price - right.price : sort === "price-desc" ? right.price - left.price : sort === "name" ? `${left.brand} ${left.name}`.localeCompare(`${right.brand} ${right.name}`) : 0)), [family, products, query, remote, remoteProducts, sort]);

  useEffect(() => {
    if (!remote) return;
    if (skipInitialRemoteRequest.current) {
      skipInitialRemoteRequest.current = false;
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const parameters = new URLSearchParams({ family, query, sort, offset: "0", limit: "24" });
        const response = await fetch(`/api/catalog?${parameters}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Catalog request failed");
        const result = await response.json();
        setRemoteProducts(result.products);
        setRemoteTotal(result.total);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setError("We could not refresh the collection. Your current selection is still available.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [family, query, remote, sort]);

  useEffect(() => {
    if (!searchable) return;
    const parameters = new URLSearchParams();
    if (family !== "All") parameters.set("family", family);
    if (query.trim()) parameters.set("query", query.trim());
    if (sort !== "featured") parameters.set("sort", sort);
    const next = `${window.location.pathname}${parameters.size ? `?${parameters}` : ""}`;
    window.history.replaceState(null, "", next);
  }, [family, query, searchable, sort]);

  const loadMore = async () => {
    if (!remote) {
      setVisibleCount((count) => count + 24);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const parameters = new URLSearchParams({ family, query, sort, offset: remoteProducts.length.toString(), limit: "24" });
      const response = await fetch(`/api/catalog?${parameters}`);
      if (!response.ok) throw new Error("Catalog request failed");
      const result = await response.json();
      setRemoteProducts((current) => [...current, ...result.products]);
      setRemoteTotal(result.total);
    } catch {
      setError("More fragrances could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!products.length && !remote) {
    return <div className="catalog-empty"><h2>The collection is being prepared.</h2><p>Please check back shortly or contact Aurum Privée for assistance.</p></div>;
  }

  return (
    <div>
      {searchable && (
        <section className="shop-editorial-intro" aria-labelledby="shop-title">
          <div className="shop-editorial-copy">
            <h1 id="shop-title">Find the one that stays with you.</h1>
            <p>Explore designer, niche and Arabian fragrance, selected in Nassau for the way it wears—not simply the name on the bottle.</p>
            <div className="catalog-search-wrap" id="catalog-search">
              <div className="catalog-search">
                <MagnifyingGlass size={22} weight="light" />
                <label htmlFor="catalog-query">Search the collection</label>
                <input id="catalog-query" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(24); }} placeholder="Brand, fragrance, note or size" autoComplete="off" />
                {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={17} /></button>}
              </div>
              <p>Try “Dior,” “vanilla,” “oud,” or “EDP.”</p>
            </div>
          </div>
          <aside className="shop-editorial-stage" aria-label="Featured fragrances">
            <Image
              className="shop-stage-image"
              src="/images/campaign/shop-editorial-popular-v4.webp"
              alt="Dior Sauvage, Tom Ford Black Orchid, Baccarat Rouge 540 and Carolina Herrera Good Girl arranged on sunlit travertine"
              fill
              sizes="(max-width: 900px) calc(100vw - 32px), 54vw"
              priority
            />
            <span className="shop-stage-location" aria-hidden="true">Nassau · The Bahamas</span>
          </aside>
        </section>
      )}
      {!compact && <div className="catalog-tools">
        <div className="filter-row" role="group" aria-label="Filter by scent family">
          {families.map((item) => (
            <button className={family === item ? "is-active" : ""} aria-pressed={family === item} onClick={() => { setFamily(item); setVisibleCount(24); }} key={item}>{item}</button>
          ))}
        </div>
        <label className="catalog-sort"><SlidersHorizontal size={16} /><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as CatalogSort)}><option value="featured">Featured</option><option value="price-asc">Price, low to high</option><option value="price-desc">Price, high to low</option><option value="name">Brand &amp; name</option></select></label>
      </div>}
      {!compact && <div className="catalog-status" aria-live="polite"><p><strong>{remote ? remoteTotal : filtered.length}</strong> {remoteTotal === 1 ? "fragrance" : "fragrances"}{query.trim() ? <> matching “{query.trim()}”</> : ""}{loading ? <span> Updating…</span> : ""}</p>{(query || family !== "All" || sort !== "featured") && <button type="button" onClick={() => { setQuery(""); setFamily("All"); setSort("featured"); }}>Clear all <X size={14} /></button>}</div>}
      {error && <div className="catalog-error" role="status"><span>{error}</span><button type="button" onClick={() => setError("")}>Dismiss</button></div>}
      {filtered.length ? (
        <div className={`product-grid ${compact ? "product-grid-compact" : ""}`}>
          {(remote ? filtered : filtered.slice(0, visibleCount)).map((product, index) => <ProductCard product={product} key={product.id} priority={index < 2} headingLevel={compact ? 3 : 2} />)}
        </div>
      ) : (
        <div className="catalog-empty"><h2>No fragrances found.</h2><p>Check the spelling, search only the brand, or clear the scent-family filter.</p><button className="button button-secondary" type="button" onClick={() => { setQuery(""); setFamily("All"); }}>Clear search</button></div>
      )}
      {!compact && ((remote && remoteTotal > remoteProducts.length) || (!remote && filtered.length > visibleCount)) && (
        <div className="catalog-load-more">
          <button className="button button-secondary" onClick={loadMore} disabled={loading}>{loading ? "Loading" : "Show more fragrances"}</button>
          <p>Showing {remote ? remoteProducts.length : Math.min(visibleCount, filtered.length)} of {remote ? remoteTotal : filtered.length}</p>
        </div>
      )}
    </div>
  );
}
