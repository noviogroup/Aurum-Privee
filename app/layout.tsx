import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/config";
import { SiteShell } from "@/components/site-shell";
import { getCommerceProvider } from "@/lib/wix-config";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
  display: "swap",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: "Aurum Privée | Exceptional fragrance", template: "%s | Aurum Privée" },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  formatDetection: { telephone: false },
  openGraph: {
    title: "Aurum Privée",
    description: siteConfig.description,
    images: [{ url: "/images/hero-merchandising-background-v2.webp", width: 1672, height: 941 }],
    siteName: siteConfig.name,
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${display.variable} ${body.variable}`}>
        <a className="skip-link" href="#main">Skip to content</a>
        <SiteShell commerceProvider={getCommerceProvider(process.env.COMMERCE_PROVIDER)}>{children}</SiteShell>
      </body>
    </html>
  );
}
