import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { Product } from "../lib/types";
import { emptyCuratedProductImageManifest, parseCuratedProductImageManifest } from "../lib/curated-product-images";

const acceptedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".avif"]);

type MissingRow = {
  variant_id: string;
  item_id: string;
  product_name: string;
  category: string;
  sku: string;
  barcode: string;
};

type Match = {
  sourcePath: string;
  row: MissingRow;
  matchKey: string;
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      cells.push(current);
      current = "";
    } else current += character;
  }
  cells.push(current);
  return cells;
}

function parseMissingCsv(contents: string): MissingRow[] {
  const [headerLine, ...lines] = contents.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  return lines.filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])) as MissingRow;
  });
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function keysForRow(row: MissingRow) {
  return [row.sku, row.barcode, row.variant_id, row.item_id, row.product_name].filter(Boolean).map(normalize).filter((key) => key.length >= 3);
}

function relativePublicPath(absolutePath: string) {
  return `/${path.relative(path.join(process.cwd(), "public"), absolutePath).split(path.sep).join("/")}`;
}

async function main() {
  const inputArgument = process.argv.find((argument) => argument.startsWith("--input="));
  const inputDirectory = path.resolve(inputArgument?.slice("--input=".length) || path.join(process.cwd(), "product-image-intake"));
  const dryRun = process.argv.includes("--dry-run");
  const csvPath = path.join(process.cwd(), "data", "missing-product-images.csv");
  const snapshotPath = path.join(process.cwd(), "data", "loyverse-products.json");
  const outputDirectory = path.join(process.cwd(), "public", "product-images");
  const reportPath = path.join(process.cwd(), "data", "product-image-import-report.json");
  const manifestPath = path.join(process.cwd(), "data", "curated-product-images.json");

  const rows = parseMissingCsv(await readFile(csvPath, "utf8"));
  const products = JSON.parse(await readFile(snapshotPath, "utf8")) as Product[];
  const manifest = await readFile(manifestPath, "utf8")
    .then((contents) => parseCuratedProductImageManifest(JSON.parse(contents)))
    .catch(() => emptyCuratedProductImageManifest());
  const rowByKey = new Map<string, MissingRow[]>();
  for (const row of rows) {
    for (const key of keysForRow(row)) rowByKey.set(key, [...(rowByKey.get(key) || []), row]);
  }

  let filenames: string[];
  try {
    filenames = (await readdir(inputDirectory)).filter((filename) => acceptedExtensions.has(path.extname(filename).toLowerCase()));
  } catch {
    await mkdir(inputDirectory, { recursive: true });
    filenames = [];
  }

  const matches: Match[] = [];
  const unmatched: string[] = [];
  const ambiguous: Array<{ filename: string; candidates: string[] }> = [];
  for (const filename of filenames.sort()) {
    const key = normalize(path.basename(filename, path.extname(filename)));
    const exact = rowByKey.get(key) || [];
    const candidates = exact.length ? exact : rows.filter((row) => keysForRow(row).some((rowKey) => key.includes(rowKey) || rowKey.includes(key)));
    const unique = [...new Map(candidates.map((row) => [row.variant_id, row])).values()];
    if (unique.length === 1) matches.push({ sourcePath: path.join(inputDirectory, filename), row: unique[0], matchKey: key });
    else if (!unique.length) unmatched.push(filename);
    else ambiguous.push({ filename, candidates: unique.map((row) => `${row.product_name} (${row.sku || row.barcode || row.variant_id})`) });
  }

  const duplicateTargets = new Map<string, Match[]>();
  for (const match of matches) duplicateTargets.set(match.row.variant_id, [...(duplicateTargets.get(match.row.variant_id) || []), match]);
  const usableMatches = matches.filter((match) => duplicateTargets.get(match.row.variant_id)?.length === 1);
  for (const [variantId, duplicateMatches] of duplicateTargets) {
    if (duplicateMatches.length > 1) ambiguous.push({ filename: duplicateMatches.map((match) => path.basename(match.sourcePath)).join(", "), candidates: [`duplicate target ${variantId}`] });
  }

  const imported: Array<{ filename: string; variantId: string; productName: string; image: string; width: number; height: number; sourceSha256: string }> = [];
  if (!dryRun) await mkdir(outputDirectory, { recursive: true });
  for (const match of usableMatches) {
    const source = await readFile(match.sourcePath);
    const metadata = await sharp(source).metadata();
    if (!metadata.width || !metadata.height || metadata.width < 800 || metadata.height < 800) {
      ambiguous.push({ filename: path.basename(match.sourcePath), candidates: [`image must be at least 800×800; received ${metadata.width || 0}×${metadata.height || 0}`] });
      continue;
    }
    const targetPath = path.join(outputDirectory, `${match.row.variant_id}.webp`);
    if (!dryRun) {
      await sharp(source)
        .rotate()
        .resize(1600, 1600, { fit: "contain", background: { r: 247, g: 245, b: 241, alpha: 1 }, withoutEnlargement: true })
        .webp({ quality: 90, effort: 5 })
        .toFile(targetPath);
    }
    const image = relativePublicPath(targetPath);
    const product = products.find((candidate) => candidate.id === match.row.variant_id);
    if (!product) {
      unmatched.push(path.basename(match.sourcePath));
      continue;
    }
    if (!dryRun) {
      product.image = image;
      product.imageAlt = `${match.row.product_name} product photograph`;
    }
    imported.push({
      filename: path.basename(match.sourcePath),
      variantId: match.row.variant_id,
      productName: match.row.product_name,
      image,
      width: metadata.width,
      height: metadata.height,
      sourceSha256: createHash("sha256").update(source).digest("hex"),
    });
    if (!dryRun) {
      const importedImage = imported[imported.length - 1];
      manifest.images[match.row.variant_id] = {
        variantId: match.row.variant_id,
        itemId: match.row.item_id,
        sku: match.row.sku,
        barcode: match.row.barcode,
        productName: match.row.product_name,
        image,
        sourceFilename: path.basename(match.sourcePath),
        sourceSha256: importedImage.sourceSha256,
        width: metadata.width,
        height: metadata.height,
        approvedAt: new Date().toISOString(),
      };
    }
  }

  const importedIds = new Set(imported.map((entry) => entry.variantId));
  const remaining = rows.filter((row) => !importedIds.has(row.variant_id));
  const report = {
    dryRun,
    inputDirectory,
    processedAt: new Date().toISOString(),
    acceptedExtensions: [...acceptedExtensions],
    imported,
    unmatched,
    ambiguous,
    remainingMissing: remaining.length,
  };
  if (!dryRun) {
    manifest.updatedAt = new Date().toISOString();
    await writeFile(snapshotPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await writeFile(csvPath, [`"variant_id","item_id","product_name","category","sku","barcode"`, ...remaining.map((row) => [row.variant_id, row.item_id, row.product_name, row.category, row.sku, row.barcode].map((value) => `"${value.replaceAll('"', '""')}"`).join(","))].join("\n") + "\n", "utf8");
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  process.stdout.write(`${JSON.stringify({ files: filenames.length, matched: imported.length, unmatched: unmatched.length, ambiguous: ambiguous.length, remainingMissing: remaining.length, dryRun })}\n`);
  if (unmatched.length || ambiguous.length) process.exitCode = 2;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Product image import failed"}\n`);
  process.exitCode = 1;
});
