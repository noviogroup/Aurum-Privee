import sharp from "sharp";

export const packshotCanvasSize = 1600;
export const packshotBackground = "#ffffff";

export type PackshotKind = "standard" | "set";

export type PackshotNormalizationResult = {
  output: Buffer;
  sourceWidth: number;
  sourceHeight: number;
  trimmedWidth: number;
  trimmedHeight: number;
  contentWidth: number;
  contentHeight: number;
  trimPasses: number;
  sourceFillRatio: number;
  reviewReasons: string[];
};

export function packshotKindForName(name: string): PackshotKind {
  return /\b(gift|set|travel|kit|collection|duo|trio|pieces?|pcs?)\b/i.test(name) ? "set" : "standard";
}

async function fitAndCleanStudioBackground(input: Buffer, maxWidth: number, maxHeight: number) {
  const resized = await sharp(input)
    .resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: false })
    .flatten({ background: packshotBackground })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let index = 0; index < resized.data.length; index += resized.info.channels) {
    const red = resized.data[index];
    const green = resized.data[index + 1];
    const blue = resized.data[index + 2];
    const darkest = Math.min(red, green, blue);
    const lightest = Math.max(red, green, blue);
    if (darkest >= 238 && lightest - darkest <= 18) {
      resized.data[index] = 255;
      resized.data[index + 1] = 255;
      resized.data[index + 2] = 255;
    }
  }

  return sharp(resized.data, { raw: resized.info })
    .webp({ quality: 90, effort: 5 })
    .toBuffer();
}

async function trimStudioMargins(input: Buffer) {
  let working = await sharp(input, { limitInputPixels: 100_000_000 })
    .rotate()
    .flatten({ background: packshotBackground })
    .toColorspace("srgb")
    .png()
    .toBuffer();
  let trimPasses = 0;

  for (let pass = 0; pass < 3; pass += 1) {
    const before = await sharp(working).metadata();
    const trimmed = await sharp(working)
      .trim({ threshold: 12 })
      .png()
      .toBuffer({ resolveWithObject: true });
    const widthChanged = trimmed.info.width < (before.width || 0) * 0.985;
    const heightChanged = trimmed.info.height < (before.height || 0) * 0.985;
    if (!widthChanged && !heightChanged) break;
    working = trimmed.data;
    trimPasses += 1;
  }

  return { working, trimPasses };
}

export async function normalizeProductPackshot(input: Buffer, options: { kind?: PackshotKind } = {}): Promise<PackshotNormalizationResult> {
  const source = await sharp(input, { limitInputPixels: 100_000_000 }).metadata();
  if (!source.width || !source.height) throw new Error("Product image dimensions could not be read");

  const { working, trimPasses } = await trimStudioMargins(input);
  const trimmed = await sharp(working).metadata();
  if (!trimmed.width || !trimmed.height) throw new Error("Trimmed product image dimensions could not be read");

  const kind = options.kind || "standard";
  const maxWidth = kind === "set" ? 1280 : 1088;
  const maxHeight = kind === "set" ? 1056 : 1152;
  const fitted = await fitAndCleanStudioBackground(working, maxWidth, maxHeight);
  const content = await sharp(fitted).metadata();
  if (!content.width || !content.height) throw new Error("Normalized product image dimensions could not be read");

  const left = Math.round((packshotCanvasSize - content.width) / 2);
  const centeredTop = Math.round((packshotCanvasSize - content.height) / 2 - 14);
  const top = Math.max(64, centeredTop);
  const output = await sharp({
    create: { width: packshotCanvasSize, height: packshotCanvasSize, channels: 3, background: packshotBackground },
  })
    .composite([{ input: fitted, left, top }])
    .webp({ quality: 88, effort: 5 })
    .toBuffer();

  const sourceFillRatio = (trimmed.width * trimmed.height) / (source.width * source.height);
  const reviewReasons: string[] = [];
  if (trimPasses === 0 && sourceFillRatio > 0.85) reviewReasons.push("non-studio-background");
  if (sourceFillRatio < 0.015) reviewReasons.push("extreme-source-padding");
  if (trimmed.width < 220 && trimmed.height < 220) reviewReasons.push("very-low-detail");

  return {
    output,
    sourceWidth: source.width,
    sourceHeight: source.height,
    trimmedWidth: trimmed.width,
    trimmedHeight: trimmed.height,
    contentWidth: content.width,
    contentHeight: content.height,
    trimPasses,
    sourceFillRatio,
    reviewReasons,
  };
}
