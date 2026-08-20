import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { Product } from "../lib/types";

type ManifestImage = {
  sourceUrl: string;
  localPath: string;
  sha256: string;
  width: number;
  height: number;
  bytes: number;
  mirroredAt: string;
};

type Manifest = {
  generatedAt: string | null;
  images: Record<string, ManifestImage>;
  rejected?: Record<string, { sourceUrl: string; reason: string; checkedAt: string }>;
};

const sourceOrigin = "https://api.loyverse.com";
const concurrency = 8;

async function fetchImage(sourceUrl: string) {
  const url = new URL(sourceUrl);
  if (url.origin !== sourceOrigin || !url.pathname.startsWith("/image/")) throw new Error("Unexpected Loyverse image URL");
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: "error", cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const declaredLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(declaredLength) && declaredLength > 10_000_000) throw new Error("Image exceeds 10 MB");
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length || buffer.length > 10_000_000) throw new Error("Image has an invalid size");
      return buffer;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 300 * (2 ** attempt)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Image download failed");
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  const snapshotPath = path.join(process.cwd(), "data", "loyverse-products.json");
  const manifestPath = path.join(process.cwd(), "data", "loyverse-image-manifest.json");
  const outputDirectory = path.join(process.cwd(), "public", "product-images", "loyverse");
  const products = JSON.parse(await readFile(snapshotPath, "utf8")) as Product[];
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  const rejected = manifest.rejected ||= {};
  try {
    const priorFailures = JSON.parse(await readFile(path.join(process.cwd(), "data", "loyverse-image-failures.json"), "utf8")) as Array<{ itemId: string; sourceUrl: string; error: string }>;
    for (const failure of priorFailures) {
      if (!manifest.images[failure.itemId]) rejected[failure.itemId] = { sourceUrl: failure.sourceUrl, reason: failure.error, checkedAt: new Date().toISOString() };
    }
  } catch {
    // A failure ledger is optional on the first successful run.
  }
  const candidates = [...new Map(products
    .filter((product) => product.loyverseItemId && product.image.startsWith(`${sourceOrigin}/image/`))
    .map((product) => [product.loyverseItemId!, { itemId: product.loyverseItemId!, sourceUrl: product.image }])).values()];
  await mkdir(outputDirectory, { recursive: true });

  let completed = 0;
  let mirrored = 0;
  let reused = 0;
  const failures: Array<{ itemId: string; sourceUrl: string; error: string }> = [];
  let cursor = 0;

  async function worker() {
    while (cursor < candidates.length) {
      const candidate = candidates[cursor++];
      const existing = manifest.images[candidate.itemId];
      if (!refresh && existing?.sourceUrl === candidate.sourceUrl) {
        reused += 1;
        completed += 1;
        continue;
      }
      try {
        const source = await fetchImage(candidate.sourceUrl);
        const metadata = await sharp(source).metadata();
        if (!metadata.width || !metadata.height || metadata.width < 100 || metadata.height < 100) throw new Error("Image dimensions are invalid");
        const targetPath = path.join(outputDirectory, `${candidate.itemId}.webp`);
        const output = await sharp(source)
          .rotate()
          .resize(1000, 1000, { fit: "contain", background: { r: 247, g: 245, b: 241, alpha: 1 }, withoutEnlargement: true })
          .webp({ quality: 88, effort: 5 })
          .toBuffer();
        await writeFile(targetPath, output);
        manifest.images[candidate.itemId] = {
          sourceUrl: candidate.sourceUrl,
          localPath: `/product-images/loyverse/${candidate.itemId}.webp`,
          sha256: createHash("sha256").update(source).digest("hex"),
          width: metadata.width,
          height: metadata.height,
          bytes: output.byteLength,
          mirroredAt: new Date().toISOString(),
        };
        delete rejected[candidate.itemId];
        mirrored += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown image error";
        failures.push({ itemId: candidate.itemId, sourceUrl: candidate.sourceUrl, error: message });
        rejected[candidate.itemId] = { sourceUrl: candidate.sourceUrl, reason: message, checkedAt: new Date().toISOString() };
      }
      completed += 1;
      if (completed % 25 === 0 || completed === candidates.length) process.stdout.write(`Mirrored ${completed}/${candidates.length}\n`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, () => worker()));
  manifest.generatedAt = new Date().toISOString();
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  for (const product of products) {
    if (!product.loyverseItemId) continue;
    const entry = manifest.images[product.loyverseItemId];
    if (entry && (product.image === entry.sourceUrl || product.image.startsWith(`${sourceOrigin}/image/`))) product.image = entry.localPath;
  }
  for (const failure of failures) {
    const product = products.find((candidate) => candidate.loyverseItemId === failure.itemId);
    if (product?.image === failure.sourceUrl) product.image = "/images/product-awaiting-photography.webp";
  }
  await writeFile(snapshotPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ candidates: candidates.length, mirrored, reused, failures: failures.length })}\n`);
  if (failures.length) {
    await writeFile(path.join(process.cwd(), "data", "loyverse-image-failures.json"), `${JSON.stringify(failures, null, 2)}\n`, "utf8");
    process.exitCode = 2;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Loyverse image mirror failed"}\n`);
  process.exitCode = 1;
});
