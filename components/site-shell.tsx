"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/components/cart-provider";
import { WishlistProvider } from "@/components/wishlist-provider";
import { Truck } from "@phosphor-icons/react";
import type { CommerceProvider } from "@/lib/wix-config";

export function SiteShell({ children, commerceProvider }: { children: React.ReactNode; commerceProvider: CommerceProvider }) {
  const pathname = usePathname();
  const isOperations = pathname.startsWith("/operations");

  if (isOperations) return <main id="main" className="operations-main">{children}</main>;

  return (
    <CartProvider commerceProvider={commerceProvider}>
      <WishlistProvider>
        <div className="announcement"><span><Truck size={14} weight="light" />Complimentary delivery in Nassau &amp; Harbour Island</span><b>Bahamas · BSD</b></div>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </WishlistProvider>
    </CartProvider>
  );
}
