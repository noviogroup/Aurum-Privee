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

const usesHttpsOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || "").protocol === "https:";
  } catch {
    return false;
  }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https://api.loyverse.com https://static.wixstatic.com data:",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src https://checkout.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(usesHttpsOrigin ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/pages/about", destination: "/about", permanent: true },
      { source: "/pages/contact", destination: "/contact", permanent: true },
    ];
  },
  images: {
    // Netlify's runtime image proxy rejects the catalog's valid source assets
    // with HTTP 400. The catalog files are already normalized and compressed
    // during import, so serve them directly instead of routing them through
    // `/_next/image`.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "api.loyverse.com", pathname: "/image/**" },
      { protocol: "https", hostname: "static.wixstatic.com", pathname: "/media/**" },
      ...(supabaseImagePattern ? [supabaseImagePattern] : []),
    ],
  },
  poweredByHeader: false,
};

export default nextConfig;
