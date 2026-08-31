import manifest from "@/data/loyverse-image-manifest.json";

type MirroredImage = {
  sourceUrl: string;
  localPath: string;
  normalizedPath?: string;
  sha256: string;
  width: number;
  height: number;
};

const images = manifest.images as Record<string, MirroredImage>;
const rejected = ((manifest as unknown as { rejected?: Record<string, { sourceUrl: string }> }).rejected || {});

export function getMirroredLoyverseImage(itemId: string, sourceUrl?: string | null) {
  const image = images[itemId];
  if (!image || !sourceUrl || image.sourceUrl !== sourceUrl) return null;
  return image.normalizedPath || image.localPath;
}

export function isMirroredLoyverseAsset(value?: string | null) {
  return Boolean(value && (value.startsWith("/product-images/loyverse/") || value.startsWith("/product-images/catalog-v2/")));
}

export function isRejectedLoyverseImage(itemId: string, sourceUrl?: string | null) {
  return Boolean(sourceUrl && rejected[itemId]?.sourceUrl === sourceUrl);
}
