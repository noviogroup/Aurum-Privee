import type { Metadata } from "next";
import Link from "next/link";
import { BrandDirectory } from "@/components/brand-directory";
import { catalogBrands } from "@/lib/catalog-brands";
import { getCatalogProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop by brand",
  description: "Find fragrance brands A–Z, compare available sizes and build your Aurum Privée trade quote request.",
  alternates: { canonical: "/brands" },
};

export default async function BrandsPage() {
  const brands = catalogBrands(await getCatalogProducts());
  return <div className="brands-page section-shell page-top">
    <header className="brands-heading">
      <p className="utility-label">The fragrance catalogue</p>
      <h1>Shop by brand.</h1>
      <p>Find a fragrance house, explore its collection and add your selections to a trade quote request. Availability is confirmed when we prepare your quote.</p>
      <Link className="text-link" href="/shop">Browse all fragrances →</Link>
    </header>
    <BrandDirectory brands={brands} />
  </div>;
}
