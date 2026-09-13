import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Product } from "../lib/types";
import { normalizeLocalCatalogProducts } from "../lib/local-catalog-product";
import { rankRelatedProducts } from "../lib/product-relationships";
import { getProductVariantFamily, PRODUCT_VARIANT_FAMILIES } from "../lib/product-variants";

type WixReference = { productId: string; variantId: string };

const WEIGHTS = [
  ["Verified shared fragrance notes", "12 per shared note, up to 48"],
  ["Same brand with a distinctive shared name term", "24, plus up to 8 for additional shared terms"],
  ["Same scent family", "34"],
  ["Same audience", "22"],
  ["Same brand / fragrance house", "18"],
  ["Same concentration format", "8"],
  ["Comparable price", "4–16, based on relative difference"],
] as const;

function markdown(value: string | number) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

async function main() {
  const root = process.cwd();
  const products = normalizeLocalCatalogProducts(
    JSON.parse(await readFile(path.join(root, "data", "loyverse-products.json"), "utf8")) as Product[],
  );
  const wixMap = JSON.parse(await readFile(path.join(root, "data", "wix-catalog-map.json"), "utf8")) as Record<string, WixReference>;
  const missingWixMappings = products.filter((product) => !wixMap[product.id]);
  if (missingWixMappings.length) throw new Error(`Missing Wix mappings for ${missingWixMappings.length} products.`);

  const records = products.map((product) => {
    const variantFamily = getProductVariantFamily(product.id);
    const related = rankRelatedProducts(product, products, 4);
    if (related.length !== 4) throw new Error(`${product.id} has ${related.length} related products; expected four.`);
    return {
      id: product.id,
      sourceSku: product.loyverseVariantId || product.id,
      wixProductId: wixMap[product.id].productId,
      wixVariantId: wixMap[product.id].variantId,
      slug: product.slug,
      brand: product.brand,
      name: product.name,
      audience: product.audience,
      scentFamily: product.family,
      concentration: product.concentration,
      size: product.size,
      price: product.price,
      variantFamily: variantFamily ? {
        key: variantFamily.key,
        displayName: `${variantFamily.brand} ${variantFamily.name}`,
        siblingProductIds: variantFamily.productIds.filter((id) => id !== product.id),
      } : null,
      related: related.map((relationship) => ({
        productId: relationship.product.id,
        wixProductId: wixMap[relationship.product.id].productId,
        slug: relationship.product.slug,
        displayName: `${relationship.product.brand} ${relationship.product.name}`,
        score: relationship.score,
        primaryReason: relationship.primaryReason,
        reasons: relationship.reasons,
        signals: relationship.signals,
        sharedNotes: relationship.sharedNotes,
      })),
    };
  });

  const variantSkuCount = records.filter((record) => record.variantFamily).length;
  const signalCounts = records.flatMap((record) => record.related).flatMap((related) => related.signals)
    .reduce<Record<string, number>>((counts, signal) => ({ ...counts, [signal]: (counts[signal] || 0) + 1 }), {});
  const audit = {
    schemaVersion: 1,
    source: "Aurum Privée controlled 733-SKU catalogue and Wix live ID map",
    summary: {
      skuCount: records.length,
      wixMappedSkuCount: records.filter((record) => record.wixProductId && record.wixVariantId).length,
      reviewedVariantFamilyCount: PRODUCT_VARIANT_FAMILIES.length,
      variantSkuCount,
      standaloneSkuCount: records.length - variantSkuCount,
      recommendationsPerSku: 4,
      directedRecommendationCount: records.length * 4,
      signalCounts,
    },
    weights: Object.fromEntries(WEIGHTS),
    guardrails: [
      "Only explicitly reviewed families are variants; name similarity never creates a variant.",
      "A product never recommends itself or one of its own variant siblings.",
      "A candidate variant family is collapsed to its strongest matching edition.",
      "Out-of-stock candidates are excluded from storefront recommendations.",
      "Scores are deterministic and use only catalogue facts available to the storefront.",
    ],
    products: records,
  };

  const jsonPath = path.join(root, "data", "product-relationships.json");
  await writeFile(jsonPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");

  const lines = [
    "# Aurum Privée product relationship register",
    "",
    "This is the client-readable companion to `data/product-relationships.json`. It records how every controlled SKU is connected in the custom storefront while keeping true variants separate from recommendations.",
    "",
    "## Coverage",
    "",
    `- ${records.length} of ${records.length} controlled SKUs mapped to Wix product and variant IDs.`,
    `- ${PRODUCT_VARIANT_FAMILIES.length} manually reviewed variant families covering ${variantSkuCount} SKUs; ${records.length - variantSkuCount} SKUs remain deliberately standalone.`,
    `- Four ranked recommendations per SKU (${records.length * 4} directional recommendation connections).`,
    "- Product pages recompute the same deterministic ranking against the live, in-stock Wix catalogue, so hidden or unavailable products are automatically removed.",
    "",
    "## Ranking model",
    "",
    "| Signal | Weight |",
    "| --- | ---: |",
    ...WEIGHTS.map(([signal, weight]) => `| ${signal} | ${weight} |`),
    "",
    "Signals are additive. Verified shared notes lead when available; family, audience, brand, format and price provide reliable coverage for the full catalogue. The displayed ‘Why it connects’ line uses the strongest available reason.",
    "",
    "## Guardrails",
    "",
    "- Variant status is explicit and reviewed. Similar wording alone never merges products; Dior Sauvage and Dior Eau Sauvage remain separate.",
    "- The active SKU and every sibling edition are excluded from its recommendation list.",
    "- A recommended variant family can appear only once, using its best-matching in-stock edition.",
    "- Ties resolve deterministically, so catalogue order does not cause recommendations to jump.",
    "",
    "## Complete connection register",
    "",
    "The full UUIDs below are the source SKU keys used by the Wix mapping. Each related entry shows its match score and the customer-facing reason.",
    "",
    "| Source SKU | Product | Variant family / siblings | Related 1 | Related 2 | Related 3 | Related 4 |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...records.map((record) => {
      const variant = record.variantFamily
        ? `${record.variantFamily.displayName} (${record.variantFamily.siblingProductIds.length} sibling${record.variantFamily.siblingProductIds.length === 1 ? "" : "s"})`
        : "Standalone";
      const related = record.related.map((item) => `${item.displayName} — ${item.score}: ${item.primaryReason}`);
      return `| ${markdown(record.sourceSku)} | ${markdown(`${record.brand} ${record.name} · ${record.size} · ${record.concentration}`)} | ${markdown(variant)} | ${related.map(markdown).join(" | ")} |`;
    }),
    "",
    "## Maintenance",
    "",
    "Run `npm run catalog:relationships` after catalogue, enrichment, or reviewed variant-family changes. Commit both generated files so the live rules and client audit remain reviewable together.",
    "",
  ];
  const markdownPath = path.join(root, "docs", "PRODUCT-RELATIONSHIPS.md");
  await writeFile(markdownPath, lines.join("\n"), "utf8");

  process.stdout.write(`Relationship register ready: ${records.length} SKUs, ${variantSkuCount} variant SKUs, ${records.length * 4} ranked recommendation connections.\n`);
  process.stdout.write(`${jsonPath}\n${markdownPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
