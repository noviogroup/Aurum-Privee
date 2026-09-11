"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart-provider";

export function OrderSuccessCartClear({ completed }: { completed: boolean }) {
  const { clearCart } = useCart();
  useEffect(() => {
    if (completed) clearCart();
  }, [completed, clearCart]);
  return null;
}
