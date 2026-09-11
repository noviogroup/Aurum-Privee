import { customerFacingBrand, customerFacingConcentration, customerFacingProductName, customerFacingSize } from "@/lib/brand";
import { PRODUCT_VARIANT_FAMILIES } from "@/lib/product-variants";
import { audienceForProduct } from "@/lib/product-normalization";
import type { Product } from "@/lib/types";

const WIX_BASE_COLUMNS = [
  "handle",
  "fieldType",
  "name",
  "visible",
  "plainDescription",
  "categorySlugs",
  "primaryCategorySlug",
  "media",
  "mediaAltText",
  "ribbon",
  "brand",
  "price",
  "strikethroughPrice",
  "baseUnit",
  "baseUnitMeasurement",
  "totalUnits",
  "totalUnitsMeasurement",
  "cost",
  "inventory",
  "preOrderEnabled",
  "preOrderMessage",
  "preOrderLimit",
  "sku",
  "barcode",
  "weight",
  "packageLength",
  "packageWidth",
  "packageHeight",
  "packageUnit",
];

const WIX_OPTION_COLUMNS = Array.from({ length: 6 }, (_, index) => {
  const number = index + 1;
  return [`productOptionName${number}`, `productOptionType${number}`, `productOptionChoices${number}`];
}).flat();

const WIX_MODIFIER_COLUMNS = Array.from({ length: 10 }, (_, index) => {
  const number = index + 1;
  return [
    `modifierName${number}`,
    `modifierType${number}`,
    `modifierCharLimit${number}`,
    `modifierMandatory${number}`,
    `modifierDescription${number}`,
  ];
}).flat();

// Wix validates import files positionally, so this order intentionally mirrors
// the current official Wix Stores product template in full.
export const WIX_CSV_COLUMNS = [...WIX_BASE_COLUMNS, ...WIX_OPTION_COLUMNS, ...WIX_MODIFIER_COLUMNS];

type CsvRow = Record<string, string | undefined>;

export type WixCatalogExport = {
  csv: string;
  productCount: number;
  variantCount: number;
  groupedFamilyCount: number;
};

function csvCell(value: string | undefined) {
  const text = value || "";
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowToCsv(row: CsvRow) {
  return WIX_CSV_COLUMNS.map((column) => csvCell(row[column])).join(",");
}

function cleanProduct(product: Product): Product {
  const brand = customerFacingBrand(product.brand);
  return {
    ...product,
    brand,
    name: customerFacingProductName(product.name, brand),
    concentration: customerFacingConcentration(product.concentration),
    size: customerFacingSize(product.size, product.name),
    audience: product.audience || audienceForProduct(null, product.name, product.description),
  };
}

function categorySlugs(product: Product) {
  const audience = product.audience === "Women" ? "for-her" : product.audience === "Men" ? "for-him" : "unisex";
  return ["all-fragrances", audience, product.family.toLowerCase(), product.newArrival ? "new-arrivals" : ""]
    .filter(Boolean)
    .join(";");
}

function mediaUrl(product: Product, storefrontOrigin: string) {
  if (/^https:\/\//i.test(product.image)) return product.image;
  const path = product.image.startsWith("/") ? product.image : `/${product.image}`;
  return new URL(path, `${storefrontOrigin.replace(/\/$/, "")}/`).toString();
}

function handleForProduct(product: Product) {
  return `ap-${product.id}`;
}

function optionLabels(products: Product[]) {
  const used = new Map<string, number>();
  return products.map((product) => {
    const size = product.size === "Size not specified" ? "Standard size" : product.size;
    const base = [size, product.concentration].filter(Boolean).join(" · ").slice(0, 46) || "Standard edition";
    const number = (used.get(base) || 0) + 1;
    used.set(base, number);
    return number === 1 ? base : `${base.slice(0, 46)} ${number}`;
  });
}

function productRow(product: Product, handle: string, optionChoices?: string[]): CsvRow {
  return {
    handle,
    fieldType: "PRODUCT",
    name: product.name.slice(0, 80),
    visible: "TRUE",
    plainDescription: product.description.slice(0, 16000),
    categorySlugs: categorySlugs(product),
    primaryCategorySlug: "all-fragrances",
    ribbon: product.newArrival ? "New" : "",
    brand: product.brand.slice(0, 50),
    price: product.price.toFixed(2),
    strikethroughPrice: product.compareAtPrice && product.compareAtPrice > product.price ? product.compareAtPrice.toFixed(2) : "",
    inventory: optionChoices ? "" : String(Math.max(0, Math.floor(product.stock))),
    preOrderEnabled: "FALSE",
    sku: optionChoices ? "" : (product.loyverseVariantId || product.id).slice(0, 40),
    productOptionName1: optionChoices ? "Edition" : "",
    productOptionType1: optionChoices ? "TEXT_CHOICES" : "",
    productOptionChoices1: optionChoices?.join(";") || "",
  };
}

function mediaRow(product: Product, handle: string, storefrontOrigin: string): CsvRow {
  return {
    handle,
    fieldType: "MEDIA",
    media: mediaUrl(product, storefrontOrigin),
    mediaAltText: product.imageAlt.slice(0, 1000),
  };
}

function variantRow(product: Product, handle: string, choice: string): CsvRow {
  return {
    handle,
    fieldType: "VARIANT",
    price: product.price.toFixed(2),
    strikethroughPrice: product.compareAtPrice && product.compareAtPrice > product.price ? product.compareAtPrice.toFixed(2) : "",
    inventory: String(Math.max(0, Math.floor(product.stock))),
    preOrderEnabled: "FALSE",
    sku: (product.loyverseVariantId || product.id).slice(0, 40),
    productOptionChoices1: choice,
  };
}

export function buildWixCatalogCsv(inputProducts: Product[], storefrontOrigin: string): WixCatalogExport {
  const products = inputProducts.map(cleanProduct);
  const productById = new Map(products.map((product) => [product.id, product]));
  const groupedIds = new Set(PRODUCT_VARIANT_FAMILIES.flatMap((family) => family.productIds));
  const rows: CsvRow[] = [];
  let productCount = 0;
  let variantCount = 0;
  let groupedFamilyCount = 0;

  for (const family of PRODUCT_VARIANT_FAMILIES) {
    const variants = family.productIds.map((id) => productById.get(id)).filter((product): product is Product => Boolean(product));
    if (variants.length < 2) continue;
    const representative = { ...variants[0], brand: family.brand, name: family.name };
    const handle = `ap-family-${family.key}`;
    const labels = optionLabels(variants);
    rows.push(productRow(representative, handle, labels));
    variants.forEach((variant, index) => rows.push(variantRow(variant, handle, labels[index])));
    const uniqueMedia = new Set<string>();
    for (const variant of variants) {
      const url = mediaUrl(variant, storefrontOrigin);
      if (uniqueMedia.has(url)) continue;
      uniqueMedia.add(url);
      rows.push(mediaRow(variant, handle, storefrontOrigin));
    }
    productCount += 1;
    variantCount += variants.length;
    groupedFamilyCount += 1;
  }

  for (const product of products) {
    if (groupedIds.has(product.id)) continue;
    const handle = handleForProduct(product);
    rows.push(productRow(product, handle));
    rows.push(mediaRow(product, handle, storefrontOrigin));
    productCount += 1;
    variantCount += 1;
  }

  return {
    csv: [WIX_CSV_COLUMNS.join(","), ...rows.map(rowToCsv)].join("\n") + "\n",
    productCount,
    variantCount,
    groupedFamilyCount,
  };
}
