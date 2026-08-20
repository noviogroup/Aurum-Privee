import { NextResponse } from "next/server";
import { getCatalogPage, getCatalogProductsByIds } from "@/lib/catalog";
import { getSupabaseAdmin } from "@/lib/supabase";
import { consumeRateLimit } from "@/lib/request-security";

const allowedFamilies = new Set(["All", "New", "Floral", "Fresh", "Woody", "Amber", "Gourmand"]);
const allowedSorts = new Set(["featured", "price-asc", "price-desc", "name"]);

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const rateLimit = await consumeRateLimit({ supabase, request, scope: "catalog", limit: 120, windowSeconds: 60 });
    if (!rateLimit.configured) return NextResponse.json({ error: "Catalog protection is not configured." }, { status: 503 });
    if (!rateLimit.allowed) return NextResponse.json({ error: "Too many catalog requests." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } });
  }
  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") || "").split(",").map((id) => id.trim()).filter(Boolean).slice(0, 20);
  if (ids.length) {
    const products = await getCatalogProductsByIds([...new Set(ids)]);
    return NextResponse.json({ products, total: products.length });
  }
  const family = allowedFamilies.has(url.searchParams.get("family") || "") ? url.searchParams.get("family") || "All" : "All";
  const query = (url.searchParams.get("query") || "").trim().toLowerCase().slice(0, 100);
  const sort = allowedSorts.has(url.searchParams.get("sort") || "") ? url.searchParams.get("sort") || "featured" : "featured";
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0);
  const limit = Math.min(48, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "24", 10) || 24));
  return NextResponse.json(await getCatalogPage({ family, query, sort, offset, limit }));
}
