"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWishlist } from "@/components/wishlist-provider";

export function QuoteSummary() {
  const { count, totalQuantity, hydrated } = useWishlist();
  const pathname = usePathname();
  if (!hydrated || !count || pathname === "/quote-list") return null;
  return <div className="quote-summary-space"><aside className="quote-summary" aria-label="Your quote selection">
    <p role="status"><strong>{count} {count === 1 ? "fragrance" : "fragrances"} selected</strong><span>{totalQuantity} {totalQuantity === 1 ? "unit" : "units"} requested</span></p>
    <Link className="button button-primary" href="/quote-list">Review quote</Link>
  </aside></div>;
}
