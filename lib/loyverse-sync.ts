import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listAllLoyverseItems,
  listInventory,
  listLoyverseCategories,
  listLoyverseTaxes,
  LoyverseItem,
  resolveVariantForStore,
} from "@/lib/loyverse";
import { concentrationForName, familyForCategory, isOnlineCategory, sizeForProduct, splitProductName } from "@/lib/product-normalization";
import { getMirroredLoyverseImage, isMirroredLoyverseAsset, isRejectedLoyverseImage } from "@/lib/loyverse-images";
import { customerFacingBrand, customerFacingCopy } from "@/lib/brand";

const untrackedStock = 999999;
const placeholderImage = "/images/product-awaiting-photography.webp";

type ExistingProduct = {
  id: string;
  loyverse_variant_id: string;
  slug: string;
  brand: string | null;
  concentration: string | null;
  description: string | null;
  scent_family: string | null;
  notes: unknown;
  image_url: string | null;
  loyverse_image_url: string | null;
  image_alt: string | null;
  featured: boolean;
  new_arrival: boolean;
  sort_order: number;
  compare_at_price: number | null;
};

export function slugifyProduct(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function normalizeLoyverseStock(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

async function readExistingProducts(supabase: SupabaseClient) {
  const products: ExistingProduct[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("id,loyverse_variant_id,slug,brand,concentration,description,scent_family,notes,image_url,loyverse_image_url,image_alt,featured,new_arrival,sort_order,compare_at_price")
      .not("loyverse_variant_id", "is", null)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    products.push(...((data || []) as ExistingProduct[]));
    if (!data || data.length < pageSize) break;
  }
  return products;
}

export async function syncLoyverseCatalog(input: {
  supabase: SupabaseClient;
  items?: LoyverseItem[];
  deactivateMissing?: boolean;
  source?: "manual" | "webhook" | "scheduled";
}) {
  const { supabase } = input;
  const storeId = process.env.LOYVERSE_STORE_ID;
  if (!storeId) throw new Error("LOYVERSE_STORE_ID is required for catalog synchronization");
  const startedAt = new Date().toISOString();

  try {
    const [items, categories, taxes, existingProducts] = await Promise.all([
      input.items ? Promise.resolve(input.items.filter((item) => !item.deleted_at)) : listAllLoyverseItems(),
      listLoyverseCategories(),
      listLoyverseTaxes(),
      readExistingProducts(supabase),
    ]);
    const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
    const taxMap = new Map(taxes.map((tax) => [tax.id, tax]));
    const existingMap = new Map(existingProducts.map((product) => [product.loyverse_variant_id, product]));
    const deliveryVariantId = process.env.LOYVERSE_DELIVERY_VARIANT_ID;
    const onlineItems = items.filter((item) => isOnlineCategory(item.category_id ? categoryMap.get(item.category_id) || "Uncategorized" : "Uncategorized"));
    const itemVariants = onlineItems.flatMap((item) => item.variants
      .filter((variant) => !variant.deleted_at && variant.variant_id !== deliveryVariantId)
      .map((variant) => ({ item, variant })));
    const inventory = [];
    for (let index = 0; index < itemVariants.length; index += 50) {
      inventory.push(...await listInventory(itemVariants.slice(index, index + 50).map(({ variant }) => variant.variant_id)));
    }
    const stockMap = new Map(inventory.filter((level) => level.store_id === storeId).map((level) => [level.variant_id, level.in_stock]));
    const syncedAt = new Date().toISOString();
    let inserted = 0;
    let updated = 0;

    const rows = itemVariants.map(({ item, variant }, index) => {
      const existing = existingMap.get(variant.variant_id);
      const storeVariant = resolveVariantForStore(variant, storeId);
      const optionValues = [variant.option1_value, variant.option2_value, variant.option3_value].filter(Boolean);
      const categoryName = item.category_id ? categoryMap.get(item.category_id) || "Uncategorized" : "Uncategorized";
      const normalizedName = splitProductName(item.item_name);
      const sourceImage = item.image_url || null;
      const mirroredImage = getMirroredLoyverseImage(item.id, sourceImage);
      const rejectedSourceImage = isRejectedLoyverseImage(item.id, sourceImage);
      const existingImageWasLoyverseSource = Boolean(existing?.loyverse_image_url && (existing.image_url === existing.loyverse_image_url || isMirroredLoyverseAsset(existing.image_url)));
      const existingImageIsLegacyLifestyle = Boolean(existing?.image_url?.startsWith("/product-images/") && !isMirroredLoyverseAsset(existing.image_url));
      const existingImageIsCurated = Boolean(existing?.image_url && existing.image_url !== placeholderImage && !existingImageWasLoyverseSource && !existingImageIsLegacyLifestyle);
      const imageUrl = existingImageIsCurated ? existing?.image_url : mirroredImage || (rejectedSourceImage ? null : sourceImage) || (existingImageIsLegacyLifestyle ? null : existing?.image_url) || placeholderImage;
      if (existing) updated += 1;
      else inserted += 1;

      return {
        id: existing?.id,
        loyverse_item_id: item.id,
        loyverse_variant_id: variant.variant_id,
        loyverse_category_id: item.category_id || null,
        loyverse_category_name: item.category_id ? categoryMap.get(item.category_id) || null : null,
        loyverse_sku: variant.sku || null,
        loyverse_barcode: variant.barcode || null,
        loyverse_tax_ids: item.tax_ids || [],
        loyverse_taxes: (item.tax_ids || []).map((id) => taxMap.get(id)).filter((tax) => tax !== undefined).map((tax) => ({ id: tax.id, name: tax.name, type: tax.type, rate: tax.rate })),
        loyverse_description: item.description || null,
        loyverse_image_url: sourceImage,
        loyverse_track_stock: item.track_stock,
        slug: existing?.slug || `${slugifyProduct(item.item_name)}-${variant.variant_id.slice(0, 6)}`,
        brand: customerFacingBrand(existing?.brand || normalizedName.brand),
        name: normalizedName.name,
        concentration: existing?.concentration || concentrationForName(item.item_name),
        size: sizeForProduct(item.item_name, optionValues),
        price: storeVariant.price || 0,
        compare_at_price: existing?.compare_at_price || null,
        description: customerFacingCopy(existing?.description || item.description || "Selected by Aurum Privée."),
        scent_family: existing?.scent_family || familyForCategory(categoryName),
        notes: existing?.notes || { top: [], heart: [], base: [] },
        image_url: imageUrl,
        image_alt: imageUrl === placeholderImage ? `Aurum Privée editorial setting while photography for ${item.item_name} is prepared` : customerFacingCopy(existing?.image_alt || `${item.item_name} fragrance`),
        featured: existing?.featured ?? index < 6,
        new_arrival: existing?.new_arrival ?? false,
        stock: item.track_stock ? normalizeLoyverseStock(stockMap.get(variant.variant_id)) : untrackedStock,
        active: storeVariant.available,
        sort_order: existing?.sort_order ?? 100 + index,
        source_updated_at: variant.updated_at || item.updated_at || null,
        synced_at: syncedAt,
      };
    });

    if (rows.length) {
      for (let index = 0; index < rows.length; index += 200) {
        const { error } = await supabase.from("products").upsert(rows.slice(index, index + 200), { onConflict: "loyverse_variant_id" });
        if (error) throw error;
      }
    }

    let deactivated = 0;
    if (input.items) {
      const onlineItemIds = new Set(onlineItems.map((item) => item.id));
      const excludedItemIds = items.filter((item) => !onlineItemIds.has(item.id)).map((item) => item.id);
      if (excludedItemIds.length) {
        const { data, error } = await supabase.from("products").update({ active: false, stock: 0, synced_at: syncedAt }).in("loyverse_item_id", excludedItemIds).select("id");
        if (error) throw error;
        deactivated += data?.length || 0;
      }
    }
    if (input.deactivateMissing) {
      const currentVariantIds = new Set(itemVariants.map(({ variant }) => variant.variant_id));
      const staleIds = existingProducts.filter((product) => !currentVariantIds.has(product.loyverse_variant_id)).map((product) => product.id);
      deactivated += staleIds.length;
      for (let index = 0; index < staleIds.length; index += 200) {
        const { error } = await supabase.from("products").update({ active: false, stock: 0, synced_at: syncedAt }).in("id", staleIds.slice(index, index + 200));
        if (error) throw error;
      }
    }

    const result = { total: rows.length, inserted, updated, deactivated, source: input.source || "manual", startedAt, completedAt: syncedAt };
    await supabase.from("integration_runs").insert({ provider: "loyverse", operation: "catalog_sync", status: "succeeded", metrics: result, started_at: startedAt, completed_at: syncedAt });
    return result;
  } catch (error) {
    await supabase.from("integration_runs").insert({
      provider: "loyverse",
      operation: "catalog_sync",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown synchronization error",
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    });
    throw error;
  }
}
