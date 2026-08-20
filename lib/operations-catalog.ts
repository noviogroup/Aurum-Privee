import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { OperationsCatalog, OperationsCatalogProduct, ProductCurationInput } from "@/lib/operations-catalog-types";
import type { Product, ScentFamily } from "@/lib/types";
import { customerFacingBrand, customerFacingCopy } from "@/lib/brand";

function totals(products: OperationsCatalogProduct[]) {
  return {
    all: products.length,
    needsCuration: products.filter((product) => !product.curatedAt).length,
    featured: products.filter((product) => product.featured).length,
    hidden: products.filter((product) => !product.storefrontVisible).length,
  };
}

async function missingWorksheet() {
  try {
    const csv = await readFile(path.join(process.cwd(), "data", "missing-product-images.csv"), "utf8");
    const rows = new Map<string, { sku: string | null; barcode: string | null; category: string | null }>();
    for (const line of csv.split(/\r?\n/).slice(1).filter(Boolean)) {
      const cells = [...line.matchAll(/(?:^|,)(?:"((?:[^"]|"")*)"|([^,]*))/g)].map((match) => (match[1] ?? match[2] ?? "").replace(/""/g, '"'));
      rows.set(cells[0], { category: cells[3] || null, sku: cells[4] || null, barcode: cells[5] || null });
    }
    return rows;
  } catch { return new Map(); }
}

async function localCatalog(): Promise<OperationsCatalog> {
  const [source, worksheet] = await Promise.all([
    readFile(path.join(process.cwd(), "data", "loyverse-products.json"), "utf8"),
    missingWorksheet(),
  ]);
  const sourceProducts = JSON.parse(source) as Product[];
  const products: OperationsCatalogProduct[] = sourceProducts.map((product, index) => ({
    id: product.id,
    slug: product.slug,
    brand: customerFacingBrand(product.brand),
    name: product.name,
    sku: worksheet.get(product.id)?.sku || null,
    barcode: worksheet.get(product.id)?.barcode || null,
    category: worksheet.get(product.id)?.category || product.family,
    imageUrl: product.image,
    price: product.price,
    stock: product.stock,
    description: customerFacingCopy(product.description),
    scentFamily: product.family,
    notes: product.notes,
    featured: Boolean(product.featured),
    newArrival: Boolean(product.newArrival),
    storefrontVisible: true,
    sortOrder: 100 + index,
    curatedAt: null,
  }));
  return { products, configured: false, preview: true, totals: totals(products) };
}

export async function getOperationsCatalog(): Promise<OperationsCatalog> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return localCatalog();
  const products: OperationsCatalogProduct[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from("products")
      .select("id,slug,brand,name,loyverse_sku,loyverse_barcode,loyverse_category_name,image_url,price,stock,description,scent_family,notes,featured,new_arrival,storefront_visible,sort_order,curated_at,active")
      .eq("active", true).order("sort_order").order("name").range(from, from + pageSize - 1);
    if (error) throw new Error("Catalog curation could not be loaded");
    for (const row of data || []) {
      products.push({
        id: row.id, slug: row.slug, brand: customerFacingBrand(row.brand), name: row.name,
        sku: row.loyverse_sku, barcode: row.loyverse_barcode, category: row.loyverse_category_name,
        imageUrl: row.image_url || "/images/product-awaiting-photography.webp", price: Number(row.price), stock: Number(row.stock),
        description: customerFacingCopy(row.description || "Selected by Aurum Privée."), scentFamily: (row.scent_family || "Floral") as ScentFamily,
        notes: row.notes || { top: [], heart: [], base: [] }, featured: row.featured, newArrival: row.new_arrival,
        storefrontVisible: row.storefront_visible, sortOrder: row.sort_order, curatedAt: row.curated_at,
      });
    }
    if (!data || data.length < pageSize) break;
  }
  return { products, configured: true, preview: false, totals: totals(products) };
}

export async function publishProductCuration(input: ProductCurationInput) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.rpc("publish_product_curation", {
    p_product_id: input.id,
    p_description: input.description,
    p_scent_family: input.scentFamily,
    p_notes: input.notes,
    p_featured: input.featured,
    p_new_arrival: input.newArrival,
    p_storefront_visible: input.storefrontVisible,
    p_sort_order: input.sortOrder,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Curation could not be published");
  return { productId: row.product_id as string, curatedAt: row.curated_at as string };
}
