import type { Product, ProductAudience } from "@/lib/types";
import { audienceForProduct } from "@/lib/product-normalization";
import { getProductVariantFamily } from "@/lib/product-variants";

export type ProductRelationshipSignal =
  | "shared-notes"
  | "same-brand-line"
  | "same-family"
  | "same-audience"
  | "same-brand"
  | "same-concentration"
  | "similar-price";

export type ProductRelationship = {
  product: Product;
  score: number;
  primaryReason: string;
  reasons: string[];
  signals: ProductRelationshipSignal[];
  sharedNotes: string[];
};

const NAME_STOP_WORDS = new Set([
  "and", "body", "cologne", "de", "eau", "edition", "elixir", "for", "fragrance", "intense",
  "lady", "man", "men", "mist", "new", "night", "parfum", "perfume", "pour", "spray", "the",
  "toilette", "travel", "unisex", "woman", "women",
]);

function productAudience(product: Product): ProductAudience {
  return product.audience || audienceForProduct(null, product.name, product.description);
}

function normalizedConcentration(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("parfum") || normalized === "edp") return "parfum";
  if (normalized.includes("toilette") || normalized === "edt") return "toilette";
  if (normalized.includes("cologne") || normalized === "edc") return "cologne";
  return normalized.replace(/[^a-z0-9]+/g, " ").trim();
}

function searchableNameTokens(product: Product) {
  const brandTokens = new Set(product.brand.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  return new Set(product.name.toLowerCase().split(/[^a-z0-9]+/).filter((token) => (
    token.length >= 3
    && !/^\d+$/.test(token)
    && !NAME_STOP_WORDS.has(token)
    && !brandTokens.has(token)
  )));
}

function sharedNameTokens(left: Product, right: Product) {
  const leftTokens = searchableNameTokens(left);
  return [...searchableNameTokens(right)].filter((token) => leftTokens.has(token));
}

function productNotes(product: Product) {
  const notes = [...product.notes.top, ...product.notes.heart, ...product.notes.base];
  return new Map(notes.map((note) => [note.toLowerCase(), note]));
}

function sharedProductNotes(left: Product, right: Product) {
  const leftNotes = productNotes(left);
  const shared = [...productNotes(right)].filter(([key]) => leftNotes.has(key));
  return shared.map(([key]) => leftNotes.get(key) || key).slice(0, 4);
}

function priceScore(left: Product, right: Product) {
  const higher = Math.max(left.price, right.price);
  if (higher <= 0) return 0;
  const difference = Math.abs(left.price - right.price) / higher;
  if (difference <= 0.1) return 16;
  if (difference <= 0.25) return 12;
  if (difference <= 0.5) return 8;
  if (difference <= 0.75) return 4;
  return 0;
}

function relationshipFor(current: Product, candidate: Product): ProductRelationship {
  const signals: ProductRelationshipSignal[] = [];
  const reasons: string[] = [];
  const sharedNotes = sharedProductNotes(current, candidate);
  const nameTokens = sharedNameTokens(current, candidate);
  const sameBrand = current.brand.toLowerCase() === candidate.brand.toLowerCase();
  const sameFamily = current.family === candidate.family;
  const currentAudience = productAudience(current);
  const candidateAudience = productAudience(candidate);
  const sameAudience = currentAudience === candidateAudience;
  const sameConcentration = normalizedConcentration(current.concentration) === normalizedConcentration(candidate.concentration);
  const comparablePrice = priceScore(current, candidate);
  let score = 0;

  if (sharedNotes.length) {
    score += Math.min(48, sharedNotes.length * 12);
    signals.push("shared-notes");
    reasons.push(`Shared ${sharedNotes.slice(0, 2).join(" and ")} notes`);
  }
  if (sameBrand && nameTokens.length) {
    score += 24 + Math.min(8, nameTokens.length * 4);
    signals.push("same-brand-line");
    const sharedLine = nameTokens.slice(0, 2).map((token) => `${token[0].toUpperCase()}${token.slice(1)}`).join(" ");
    reasons.push(`Another ${sharedLine} fragrance from ${current.brand}`);
  }
  if (sameFamily) {
    score += 34;
    signals.push("same-family");
    reasons.push(`Same ${current.family.toLowerCase()} scent family`);
  }
  if (sameAudience) {
    score += 22;
    signals.push("same-audience");
    reasons.push(currentAudience === "Unisex" ? "Another unisex selection" : `Selected for ${currentAudience.toLowerCase()}`);
  }
  if (sameBrand) {
    score += 18;
    signals.push("same-brand");
    reasons.push(`More from ${current.brand}`);
  }
  if (sameConcentration) {
    score += 8;
    signals.push("same-concentration");
    reasons.push(`Same ${current.concentration.toLowerCase()} format`);
  }
  if (comparablePrice) {
    score += comparablePrice;
    signals.push("similar-price");
    reasons.push("Comparable price point");
  }

  return {
    product: candidate,
    score,
    primaryReason: reasons[0] || "A complementary Aurum Privée selection",
    reasons,
    signals,
    sharedNotes,
  };
}

function candidateGroupKey(product: Product) {
  return getProductVariantFamily(product.id)?.key || `product:${product.id}`;
}

function compareRelationships(left: ProductRelationship, right: ProductRelationship) {
  return right.score - left.score
    || Number(right.product.featured) - Number(left.product.featured)
    || `${left.product.brand} ${left.product.name} ${left.product.id}`.localeCompare(`${right.product.brand} ${right.product.name} ${right.product.id}`);
}

/**
 * Ranks distinct, customer-facing alternatives. Reviewed sibling variants are
 * excluded, and each candidate variant family appears only once.
 */
export function rankRelatedProducts(current: Product, products: Product[], limit = 4): ProductRelationship[] {
  if (limit <= 0) return [];
  const currentFamily = getProductVariantFamily(current.id);
  const currentSiblingIds = new Set(currentFamily?.productIds || [current.id]);
  const bestByCandidateGroup = new Map<string, ProductRelationship>();

  for (const candidate of products) {
    if (candidate.id === current.id || currentSiblingIds.has(candidate.id) || candidate.stock <= 0) continue;
    const relationship = relationshipFor(current, candidate);
    const key = candidateGroupKey(candidate);
    const previous = bestByCandidateGroup.get(key);
    if (!previous || compareRelationships(relationship, previous) < 0) bestByCandidateGroup.set(key, relationship);
  }

  return [...bestByCandidateGroup.values()].sort(compareRelationships).slice(0, limit);
}
