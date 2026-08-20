import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { normalizeProductImage, ProductImageValidationError } from "../lib/product-image-upload";

test("normalizes an approved product photograph to bounded WebP", async () => {
  const source = await sharp({ create: { width: 1200, height: 1000, channels: 3, background: "#d8d3da" } }).jpeg().toBuffer();
  const normalized = await normalizeProductImage({ bytes: source, contentType: "image/jpeg" });
  const metadata = await sharp(normalized.output).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 1600);
  assert.equal(normalized.width, 1200);
  assert.equal(normalized.height, 1000);
  assert.match(normalized.sha256, /^[a-f0-9]{64}$/);
});

test("rejects product photographs below the catalog minimum", async () => {
  const source = await sharp({ create: { width: 799, height: 1200, channels: 3, background: "#d8d3da" } }).png().toBuffer();
  await assert.rejects(
    normalizeProductImage({ bytes: source, contentType: "image/png" }),
    (error: unknown) => error instanceof ProductImageValidationError && /at least 800×800/.test(error.message),
  );
});

test("rejects unsupported and malformed image uploads", async () => {
  await assert.rejects(
    normalizeProductImage({ bytes: Buffer.from("not an image"), contentType: "text/plain" }),
    (error: unknown) => error instanceof ProductImageValidationError && /JPG, PNG, WebP/.test(error.message),
  );
  await assert.rejects(
    normalizeProductImage({ bytes: Buffer.from("not an image"), contentType: "image/jpeg" }),
    (error: unknown) => error instanceof ProductImageValidationError && /not a valid product image/.test(error.message),
  );
});
