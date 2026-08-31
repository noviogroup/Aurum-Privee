import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  listAllLoyverseItems,
  listInventory,
  listLoyverseCategories,
  listLoyverseTaxes,
  resolveVariantForStore,
} from "../lib/loyverse";
import { slugifyProduct } from "../lib/loyverse-sync";
import { concentrationForName, familyForCategory, isOnlineCategory, sizeForProduct, splitProductName } from "../lib/product-normalization";
import type { Product } from "../lib/types";
import { getMirroredLoyverseImage, isRejectedLoyverseImage } from "../lib/loyverse-images";
import { customerFacingBrand, customerFacingCopy } from "../lib/brand";

const fallbackImage = "/images/product-awaiting-photography.webp";

function csvCell(value: string | undefined) {
  return `"${(value || "").replaceAll('"', '""')}"`;
}

async function main() {
  const storeId = process.env.LOYVERSE_STORE_ID;
  if (!storeId) throw new Error("LOYVERSE_STORE_ID is required");

  const [items, categories, taxes] = await Promise.all([
    listAllLoyverseItems(),
    listLoyverseCategories(),
    listLoyverseTaxes(),
  ]);
  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
  const taxMap = new Map(taxes.map((tax) => [tax.id, tax]));
  const candidates = items.flatMap((item) => {
    const category = categoryMap.get(item.category_id || "") || "Uncategorized";
    if (!isOnlineCategory(category)) return [];
    return item.variants
      .filter((variant) => resolveVariantForStore(variant, storeId).available)
      .map((variant) => ({ item, variant, category }));
  });

  const inventory = [];
  for (let index = 0; index < candidates.length; index += 50) {
    inventory.push(...await listInventory(candidates.slice(index, index + 50).map(({ variant }) => variant.variant_id)));
  }
  const stockMap = new Map(inventory.filter((level) => level.store_id === storeId).map((level) => [level.variant_id, level.in_stock]));
  const createdAtMap = new Map(candidates.map(({ item, variant }) => [variant.variant_id, item.created_at]));
  const newArrivalThreshold = Date.now() - 45 * 24 * 60 * 60 * 1000;

  const products: Product[] = candidates.map(({ item, variant, category }) => {
    const resolved = resolveVariantForStore(variant, storeId);
    const stock = item.track_stock ? Math.max(0, stockMap.get(variant.variant_id) || 0) : 999999;
    const { brand, name } = splitProductName(item.item_name);
    const optionValues = [variant.option1_value, variant.option2_value, variant.option3_value].filter(Boolean);
    const image = getMirroredLoyverseImage(item.id, item.image_url) || (isRejectedLoyverseImage(item.id, item.image_url) ? fallbackImage : item.image_url) || fallbackImage;
    return {
      id: variant.variant_id,
      loyverseItemId: item.id,
      loyverseVariantId: variant.variant_id,
      loyverseTaxIds: item.tax_ids || [],
      loyverseTaxes: (item.tax_ids || []).map((id) => taxMap.get(id)).filter((tax) => tax !== undefined).map((tax) => ({ id: tax.id, name: tax.name, type: tax.type, rate: tax.rate })),
      slug: `${slugifyProduct(item.item_name)}-${variant.variant_id.slice(0, 6)}`,
      brand: customerFacingBrand(brand),
      name,
      concentration: concentrationForName(item.item_name),
      size: sizeForProduct(item.item_name, optionValues),
      price: resolved.price || 0,
      description: customerFacingCopy(item.description || `An authentic ${category.toLowerCase()} selected for the Aurum Privée collection.`),
      family: familyForCategory(category),
      notes: { top: [], heart: [], base: [] },
      image,
      imageAlt: image === fallbackImage ? `Aurum Privée editorial setting while photography for ${item.item_name} is prepared` : `${item.item_name} product image`,
      featured: false,
      newArrival: false,
      stock,
    };
  }).filter((product) => product.price > 0 && product.stock > 0)
    .sort((left, right) => Number(Boolean(right.image && right.image !== fallbackImage)) - Number(Boolean(left.image && left.image !== fallbackImage)) || left.brand.localeCompare(right.brand) || left.name.localeCompare(right.name));

  products.forEach((product, index) => {
    product.featured = index < 6;
    const createdAt = createdAtMap.get(product.id);
    product.newArrival = Boolean(createdAt && Date.parse(createdAt) >= newArrivalThreshold);
  });
  const outputDirectory = path.join(process.cwd(), "data");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, "loyverse-products.json"), `${JSON.stringify(products, null, 2)}\n`, "utf8");
  const candidateMap = new Map(candidates.map((candidate) => [candidate.variant.variant_id, candidate]));
  const missingImageRows = products.filter((product) => product.image === fallbackImage).map((product) => {
    const source = candidateMap.get(product.id);
    return [product.id, product.loyverseItemId, `${product.brand} - ${product.name}`, source?.category, source?.variant.sku, source?.variant.barcode].map(csvCell).join(",");
  });
  await writeFile(
    path.join(outputDirectory, "missing-product-images.csv"),
    [`"variant_id","item_id","product_name","category","sku","barcode"`, ...missingImageRows].join("\n") + "\n",
    "utf8",
  );
  const imageCount = products.filter((product) => product.image !== fallbackImage).length;
  process.stdout.write(JSON.stringify({ imported: products.length, withImages: imageCount, missingImages: products.length - imageCount, newArrivals: products.filter((product) => product.newArrival).length }));
}

main().catch((error) => {
  process.stderr.write(error instanceof Error ? error.message : "Local Loyverse sync failed");
  process.exitCode = 1;
});
