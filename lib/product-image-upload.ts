import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { ProductImageUploadResult } from "@/lib/operations-image-types";
import { normalizeProductPackshot } from "@/lib/product-packshot";

export const productImageBucket = "product-images";
export const maximumProductImageBytes = 10_000_000;
const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff"]);

export class ProductImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductImageValidationError";
  }
}

export async function normalizeProductImage(input: { bytes: Buffer; contentType: string }) {
  if (!input.bytes.length) throw new ProductImageValidationError("Choose an image to upload.");
  if (input.bytes.length > maximumProductImageBytes) throw new ProductImageValidationError("Image must be 10 MB or smaller.");
  if (!acceptedImageTypes.has(input.contentType)) throw new ProductImageValidationError("Use a JPG, PNG, WebP, AVIF or TIFF image.");
  try {
    const metadata = await sharp(input.bytes, { limitInputPixels: 100_000_000 }).metadata();
    if (!metadata.width || !metadata.height) throw new ProductImageValidationError("Image dimensions could not be read.");
    if (metadata.width < 800 || metadata.height < 800) throw new ProductImageValidationError(`Image must be at least 800×800 pixels. This file is ${metadata.width}×${metadata.height}.`);
    if (metadata.width > 20_000 || metadata.height > 20_000) throw new ProductImageValidationError("Image dimensions are too large.");
    const output = (await normalizeProductPackshot(input.bytes)).output;
    return { output, width: metadata.width, height: metadata.height, sha256: createHash("sha256").update(input.bytes).digest("hex") };
  } catch (error) {
    if (error instanceof ProductImageValidationError) throw error;
    throw new ProductImageValidationError("The uploaded file is not a valid product image.");
  }
}

export async function publishProductImage(input: { productId: string; filename: string; contentType: string; bytes: Buffer }): Promise<ProductImageUploadResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");
  const normalized = await normalizeProductImage({ bytes: input.bytes, contentType: input.contentType });
  const storagePath = `products/${input.productId}/${Date.now()}-${randomUUID()}.webp`;
  const { error: storageError } = await supabase.storage.from(productImageBucket).upload(storagePath, normalized.output, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (storageError) throw new Error("Product image storage is not configured");
  const { data: publicUrl } = supabase.storage.from(productImageBucket).getPublicUrl(storagePath);
  const sourceFilename = input.filename.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 255) || "product-image";
  try {
    const { data, error } = await supabase.rpc("publish_product_image", {
      p_product_id: input.productId,
      p_image_url: publicUrl.publicUrl,
      p_storage_path: storagePath,
      p_source_filename: sourceFilename,
      p_source_sha256: normalized.sha256,
      p_source_width: normalized.width,
      p_source_height: normalized.height,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Product image could not be published");
    return { productId: row.product_id, imageUrl: row.image_url, width: normalized.width, height: normalized.height, uploadedAt: row.published_at };
  } catch (error) {
    await supabase.storage.from(productImageBucket).remove([storagePath]);
    throw error;
  }
}
