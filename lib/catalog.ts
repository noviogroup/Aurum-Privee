import { unstable_noStore as noStore } from "next/cache";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase";
import { products as sampleProducts } from "@/lib/products";
import { Product, ScentFamily } from "@/lib/types";
import { CommerceTax } from "@/lib/tax";
import { matchesCatalogSearch } from "@/lib/catalog-search";
import { customerFacingBrand, customerFacingCopy } from "@/lib/brand";

type ProductRow = {
  id: string;
  loyverse_item_id: string | null;
  loyverse_variant_id: string | null;
  loyverse_tax_ids: string[] | null;
  loyverse_taxes: CommerceTax[] | null;
  slug: string;
  brand: string | null;
  name: string;
  concentration: string | null;
  size: string | null;
  price: number;
  compare_at_price: number | null;
  description: string | null;
  scent_family: string | null;
  notes: Product["notes"] | null;
  image_url: string | null;
  image_alt: string | null;
  featured: boolean;
  new_arrival: boolean;
  stock: number;
  available_stock?: number;
};

function fromRow(row: ProductRow): Product {
  const brand = customerFacingBrand(row.brand);
  const description = customerFacingCopy(row.description || "Selected by Aurum Privée.");
  const imageAlt = customerFacingCopy(row.image_alt || `${row.name} fragrance`);
  return {
    id: row.id,
    loyverseItemId: row.loyverse_item_id || undefined,
    loyverseVariantId: row.loyverse_variant_id || undefined,
    loyverseTaxIds: row.loyverse_tax_ids || [],
    loyverseTaxes: row.loyverse_taxes || [],
    slug: row.slug,
    brand,
    name: row.name,
    concentration: row.concentration || "Fine fragrance",
    size: row.size || "Standard size",
    price: Number(row.price),
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
    description,
    family: (row.scent_family || "Floral") as ScentFamily,
    notes: row.notes || { top: [], heart: [], base: [] },
    image: row.image_url || "/images/product-awaiting-photography.webp",
    imageAlt,
    featured: row.featured,
    newArrival: row.new_arrival,
    stock: Number(row.available_stock ?? row.stock),
  };
}

async function getLocalLoyverseProducts() {
  try {
    const contents = await readFile(path.join(process.cwd(), "data", "loyverse-products.json"), "utf8");
    return (JSON.parse(contents) as Product[]).map((product) => ({
      ...product,
      brand: customerFacingBrand(product.brand),
      description: customerFacingCopy(product.description),
      imageAlt: customerFacingCopy(product.imageAlt),
    }));
  } catch {
    return null;
  }
}

export async function getCatalogProducts() {
  noStore();
  const supabase = getSupabaseAdmin();
  if (!supabase) return await getLocalLoyverseProducts() || sampleProducts;
  const { data, error } = await supabase.from("catalog_products_available").select("*").order("sort_order");
  if (error) throw new Error(`The live product catalog is unavailable: ${error.message}`);
  if (!data?.length) return [];
  return (data as ProductRow[]).map(fromRow);
}

export async function getCatalogProductBySlug(slug: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return (await getLocalLoyverseProducts() || sampleProducts).find((product) => product.slug === slug);
  const { data, error } = await supabase.from("catalog_products_available").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(`The live product catalog is unavailable: ${error.message}`);
  return data ? fromRow(data as ProductRow) : undefined;
}

export async function getCatalogProductsByIds(ids: string[]) {
  const uniqueIds = [...new Set(ids)].slice(0, 20);
  const supabase = getSupabaseAdmin();
  if (!supabase) return (await getLocalLoyverseProducts() || sampleProducts).filter((product) => uniqueIds.includes(product.id));
  const { data, error } = await supabase.from("catalog_products_available").select("*").in("id", uniqueIds);
  if (error) throw new Error(`The live product catalog is unavailable: ${error.message}`);
  return ((data || []) as ProductRow[]).map(fromRow);
}

export async function getCatalogPage(input: { family?: string; query?: string; sort?: string; offset?: number; limit?: number }) {
  noStore();
  const supabase = getSupabaseAdmin();
  const family = input.family || "All";
  const query = (input.query || "").trim().toLowerCase();
  const tokens = query.split(/\s+/).map((token) => token.replace(/[%_,()]/g, "")).filter(Boolean).slice(0, 8);
  const sort = input.sort || "featured";
  const offset = Math.max(0, input.offset || 0);
  const limit = Math.min(48, Math.max(1, input.limit || 24));
  if (supabase) {
    let databaseQuery = supabase.from("catalog_products_available").select("*", { count: "exact" });
    if (family === "New") databaseQuery = databaseQuery.eq("new_arrival", true);
    else if (family !== "All") databaseQuery = databaseQuery.eq("scent_family", family);
    for (const token of tokens) {
      const clauses = ["name", "brand", "concentration", "size", "scent_family"].flatMap((column) => [
        `${column}.ilike.${token}%`,
        `${column}.ilike.% ${token}%`,
        `${column}.ilike.%-${token}%`,
        `${column}.ilike.%/${token}%`,
      ]);
      databaseQuery = databaseQuery.or(clauses.join(","));
    }
    if (sort === "price-asc") databaseQuery = databaseQuery.order("price", { ascending: true }).order("name");
    else if (sort === "price-desc") databaseQuery = databaseQuery.order("price", { ascending: false }).order("name");
    else if (sort === "name") databaseQuery = databaseQuery.order("name");
    else databaseQuery = databaseQuery.order("sort_order");
    const { data, count, error } = await databaseQuery.range(offset, offset + limit - 1);
    if (error) throw new Error(`The live product catalog is unavailable: ${error.message}`);
    return { products: ((data || []) as ProductRow[]).map(fromRow), total: count || 0 };
  }
  const products = await getLocalLoyverseProducts() || sampleProducts;
  const filtered = products.filter((product) => {
    const familyMatch = family === "All" || (family === "New" ? product.newArrival : product.family === family);
    return familyMatch && matchesCatalogSearch(product, query);
  });
  const sorted = [...filtered].sort((left, right) => sort === "price-asc" ? left.price - right.price : sort === "price-desc" ? right.price - left.price : sort === "name" ? `${left.brand} ${left.name}`.localeCompare(`${right.brand} ${right.name}`) : 0);
  return { products: sorted.slice(offset, offset + limit), total: sorted.length };
}
