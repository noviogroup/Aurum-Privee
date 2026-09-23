import type { Metadata } from "next";
import { ProductBrowser } from "@/components/product-browser";
import { catalogBrands } from "@/lib/catalog-brands";
import { TradeBuyingGuide } from "@/components/trade-buying-guide";
import { getCatalogPage, getCatalogProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Trade fragrance catalogue",
  description: "Browse designer, niche and Arabian fragrance, build an assortment and request private trade terms from Aurum Privée.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ brand?: string; family?: string; audience?: string; query?: string; sort?: string }> }) {
  const { brand = "", family, audience = "All", query = "", sort = "featured" } = await searchParams;
  const allowed = ["All", "New", "Floral", "Fresh", "Woody", "Amber", "Gourmand"] as const;
  const initialFilter = allowed.includes(family as typeof allowed[number]) ? family as typeof allowed[number] : "All";
  const allowedSorts = ["featured", "name"];
  const initialSort = allowedSorts.includes(sort) ? sort : "featured";
  const initialQuery = query.trim().slice(0, 100);
  const allowedAudiences = ["All", "Women", "Men", "Unisex"] as const;
  const initialAudience = allowedAudiences.includes(audience as typeof allowedAudiences[number]) ? audience as typeof allowedAudiences[number] : "All";
  const initialBrand = brand.trim().slice(0, 100);
  const brands = catalogBrands(await getCatalogProducts());
  const initialPage = await getCatalogPage({ brand: initialBrand, family: initialFilter, audience: initialAudience, query: initialQuery, sort: initialSort, limit: 24 });
  return (
    <div className="shop-page section-shell page-top">
      <ProductBrowser brands={brands} initialBrand={initialBrand} key={`${initialBrand}:${initialFilter}:${initialAudience}:${initialQuery}:${initialSort}`} products={initialPage.products} catalogTotal={initialPage.total} remote searchable initialFilter={initialFilter} initialAudience={initialAudience} initialQuery={initialQuery} initialSort={initialSort} />
      <TradeBuyingGuide />
    </div>
  );
}
