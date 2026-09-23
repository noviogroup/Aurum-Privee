"use client";

import Image from "next/image";
import Link from "next/link";
import { matchesCatalogBrand } from "@/lib/catalog-brands";
import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlass, SlidersHorizontal, SquaresFour, List, X } from "@phosphor-icons/react";
import type { ProductAudience, PublicProduct, ScentFamily } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { matchesCatalogSearch } from "@/lib/catalog-search";
import { parseClientCatalogResponse } from "@/lib/client-catalog-response";
import { requestJson } from "@/lib/client-json-request";

type CatalogFilter = ScentFamily | "All" | "New";
const families: CatalogFilter[] = ["All", "New", "Floral", "Fresh", "Woody", "Amber", "Gourmand"];

type CatalogSort = "featured" | "name";
type CatalogAudience = ProductAudience | "All";

export function ProductBrowser({ products, sizes = [], concentrations = [], initialSize = "", initialConcentration = "", brands = [], initialBrand = "", compact = false, searchable = false, initialFilter = "All", initialAudience = "All", initialQuery = "", initialSort = "featured", remote = false, catalogTotal }: { products: PublicProduct[]; sizes?: string[]; concentrations?: string[]; initialSize?: string; initialConcentration?: string; brands?: string[]; initialBrand?: string; compact?: boolean; searchable?: boolean; initialFilter?: CatalogFilter; initialAudience?: CatalogAudience; initialQuery?: string; initialSort?: string; remote?: boolean; catalogTotal?: number }) {
  const [catalogView, setCatalogView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (compact) return;
    try {
      if (window.localStorage.getItem("aurum-privee-catalog-view") === "list") setCatalogView("list");
    } catch {
      // The view toggle still works when browser storage is unavailable.
    }
  }, [compact]);

  const changeView = (view: "grid" | "list") => {
    setCatalogView(view);
    try {
      window.localStorage.setItem("aurum-privee-catalog-view", view);
    } catch {
      // Persistence is optional.
    }
  };

  const [size, setSize] = useState(initialSize);
  const [concentration, setConcentration] = useState(initialConcentration);
  const [brandSearch, setBrandSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const matchingBrands = brands.filter((name) => name.toLocaleLowerCase().includes(brandSearch.trim().toLocaleLowerCase()));
  const [brand, setBrand] = useState(initialBrand);
  const [family, setFamily] = useState<CatalogFilter>(initialFilter);
  const [audience, setAudience] = useState<CatalogAudience>(initialAudience);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<CatalogSort>((["featured", "name"].includes(initialSort) ? initialSort : "featured") as CatalogSort);
  const [visibleCount, setVisibleCount] = useState(compact ? 6 : 24);
  const [remoteProducts, setRemoteProducts] = useState(products);
  const [remoteTotal, setRemoteTotal] = useState(catalogTotal ?? products.length);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const skipInitialRemoteRequest = useRef(true);
  const loadMoreController = useRef<AbortController | null>(null);
  const loadMorePending = useRef(false);
  const cancelPendingLoadMore = () => {
    if (loadMorePending.current) setLoading(false);
    loadMoreController.current?.abort();
    loadMoreController.current = null;
    loadMorePending.current = false;
  };
  const filtered = useMemo(() => (remote ? remoteProducts : products.filter((product) => {
    const familyMatch = family === "All" || (family === "New" ? product.newArrival : product.family === family);
    return (!size || product.size === size) && (!concentration || product.concentration === concentration) && (audience === "All" || product.audience === audience) && familyMatch && matchesCatalogBrand(product, brand) && matchesCatalogSearch(product, query);
  }).sort((left, right) => sort === "name" ? `${left.brand} ${left.name}`.localeCompare(`${right.brand} ${right.name}`) : 0)), [size, concentration, audience, brand, family, products, query, remote, remoteProducts, sort]);

  useEffect(() => {
    loadMoreController.current?.abort();
    loadMoreController.current = null;
    loadMorePending.current = false;
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
        const parameters = new URLSearchParams({ size, concentration, brand, family, audience, query, sort, offset: "0", limit: "24" });
        const { response, data } = await requestJson<unknown>(`/api/catalog?${parameters}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Catalog request failed");
        const result = parseClientCatalogResponse(data);
        setRemoteProducts(result.products);
        setRemoteTotal(result.total);
      } catch {
        if (!controller.signal.aborted) {
          setError("We could not update the results. The products below are from your previous search.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [size, concentration, brand, audience, family, query, remote, sort]);

  useEffect(() => () => loadMoreController.current?.abort(), []);

  useEffect(() => {
    if (!searchable) return;
    const parameters = new URLSearchParams();
    if (size) parameters.set("size", size);
    if (concentration) parameters.set("concentration", concentration);
    if (brand) parameters.set("brand", brand);
    if (family !== "All") parameters.set("family", family);
    if (audience !== "All") parameters.set("audience", audience);
    if (query.trim()) parameters.set("query", query.trim());
    if (sort !== "featured") parameters.set("sort", sort);
    const next = `${window.location.pathname}${parameters.size ? `?${parameters}` : ""}`;
    window.history.replaceState(null, "", next);
  }, [size, concentration, brand, audience, family, query, searchable, sort]);

  const loadMore = async () => {
    if (!remote) {
      setVisibleCount((count) => count + 24);
      return;
    }
    if (loadMorePending.current) return;
    loadMorePending.current = true;
    const controller = new AbortController();
    loadMoreController.current?.abort();
    loadMoreController.current = controller;
    setLoading(true);
    setError("");
    try {
      const parameters = new URLSearchParams({ size, concentration, brand, family, audience, query, sort, offset: remoteProducts.length.toString(), limit: "24" });
      const { response, data } = await requestJson<unknown>(`/api/catalog?${parameters}`, { signal: controller.signal });
      if (!response.ok) throw new Error("Catalog request failed");
      const result = parseClientCatalogResponse(data);
      setRemoteProducts((current) => [...current, ...result.products]);
      setRemoteTotal(result.total);
    } catch {
      if (!controller.signal.aborted) {
        setError("More fragrances could not be loaded. Please try again.");
      }
    } finally {
      if (loadMoreController.current === controller) {
        loadMoreController.current = null;
        loadMorePending.current = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }
  };

  const resultCount = remote ? remoteTotal : filtered.length;

  if (!products.length && !remote) {
    return <div className="catalog-empty"><h2>No fragrances to display.</h2><p>Please check back shortly or contact Aurum Privée for assistance.</p></div>;
  }

  return (
    <div>
      {searchable && (
        <section className="shop-editorial-intro" aria-labelledby="shop-title">
          <div className="shop-editorial-copy">
            <h1 id="shop-title">Trade fragrance catalogue.</h1>
            <p>Compare brands, sizes and concentrations. Add products to your quote list, then enter quantities and request wholesale pricing.</p>
            <div className="catalog-search-wrap" id="catalog-search">
              <div className="catalog-search">
                <MagnifyingGlass size={22} weight="light" />
                <label htmlFor="catalog-query">Search the catalogue</label>
                <input id="catalog-query" value={query} onChange={(event) => { cancelPendingLoadMore(); setQuery(event.target.value); setVisibleCount(24); }} placeholder="Brand, fragrance, note or size" autoComplete="off" />
                {query && <button type="button" aria-label="Clear search" onClick={() => { cancelPendingLoadMore(); setQuery(""); }}><X size={17} /></button>}
              </div>
              <p>Try “Dior,” “vanilla,” “oud,” or “EDP.”</p>
            </div>
          </div>
          <aside className="shop-editorial-stage" aria-label="Featured fragrances">
            <picture className="shop-stage-picture">
              <source media="(max-width: 900px)" srcSet="/images/campaign/shop-editorial-popular-v4-mobile.webp" />
              <Image
                className="shop-stage-image"
                src="/images/campaign/shop-editorial-popular-v4.webp"
                alt="Dior Sauvage, Tom Ford Black Orchid, Baccarat Rouge 540 and Carolina Herrera Good Girl arranged on sunlit travertine"
                fill
                sizes="(max-width: 900px) calc(100vw - 32px), 54vw"
                loading="eager"
                fetchPriority="high"
              />
            </picture>
          </aside>
        </section>
      )}
      {!compact && <><button className="mobile-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="catalog-filter-panel" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={18} /> Filter &amp; sort</button>
      <div id="catalog-filter-panel" className={`catalog-filter-panel ${filtersOpen ? "is-open" : ""}`}>
      <div className="catalog-brand-tools">
        <label className="brand-search-label">Find a brand<input type="search" value={brandSearch} onChange={(event) => setBrandSearch(event.target.value)} placeholder="Type a brand name" /></label>
        <label htmlFor="catalog-brand">Brand</label>
        <select id="catalog-brand" value={brand} onChange={(event) => { cancelPendingLoadMore(); setBrand(event.target.value); setVisibleCount(24); }}>
          <option value="">All brands</option>
          {brand && !matchingBrands.includes(brand) && <option value={brand}>{brand}</option>}
          {matchingBrands.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <Link href="/brands">Shop by brand A–Z</Link>
        <label className="catalog-format-label">Size<select aria-label="Size" value={size} onChange={(event) => { cancelPendingLoadMore(); setSize(event.target.value); }}><option value="">All sizes</option>{size && !sizes.includes(size) && <option>{size}</option>}{sizes.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="catalog-format-label">Concentration<select aria-label="Concentration" value={concentration} onChange={(event) => { cancelPendingLoadMore(); setConcentration(event.target.value); }}><option value="">All concentrations</option>{concentration && !concentrations.includes(concentration) && <option>{concentration}</option>}{concentrations.map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      <div className="catalog-tools">
        <div className="audience-row" role="group" aria-label="Filter by audience">
          {(["All", "Women", "Men", "Unisex"] as CatalogAudience[]).map((item) => (
            <button className={audience === item ? "is-active" : ""} aria-pressed={audience === item} onClick={() => { cancelPendingLoadMore(); setAudience(item); setVisibleCount(24); }} key={item}>{item === "Women" ? "Women" : item === "Men" ? "Men" : item === "Unisex" ? "Unisex" : "All fragrances"}</button>
          ))}
        </div>
        <div className="filter-row" role="group" aria-label="Filter by scent family">
          {families.map((item) => (
            <button className={family === item ? "is-active" : ""} aria-pressed={family === item} onClick={() => { cancelPendingLoadMore(); setFamily(item); setVisibleCount(24); }} key={item}>{item}</button>
          ))}
        </div>
        <label className="catalog-sort"><SlidersHorizontal size={16} /><span>Sort</span><select value={sort} onChange={(event) => { cancelPendingLoadMore(); setSort(event.target.value as CatalogSort); }}><option value="featured">Featured</option><option value="name">Brand &amp; name</option></select></label>
      </div></div>
      <div className="catalog-filter-chips" role="group" aria-label="Active filters">
        {[["Brand", brand, () => { setBrand(""); setBrandSearch(""); }], ["Size", size, () => setSize("")], ["Concentration", concentration, () => setConcentration("")], ["Audience", audience === "All" ? "" : audience, () => setAudience("All")], ["Scent family", family === "All" ? "" : family, () => setFamily("All")], ["Search", query, () => setQuery("")]].map(([label, value, clear]) => value ? <button key={String(label)} type="button" aria-label={`Remove ${label} filter: ${value}`} onClick={() => { cancelPendingLoadMore(); (clear as () => void)(); }}><span>{String(value)}</span><X size={14} aria-hidden="true" /></button> : null)}
      </div></>}
      {!compact && <div className="catalog-results-toolbar"><div className="catalog-status" aria-live="polite"><p><strong>{resultCount}</strong> {resultCount === 1 ? "fragrance" : "fragrances"}{brand ? <> · {brand}</> : ""}{audience !== "All" ? <> · {audience.toLowerCase()}</> : ""}{query.trim() ? <> matching “{query.trim()}”</> : ""}{loading ? <span> Updating…</span> : ""}</p>{(size || concentration || brand || query || audience !== "All" || family !== "All" || sort !== "featured") && <button type="button" onClick={() => { cancelPendingLoadMore(); setSize(""); setConcentration(""); setBrandSearch(""); setQuery(""); setBrand(""); setAudience("All"); setFamily("All"); setSort("featured"); }}>Clear all <X size={14} /></button>}</div>
        <div className="catalog-view-toggle" role="group" aria-label="Catalogue view">
          <button type="button" aria-label="Grid view" aria-pressed={catalogView === "grid"} onClick={() => changeView("grid")}><SquaresFour size={18} aria-hidden="true" /><span>Grid</span></button>
          <button type="button" aria-label="List view" aria-pressed={catalogView === "list"} onClick={() => changeView("list")}><List size={18} aria-hidden="true" /><span>List</span></button>
        </div>
      </div>}
      {error && <div className="catalog-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")}>Dismiss</button></div>}
      {filtered.length ? (
        <div className={`product-grid ${compact ? "product-grid-compact" : catalogView === "list" ? "product-list" : ""}`}>
          {(remote ? filtered : filtered.slice(0, visibleCount)).map((product, index) => (
            <ProductCard
              product={product}
              listView={!compact && catalogView === "list"}
              key={product.id}
              priority={!compact && index < 2}
              headingLevel={compact ? 3 : 2}
              mobileImage={compact && product.image.startsWith("/images/hero-products/") ? product.image.replace(/\.webp$/, "-mobile.webp") : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="catalog-empty"><h2>No fragrances found.</h2><p>Check the spelling, search only the brand, or clear the catalogue filters.</p><button className="button button-secondary" type="button" onClick={() => { cancelPendingLoadMore(); setSize(""); setConcentration(""); setBrandSearch(""); setQuery(""); setBrand(""); setAudience("All"); setFamily("All"); }}>Clear filters</button></div>
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
