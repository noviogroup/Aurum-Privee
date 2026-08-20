import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Product } from "@/lib/types";
import type { OperationsImageCatalog, OperationsImageProduct } from "@/lib/operations-image-types";
import { customerFacingBrand } from "@/lib/brand";

const placeholderImage = "/images/product-awaiting-photography.webp";

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { cells.push(value); value = ""; }
    else value += character;
  }
  cells.push(value);
  return cells;
}

function isMissingImage(imageUrl: string | null | undefined) {
  return !imageUrl || imageUrl === placeholderImage;
}

function totals(products: OperationsImageProduct[]) {
  return {
    all: products.length,
    missing: products.filter((product) => product.missing).length,
    curated: products.filter((product) => product.curated).length,
    loyverse: products.filter((product) => !product.missing && !product.curated).length,
  };
}

async function localImageCatalog(): Promise<OperationsImageCatalog> {
  const products = JSON.parse(await readFile(path.join(process.cwd(), "data", "loyverse-products.json"), "utf8")) as Product[];
  const worksheet = await readFile(path.join(process.cwd(), "data", "missing-product-images.csv"), "utf8");
  const [headerLine, ...dataLines] = worksheet.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  const missingRows = new Map(dataLines.filter(Boolean).map((line) => {
    const cells = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
    return [row.variant_id, row];
  }));
  const rows: OperationsImageProduct[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    brand: customerFacingBrand(product.brand),
    sku: missingRows.get(product.id)?.sku || null,
    barcode: missingRows.get(product.id)?.barcode || null,
    category: missingRows.get(product.id)?.category || product.family,
    imageUrl: missingRows.has(product.id) ? placeholderImage : product.image,
    loyverseImageUrl: null,
    stock: product.stock,
    missing: missingRows.has(product.id),
    curated: !missingRows.has(product.id) && !product.image.includes("/product-images/loyverse/"),
    updatedAt: new Date().toISOString(),
  }));
  return { products: rows, configured: false, preview: true, totals: totals(rows) };
}

export async function getOperationsImageCatalog(): Promise<OperationsImageCatalog> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return localImageCatalog();
  const rows: OperationsImageProduct[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from("products")
      .select("id,name,brand,loyverse_sku,loyverse_barcode,loyverse_category_name,image_url,loyverse_image_url,stock,active,updated_at")
      .eq("active", true)
      .order("name")
      .range(from, from + pageSize - 1);
    if (error) throw new Error("Product images could not be loaded");
    for (const row of data || []) {
      const missing = isMissingImage(row.image_url);
      const curated = !missing && Boolean(row.image_url && row.image_url !== row.loyverse_image_url && !row.image_url.startsWith("/product-images/loyverse/"));
      rows.push({
        id: row.id,
        name: row.name,
        brand: customerFacingBrand(row.brand),
        sku: row.loyverse_sku,
        barcode: row.loyverse_barcode,
        category: row.loyverse_category_name,
        imageUrl: row.image_url,
        loyverseImageUrl: row.loyverse_image_url,
        stock: Number(row.stock || 0),
        missing,
        curated,
        updatedAt: row.updated_at,
      });
    }
    if (!data || data.length < pageSize) break;
  }
  return { products: rows, configured: true, preview: false, totals: totals(rows) };
}
