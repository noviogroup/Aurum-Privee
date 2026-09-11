import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildWixCatalogCsv } from "../lib/wix-catalog-export";
import type { Product } from "../lib/types";

async function main() {
  const origin = process.env.WIX_STOREFRONT_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || "https://aurumprivee.com";
  const sourcePath = path.join(process.cwd(), "data", "loyverse-products.json");
  const targetPath = path.join(process.cwd(), "data", "wix-product-import.csv");
  const products = JSON.parse(await readFile(sourcePath, "utf8")) as Product[];
  const result = buildWixCatalogCsv(products, origin);

  await writeFile(targetPath, result.csv, "utf8");
  process.stdout.write(`Wix import ready: ${result.productCount} products, ${result.variantCount} variants, ${result.groupedFamilyCount} reviewed variant families.\n`);
  process.stdout.write(`${targetPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
