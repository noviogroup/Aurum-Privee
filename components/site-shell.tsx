"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/components/cart-provider";
import { WishlistProvider } from "@/components/wishlist-provider";
import { Sparkle } from "@phosphor-icons/react";
import type { CommerceProvider } from "@/lib/wix-config";

export function SiteShell({ children, commerceProvider }: { children: React.ReactNode; commerceProvider: CommerceProvider }) {
  const pathname = usePathname();
  const isOperations = pathname.startsWith("/operations");

  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
    return () => { delete document.documentElement.dataset.hydrated; };
  }, []);

  if (isOperations) return <main id="main" className="operations-main">{children}</main>;

  return (
    <CartProvider commerceProvider={commerceProvider} showCart={false}>
      <WishlistProvider>
        <div className="announcement"><span><Sparkle size={14} weight="light" />Private fragrance discovery</span><b>A considered edit</b></div>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </WishlistProvider>
    </CartProvider>
  );
}
