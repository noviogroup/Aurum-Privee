import type { CommerceTax } from "@/lib/tax";
import type { Product, ProductAudience, ScentFamily } from "@/lib/types";

export class ClientCatalogResponseError extends Error {
  constructor() {
    super("The catalogue returned an unexpected response");
    this.name = "ClientCatalogResponseError";
  }
}

type CatalogResponse = {
  products: Product[];
  total: number;
};

const scentFamilies = new Set<ScentFamily>(["Floral", "Fresh", "Woody", "Amber", "Gourmand"]);
const audiences = new Set<ProductAudience>(["Women", "Men", "Unisex"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === "boolean";
}

function isOptionalFiniteNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isFinite(value));
}

function isCommerceTax(value: unknown): value is CommerceTax {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.name === "string"
    && (value.type === "INCLUDED" || value.type === "ADDED")
    && typeof value.rate === "number"
    && Number.isFinite(value.rate);
}

function isProduct(value: unknown): value is Product {
  if (!isRecord(value) || !isRecord(value.notes)) return false;
  if (typeof value.family !== "string" || !scentFamilies.has(value.family as ScentFamily)) return false;
  if (value.audience !== undefined && (typeof value.audience !== "string" || !audiences.has(value.audience as ProductAudience))) return false;
  if (value.detailsSource !== undefined && (!isRecord(value.detailsSource) || typeof value.detailsSource.label !== "string" || typeof value.detailsSource.url !== "string")) return false;
  if (value.loyverseTaxes !== undefined && (!Array.isArray(value.loyverseTaxes) || !value.loyverseTaxes.every(isCommerceTax))) return false;

  return typeof value.id === "string"
    && typeof value.slug === "string"
    && typeof value.brand === "string"
    && typeof value.name === "string"
    && typeof value.concentration === "string"
    && typeof value.size === "string"
    && typeof value.price === "number"
    && Number.isFinite(value.price)
    && isOptionalFiniteNumber(value.compareAtPrice)
    && typeof value.description === "string"
    && isStringArray(value.notes.top)
    && isStringArray(value.notes.heart)
    && isStringArray(value.notes.base)
    && typeof value.image === "string"
    && typeof value.imageAlt === "string"
    && typeof value.stock === "number"
    && Number.isFinite(value.stock)
    && isOptionalString(value.loyverseItemId)
    && isOptionalString(value.loyverseVariantId)
    && (value.loyverseTaxIds === undefined || isStringArray(value.loyverseTaxIds))
    && isOptionalString(value.wixProductId)
    && isOptionalString(value.wixVariantId)
    && isOptionalBoolean(value.featured)
    && isOptionalBoolean(value.newArrival);
}

export function parseClientCatalogResponse(value: unknown): CatalogResponse {
  if (!isRecord(value)
    || !Array.isArray(value.products)
    || !value.products.every(isProduct)
    || typeof value.total !== "number"
    || !Number.isInteger(value.total)
    || value.total < value.products.length) {
    throw new ClientCatalogResponseError();
  }

  return { products: value.products, total: value.total };
}
