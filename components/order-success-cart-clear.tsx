"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart-provider";

export function OrderSuccessCartClear({ paid }: { paid: boolean }) {
  const { clearCart } = useCart();
  useEffect(() => {
    if (paid) clearCart();
  }, [paid, clearCart]);
  return null;
}
