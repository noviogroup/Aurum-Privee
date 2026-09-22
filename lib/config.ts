import { BRAND_NAME } from "@/lib/brand";

export const siteConfig = {
  name: BRAND_NAME,
  description: "Exceptional fragrance, without boundaries. A considered edit of designer, niche and luxury fragrance.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  currency: process.env.NEXT_PUBLIC_STORE_CURRENCY || "BSD",
  locale: process.env.NEXT_PUBLIC_STORE_LOCALE || "en-BS",
  pickupLabel: process.env.NEXT_PUBLIC_PICKUP_LABEL || "Collection",
};

export function formatMoney(amount: number) {
  return new Intl.NumberFormat(siteConfig.locale, {
    style: "currency",
    currency: siteConfig.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
