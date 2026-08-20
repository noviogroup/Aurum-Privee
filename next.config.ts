import type { NextConfig } from "next";

const supabaseImagePattern = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    return url.protocol === "https:" && !url.hostname.includes("replace-me")
      ? { protocol: "https" as const, hostname: url.hostname, pathname: "/storage/v1/object/public/product-images/**" }
      : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    // Netlify's runtime image proxy rejects the catalog's valid source assets
    // with HTTP 400. The catalog files are already normalized and compressed
    // during import, so serve them directly instead of routing them through
    // `/_next/image`.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "api.loyverse.com", pathname: "/image/**" },
      ...(supabaseImagePattern ? [supabaseImagePattern] : []),
    ],
  },
  poweredByHeader: false,
};

export default nextConfig;
