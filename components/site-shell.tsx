"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/components/cart-provider";
import { WishlistProvider } from "@/components/wishlist-provider";
import { Truck } from "@phosphor-icons/react";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOperations = pathname.startsWith("/operations");

  if (isOperations) return <main id="main" className="operations-main">{children}</main>;

  return (
    <CartProvider>
      <WishlistProvider>
        <div className="announcement"><span><Truck size={14} weight="light" />Complimentary delivery in Nassau &amp; Harbour Island</span><b>Bahamas · BSD</b></div>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </WishlistProvider>
    </CartProvider>
  );
}
