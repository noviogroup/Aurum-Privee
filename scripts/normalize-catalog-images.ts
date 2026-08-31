import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeProductPackshot, packshotKindForName } from "../lib/product-packshot";
import type { Product } from "../lib/types";

type ManifestImage = {
  sourceUrl: string;
  localPath: string;
  normalizedPath?: string;
  sha256: string;
  width: number;
  height: number;
  bytes: number;
  mirroredAt: string;
  normalization?: {
    version: 2;
    kind: "standard" | "set";
    sourceFillRatio: number;
    trimPasses: number;
    contentWidth: number;
    contentHeight: number;
    reviewReasons: string[];
    normalizedAt: string;
  };
};

type Manifest = {
  generatedAt: string | null;
  images: Record<string, ManifestImage>;
  rejected?: Record<string, { sourceUrl: string; reason: string; checkedAt: string }>;
};

type ReviewRow = {
  priority: "high" | "medium" | "low";
  itemId: string;
  productName: string;
  image: string;
  reasons: string[];
};

const placeholderImage = "/images/product-awaiting-photography.webp";

async function main() {
  const root = process.cwd();
  const manifestPath = path.join(root, "data", "loyverse-image-manifest.json");
  const productsPath = path.join(root, "data", "loyverse-products.json");
  const outputDirectory = path.join(root, "public", "product-images", "catalog-v2");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  const products = JSON.parse(await readFile(productsPath, "utf8")) as Product[];
  const productsByItem = new Map(products.filter((product) => product.loyverseItemId).map((product) => [product.loyverseItemId!, product]));
  const review: ReviewRow[] = [];
  await mkdir(outputDirectory, { recursive: true });

  let completed = 0;
  for (const [itemId, entry] of Object.entries(manifest.images)) {
    const product = productsByItem.get(itemId);
    const productName = product ? `${product.brand} ${product.name}` : itemId;
    const kind = packshotKindForName(productName);
    const sourcePath = path.join(root, "public", entry.localPath.replace(/^\//, ""));
    const source = await readFile(sourcePath);
    const normalized = await normalizeProductPackshot(source, { kind });
    const normalizedPath = `/product-images/catalog-v2/${itemId}.webp`;
    await writeFile(path.join(outputDirectory, `${itemId}.webp`), normalized.output);

    const reviewReasons = [...normalized.reviewReasons];
    if (entry.width < 300 || entry.height < 300) reviewReasons.push("source-below-300px");
    if (entry.width <= 500 || entry.height <= 500) reviewReasons.push("replace-with-official-high-resolution-packshot");
    if (entry.width === 500 && entry.height === 500) reviewReasons.push("manual-source-rights-and-watermark-check");
    entry.normalizedPath = normalizedPath;
    entry.normalization = {
      version: 2,
      kind,
      sourceFillRatio: normalized.sourceFillRatio,
      trimPasses: normalized.trimPasses,
      contentWidth: normalized.contentWidth,
      contentHeight: normalized.contentHeight,
      reviewReasons,
      normalizedAt: new Date().toISOString(),
    };
    if (reviewReasons.length) review.push({
      priority: reviewReasons.includes("source-below-300px") || reviewReasons.includes("non-studio-background")
        ? "high"
        : reviewReasons.includes("manual-source-rights-and-watermark-check") && reviewReasons.length === 2 ? "low" : "medium",
      itemId,
      productName,
      image: normalizedPath,
      reasons: reviewReasons,
    });
    completed += 1;
    if (completed % 50 === 0 || completed === Object.keys(manifest.images).length) process.stdout.write(`Normalized ${completed}/${Object.keys(manifest.images).length}\n`);
  }

  let quarantined = 0;
  for (const product of products) {
    const entry = product.loyverseItemId ? manifest.images[product.loyverseItemId] : undefined;
    if (entry?.normalizedPath) product.image = entry.normalizedPath;
    else if (product.image.startsWith("/product-images/") && !product.image.startsWith("/product-images/loyverse/") && !product.image.startsWith("/product-images/catalog-v2/")) {
      review.push({
        priority: "high",
        itemId: product.loyverseItemId || product.id,
        productName: `${product.brand} ${product.name}`,
        image: product.image,
        reasons: ["legacy-lifestyle-image-quarantined", "official-packshot-required"],
      });
      product.image = placeholderImage;
      product.imageAlt = `Photography for ${product.brand} ${product.name} is being prepared`;
      quarantined += 1;
    } else if (product.image === placeholderImage) {
      review.push({
        priority: "high",
        itemId: product.loyverseItemId || product.id,
        productName: `${product.brand} ${product.name}`,
        image: product.image,
        reasons: ["official-packshot-required"],
      });
      quarantined += 1;
    }
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
  review.sort((left, right) => priorityOrder[left.priority] - priorityOrder[right.priority] || left.productName.localeCompare(right.productName));
  const generatedAt = new Date().toISOString();
  manifest.generatedAt = generatedAt;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(productsPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
  const missingProducts = products.filter((product) => product.image === placeholderImage);
  await writeFile(
    path.join(root, "data", "missing-product-images.csv"),
    [
      '"variant_id","item_id","product_name","category","sku","barcode"',
      ...missingProducts.map((product) => [product.id, product.loyverseItemId || "", `${product.brand} - ${product.name}`, product.family, "", ""].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")),
    ].join("\n") + "\n",
    "utf8",
  );
  await writeFile(path.join(root, "data", "product-image-review-v2.json"), `${JSON.stringify({ version: 2, generatedAt, normalized: completed, quarantined, review }, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(root, "data", "product-image-review-v2.csv"),
    ["priority,item_id,product_name,image,reasons", ...review.map((row) => [row.priority, row.itemId, row.productName, row.image, row.reasons.join("|")].map((value) => `"${value.replaceAll('"', '""')}"`).join(","))].join("\n") + "\n",
    "utf8",
  );
  process.stdout.write(`${JSON.stringify({ normalized: completed, quarantined, review: review.length })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Catalog image normalization failed"}\n`);
  process.exitCode = 1;
});
