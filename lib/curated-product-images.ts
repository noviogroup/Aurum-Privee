export type CuratedProductImage = {
  variantId: string;
  itemId: string;
  sku: string;
  barcode: string;
  productName: string;
  image: string;
  sourceFilename: string;
  sourceSha256: string;
  width: number;
  height: number;
  approvedAt: string;
};

export type CuratedProductImageManifest = {
  version: 1;
  updatedAt: string | null;
  images: Record<string, CuratedProductImage>;
};

export function emptyCuratedProductImageManifest(): CuratedProductImageManifest {
  return { version: 1, updatedAt: null, images: {} };
}

export function parseCuratedProductImageManifest(value: unknown): CuratedProductImageManifest {
  if (!value || typeof value !== "object") return emptyCuratedProductImageManifest();
  const candidate = value as Partial<CuratedProductImageManifest>;
  if (candidate.version !== 1 || !candidate.images || typeof candidate.images !== "object" || Array.isArray(candidate.images)) {
    return emptyCuratedProductImageManifest();
  }
  const images = Object.fromEntries(Object.entries(candidate.images).filter((entry): entry is [string, CuratedProductImage] => {
    const [variantId, image] = entry;
    return Boolean(variantId && image && typeof image === "object"
      && image.variantId === variantId
      && typeof image.image === "string" && image.image.startsWith("/product-images/")
      && typeof image.sourceSha256 === "string" && /^[a-f0-9]{64}$/.test(image.sourceSha256));
  }));
  return { version: 1, updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : null, images };
}

export function curatedImageForVariant(manifest: CuratedProductImageManifest, variantId: string) {
  return manifest.images[variantId]?.image || null;
}
