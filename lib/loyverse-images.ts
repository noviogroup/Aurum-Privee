import manifest from "@/data/loyverse-image-manifest.json";

type MirroredImage = {
  sourceUrl: string;
  localPath: string;
  sha256: string;
  width: number;
  height: number;
};

const images = manifest.images as Record<string, MirroredImage>;
const rejected = ((manifest as unknown as { rejected?: Record<string, { sourceUrl: string }> }).rejected || {});

export function getMirroredLoyverseImage(itemId: string, sourceUrl?: string | null) {
  const image = images[itemId];
  if (!image || !sourceUrl || image.sourceUrl !== sourceUrl) return null;
  return image.localPath;
}

export function isRejectedLoyverseImage(itemId: string, sourceUrl?: string | null) {
  return Boolean(sourceUrl && rejected[itemId]?.sourceUrl === sourceUrl);
}
