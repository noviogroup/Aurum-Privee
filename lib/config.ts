import { BRAND_NAME } from "@/lib/brand";

export const siteConfig = {
  name: BRAND_NAME,
  description: "Exceptional fragrance, without boundaries. Designer, niche and luxury fragrance curated in Nassau, The Bahamas.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  currency: process.env.NEXT_PUBLIC_STORE_CURRENCY || "BSD",
  locale: process.env.NEXT_PUBLIC_STORE_LOCALE || "en-BS",
  pickupLabel: process.env.NEXT_PUBLIC_PICKUP_LABEL || "Nassau store pickup",
};

export function formatMoney(amount: number) {
  const hasFractionalCents = Math.abs(Math.round(amount * 100) % 100) > 0;
  return new Intl.NumberFormat(siteConfig.locale, {
    style: "currency",
    currency: siteConfig.currency,
    minimumFractionDigits: hasFractionalCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
