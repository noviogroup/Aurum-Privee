import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/operations", "/order", "/saved"] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
