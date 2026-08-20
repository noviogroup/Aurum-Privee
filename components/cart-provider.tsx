"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, X } from "@phosphor-icons/react";
import { CartItem, Product } from "@/lib/types";
import { formatMoney } from "@/lib/config";
import { calculateAddedTax } from "@/lib/tax";
import { checkoutIsEnabled } from "@/lib/checkout-availability";

type CartContextValue = {
  items: CartItem[];
  count: number;
  addItem: (product: Product) => void;
  openCart: () => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
// Keep the legacy namespace so existing local carts survive the brand rename.
const storageKey = "lola-lily-cart-v2";
const legacyStorageKey = "lola-lily-cart";

function readSavedCart(value: string | null): CartItem[] {
  if (!value) return [];
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is CartItem => {
    if (!item || typeof item !== "object") return false;
    const cartItem = item as Partial<CartItem>;
    return Boolean(
      cartItem.product
      && typeof cartItem.product.id === "string"
      && Number.isInteger(cartItem.quantity)
      && Number(cartItem.quantity) > 0,
    );
  }).slice(0, 20);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const checkoutEnabled = checkoutIsEnabled(process.env.NEXT_PUBLIC_CHECKOUT_ENABLED);
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function hydrateCart() {
      let savedItems: CartItem[] = [];
      try {
        savedItems = readSavedCart(window.localStorage.getItem(storageKey));
        window.localStorage.removeItem(legacyStorageKey);
      } catch {
        window.localStorage.removeItem(storageKey);
      }

      if (!savedItems.length) {
        if (!cancelled) setHydrated(true);
        return;
      }

      try {
        const ids = savedItems.map((item) => item.product.id).join(",");
        const response = await fetch(`/api/catalog?ids=${encodeURIComponent(ids)}`);
        if (!response.ok) throw new Error("Catalog refresh failed");
        const data = await response.json() as { products?: Product[] };
        const currentProducts = new Map((data.products || []).map((product) => [product.id, product]));
        const refreshed = savedItems.flatMap((item) => {
          const product = currentProducts.get(item.product.id);
          if (!product || product.stock < 1) return [];
          return [{ product, quantity: Math.min(item.quantity, product.stock) }];
        });
        if (!cancelled) setItems(refreshed);
      } catch {
        if (!cancelled) setItems(savedItems);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }
    hydrateCart();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [hydrated, items]);

  const addItem = useCallback((product: Product) => {
    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item,
        );
      }
      return [...current, { product, quantity: 1 }];
    });
    setOpen(true);
  }, []);

  const changeQuantity = (productId: string, delta: number) => {
    setItems((current) =>
      current
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, Math.min(item.quantity + delta, item.product.stock)) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const checkout = async () => {
    if (!checkoutEnabled) {
      setError("Online checkout is not open yet. Your selection will stay saved in this browser.");
      return;
    }
    setCheckingOut(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Checkout could not be started.");
      window.location.assign(data.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be started.");
      setCheckingOut(false);
    }
  };

  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const taxTotal = items.reduce((sum, item) => sum + calculateAddedTax(item.product.price * item.quantity, item.product.loyverseTaxes), 0);
  const total = subtotal + taxTotal;
  const clearCart = useCallback(() => {
    setItems([]);
    setOpen(false);
    window.localStorage.removeItem(storageKey);
  }, []);
  const value = useMemo(() => ({ items, count, addItem, openCart: () => setOpen(true), clearCart }), [items, count, addItem, clearCart]);

  return (
    <CartContext.Provider value={value}>
      {children}
      <button className="cart-fab" aria-label={`Open bag with ${count} items`} onClick={() => setOpen(true)}>
        <ShoppingBag size={20} weight="light" />
        {count > 0 && <span>{count}</span>}
      </button>
      {open && <button className="drawer-scrim" aria-label="Close bag" onClick={() => setOpen(false)} />}
      <aside className={`cart-drawer ${open ? "is-open" : ""}`} aria-hidden={!open} aria-label="Shopping bag">
        <div className="drawer-head">
          <div>
            <p className="utility-label">Your selection</p>
            <h2>Shopping bag</h2>
          </div>
          <button className="icon-button" aria-label="Close bag" onClick={() => setOpen(false)}><X size={21} /></button>
        </div>
        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <ShoppingBag size={34} weight="thin" />
              <h3>Your bag is waiting.</h3>
              <p>Add a fragrance and it will appear here.</p>
              <button className="text-button" onClick={() => setOpen(false)}>Continue browsing</button>
            </div>
          ) : (
            items.map(({ product, quantity }) => (
              <article className="cart-line" key={product.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.image} alt="" />
                <div>
                  <p className="product-brand">{product.brand}</p>
                  <h3>{product.name}</h3>
                  <p>{product.size}</p>
                  <div className="quantity-control" aria-label={`Quantity for ${product.name}`}>
                    <button aria-label="Decrease quantity" onClick={() => changeQuantity(product.id, -1)}><Minus size={14} /></button>
                    <span>{quantity}</span>
                    <button aria-label="Increase quantity" onClick={() => changeQuantity(product.id, 1)}><Plus size={14} /></button>
                  </div>
                </div>
                <strong>{formatMoney(product.price * quantity)}</strong>
              </article>
            ))
          )}
        </div>
        {items.length > 0 && (
          <div className="drawer-foot">
            <div className="cart-total"><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
            {taxTotal > 0 && <div className="cart-total"><span>VAT</span><strong>{formatMoney(taxTotal)}</strong></div>}
            {taxTotal > 0 && <div className="cart-total"><span>Total before delivery</span><strong>{formatMoney(total)}</strong></div>}
            <p>{checkoutEnabled ? "Delivery and pickup choices are confirmed securely at checkout." : "Online checkout will open after payment and delivery acceptance testing."}</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary button-full" onClick={checkout} disabled={checkingOut || !checkoutEnabled}>
              {checkingOut ? "Opening secure checkout" : checkoutEnabled ? "Checkout" : "Checkout opening soon"}
            </button>
          </div>
        )}
      </aside>
    </CartContext.Provider>
  );
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
