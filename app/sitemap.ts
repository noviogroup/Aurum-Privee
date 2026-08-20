import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";
import { getCatalogProducts } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getCatalogProducts();
  const staticRoutes = ["", "/shop", "/pages/shipping-returns", "/pages/contact", "/pages/authenticity", "/pages/privacy", "/pages/terms"];
  return [
    ...staticRoutes.map((route) => ({ url: `${siteConfig.url}${route}`, lastModified: new Date(), changeFrequency: route === "" ? "weekly" as const : "monthly" as const })),
    ...products.map((product) => ({ url: `${siteConfig.url}/shop/${product.slug}`, lastModified: new Date(), changeFrequency: "weekly" as const })),
  ];
}
