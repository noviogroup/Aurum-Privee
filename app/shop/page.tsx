import type { Metadata } from "next";
import { ProductBrowser } from "@/components/product-browser";
import { getCatalogPage } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop fragrance",
  description: "Browse the Aurum Privée edit of exceptional fragrance and cologne.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ family?: string; query?: string; sort?: string }> }) {
  const { family, query = "", sort = "featured" } = await searchParams;
  const allowed = ["All", "New", "Floral", "Fresh", "Woody", "Amber", "Gourmand"] as const;
  const initialFilter = allowed.includes(family as typeof allowed[number]) ? family as typeof allowed[number] : "All";
  const allowedSorts = ["featured", "price-asc", "price-desc", "name"];
  const initialSort = allowedSorts.includes(sort) ? sort : "featured";
  const initialQuery = query.trim().slice(0, 100);
  const initialPage = await getCatalogPage({ family: initialFilter, query: initialQuery, sort: initialSort, limit: 24 });
  return (
    <div className="shop-page section-shell page-top">
      <ProductBrowser products={initialPage.products} catalogTotal={initialPage.total} remote searchable initialFilter={initialFilter} initialQuery={initialQuery} initialSort={initialSort} />
    </div>
  );
}
