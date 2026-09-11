import { writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, OAuthStrategy } from "@wix/sdk";
import { readOnlyVariantsV3 } from "@wix/stores";
import { isConfiguredSecret } from "../lib/env";
import products from "../data/loyverse-products.json";

type CatalogMap = Record<string, { productId: string; variantId: string }>;

async function main() {
  const clientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID;
  if (!isConfiguredSecret(clientId)) throw new Error("NEXT_PUBLIC_WIX_CLIENT_ID is not configured");

  const client = createClient({
    auth: OAuthStrategy({ clientId }),
    modules: { variants: readOnlyVariantsV3 },
  });
  let page = await client.variants.queryVariants().limit(1000).find();
  const variants = [...page.items];
  while (page.hasNext()) {
    page = await page.next();
    variants.push(...page.items);
  }

  const expectedSkus = new Set(products.map((product) => product.loyverseVariantId || product.id));
  const map: CatalogMap = {};
  for (const variant of variants) {
    const sku = variant.sku?.trim();
    const productId = variant.productData?.productId;
    const variantId = variant.variantId;
    if (!sku || !productId || !variantId || !expectedSkus.has(sku)) continue;
    if (map[sku]) throw new Error(`Duplicate Wix SKU found: ${sku}`);
    map[sku] = { productId, variantId };
  }

  const missing = [...expectedSkus].filter((sku) => !map[sku]);
  if (missing.length) {
    throw new Error(`Wix catalog mapping is incomplete: ${missing.length} of ${expectedSkus.size} expected SKUs are missing. First missing SKU: ${missing[0]}`);
  }

  const sorted = Object.fromEntries(Object.entries(map).sort(([left], [right]) => left.localeCompare(right)));
  const targetPath = path.join(process.cwd(), "data", "wix-catalog-map.json");
  await writeFile(targetPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  process.stdout.write(`Mapped ${Object.keys(sorted).length}/${expectedSkus.size} expected Wix variants by SKU.\n${targetPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
