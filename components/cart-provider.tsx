"use client";

import { createContext, KeyboardEvent as ReactKeyboardEvent, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, ShoppingBag, X } from "@phosphor-icons/react";
import { CartItem, Product } from "@/lib/types";
import { formatMoney } from "@/lib/config";
import { calculateAddedTax } from "@/lib/tax";
import type { CommerceProvider } from "@/lib/wix-config";
import { parseClientCatalogResponse } from "@/lib/client-catalog-response";
import { requestJson } from "@/lib/client-json-request";
import { productVariantLabel } from "@/lib/product-variants";

type CartContextValue = {
  items: CartItem[];
  count: number;
  hydrated: boolean;
  addItem: (product: Product, returnFocus?: HTMLElement) => void;
  openCart: (returnFocus?: HTMLElement) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "aurum-privee-cart-v1";

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

export function CartProvider({ children, commerceProvider, showCart = true }: { children: React.ReactNode; commerceProvider: CommerceProvider; showCart?: boolean }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const rememberReturnFocus = useCallback((returnFocus?: HTMLElement) => {
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = returnFocus || activeElement;
    previousFocusRef.current = target && target !== document.body ? target : null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function hydrateCart() {
      let savedItems: CartItem[] = [];
      try {
        savedItems = readSavedCart(window.localStorage.getItem(storageKey));
      } catch {
        window.localStorage.removeItem(storageKey);
      }

      if (!savedItems.length) {
        if (!cancelled) setHydrated(true);
        return;
      }

      if (!cancelled) {
        setItems(savedItems);
        setHydrated(true);
      }

      try {
        const ids = savedItems.map((item) => item.product.id).join(",");
        const { response, data } = await requestJson<unknown>(`/api/catalog?ids=${encodeURIComponent(ids)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Catalog refresh failed");
        const result = parseClientCatalogResponse(data);
        const currentProducts = new Map(result.products.map((product) => [product.id, product]));
        const refreshed = savedItems.flatMap((item) => {
          const product = currentProducts.get(item.product.id);
          if (!product || product.stock < 1) return [];
          return [{ product, quantity: Math.min(item.quantity, product.stock) }];
        });
        if (!cancelled) setItems(refreshed);
      } catch {
        // Keep the locally saved selection. Checkout validates live price and stock server-side.
      }
    }
    hydrateCart();
    return () => { cancelled = true; controller.abort(); };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [hydrated, items]);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus({ preventScroll: true });
      return;
    }
    const returnFocus = previousFocusRef.current;
    previousFocusRef.current = null;
    if (!returnFocus) return;
    const frame = window.requestAnimationFrame(() => {
      if (returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const addItem = useCallback((product: Product, returnFocus?: HTMLElement) => {
    rememberReturnFocus(returnFocus);
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
  }, [rememberReturnFocus]);

  const openCart = useCallback((returnFocus?: HTMLElement) => {
    rememberReturnFocus(returnFocus);
    setOpen(true);
  }, [rememberReturnFocus]);

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

  const reviewCheckout = () => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Checkout can still proceed when browser storage is unavailable.
    }
    setOpen(false);
    window.location.assign("/checkout");
  };

  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const taxTotal = items.reduce((sum, item) => sum + calculateAddedTax(item.product.price * item.quantity, item.product.loyverseTaxes), 0);
  const total = subtotal + (commerceProvider === "legacy" ? taxTotal : 0);
  const clearCart = useCallback(() => {
    setItems([]);
    setOpen(false);
    window.localStorage.removeItem(storageKey);
  }, []);
  const value = useMemo(() => ({ items, count, hydrated, addItem, openCart, clearCart }), [items, count, hydrated, addItem, openCart, clearCart]);

  function handleDrawerKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <CartContext.Provider value={value}>
      {children}
      {showCart && <>
        <button className="cart-fab" aria-label={`Open bag with ${count} items`} onClick={(event) => openCart(event.currentTarget)}>
          <ShoppingBag size={20} weight="light" />
          {count > 0 && <span>{count}</span>}
        </button>
        {open && <button className="drawer-scrim" aria-label="Close bag" onClick={() => setOpen(false)} />}
        <aside ref={drawerRef} className={`cart-drawer ${open ? "is-open" : ""}`} aria-hidden={!open} inert={!open} aria-label="Shopping bag" role="dialog" aria-modal={open} onKeyDown={handleDrawerKeyDown}>
        <div className="drawer-head">
          <div>
            <p className="utility-label">Your selection</p>
            <h2>Shopping bag</h2>
          </div>
          <button ref={closeButtonRef} className="icon-button" aria-label="Close bag" onClick={() => setOpen(false)}><X size={21} /></button>
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
                  <p>{productVariantLabel(product)}</p>
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
            {commerceProvider === "legacy" && taxTotal > 0 && <div className="cart-total"><span>VAT</span><strong>{formatMoney(taxTotal)}</strong></div>}
            {commerceProvider === "legacy" && taxTotal > 0 && <div className="cart-total"><span>Total before delivery</span><strong>{formatMoney(total)}</strong></div>}
            {commerceProvider === "wix" && <div className="cart-total"><span>Taxes &amp; fulfillment</span><strong>Calculated next</strong></div>}
            <p>{commerceProvider === "wix" ? "Location, delivery or collection, and payment are confirmed securely at checkout." : "Delivery or pickup, contact details and payment are confirmed at checkout."}</p>
            <button className="button button-primary button-full" onClick={reviewCheckout}>
              Checkout
            </button>
          </div>
        )}
        </aside>
      </>}
    </CartContext.Provider>
  );
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
