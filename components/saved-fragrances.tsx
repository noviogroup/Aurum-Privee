"use client";

import Link from "next/link";
import { Heart, LockKey, Sparkle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { useWishlist } from "@/components/wishlist-provider";
import type { Product } from "@/lib/types";
import { parseClientCatalogResponse } from "@/lib/client-catalog-response";
import { requestJson } from "@/lib/client-json-request";

export function SavedFragrances() {
  const { savedIds, hydrated } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hydrated || savedIds.length === 0) {
      setProducts([]);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const { response, data } = await requestJson<unknown>(`/api/catalog?ids=${encodeURIComponent(savedIds.join(","))}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Saved fragrances could not be loaded.");
        const result = parseClientCatalogResponse(data);
        const byId = new Map(result.products.map((product) => [product.id, product]));
        setProducts(savedIds.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product)));
      } catch {
        if (controller.signal.aborted) return;
        setError("We could not load your saved fragrances. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [hydrated, savedIds]);

  return (
    <div className="saved-page page-top">
      <section className="saved-heading section-shell entrance">
        <h1>Saved fragrances</h1>
        <p>Keep a considered shortlist while you explore. Your edit stays on this device.</p>
      </section>

      {!hydrated || loading ? (
        <div className="saved-status section-shell" role="status">Opening your fragrance edit…</div>
      ) : error ? (
        <div className="saved-empty section-shell" role="alert">
          <Heart size={29} weight="light" />
          <h2>Your edit is still here</h2>
          <p>{error}</p>
          <button type="button" className="button button-primary" onClick={() => window.location.reload()}>Try again</button>
        </div>
      ) : products.length > 0 ? (
        <section className="saved-collection section-shell" aria-label={`${products.length} saved fragrances`}>
          <div className="saved-count"><span>{products.length.toString().padStart(2, "0")}</span><p>{products.length === 1 ? "fragrance held for you" : "fragrances held for you"}</p></div>
          <div className="product-grid">{products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 3} headingLevel={2} />)}</div>
        </section>
      ) : (
        <section className="saved-empty section-shell">
          <span className="saved-empty-icon"><Heart size={29} weight="light" /></span>
          <h2>Your fragrance edit<br />starts here.</h2>
          <p>Tap the heart on any perfume to keep it close while you compare notes, concentrations and moods.</p>
          <Link className="button button-primary" href="/shop">Explore the collection</Link>
        </section>
      )}

      <aside className="saved-privacy section-shell">
        <LockKey size={22} weight="light" aria-hidden="true" />
        <div><strong>Private by design</strong><p>Saved on this device only. No account, inbox or tracking required.</p></div>
        <Sparkle size={20} weight="light" aria-hidden="true" />
      </aside>
    </div>
  );
}
