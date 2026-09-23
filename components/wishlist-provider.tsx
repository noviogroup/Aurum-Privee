"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { addQuoteListItem, MAX_QUOTE_ITEMS, migrateSavedFragrances, parseQuoteList, QUOTE_LIST_STORAGE_KEY, type QuoteListItem, updateQuoteListItem } from "@/lib/quote-list";

type WishlistContextValue = {
  items: QuoteListItem[];
  savedIds: string[];
  count: number;
  totalQuantity: number;
  hydrated: boolean;
  isSaved: (productId: string) => boolean;
  toggleSaved: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setNote: (productId: string, note: string) => void;
  removeItem: (productId: string) => void;
  clearItems: () => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<QuoteListItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [limitNotice, setLimitNotice] = useState(false);

  useEffect(() => {
    try {
      setItems(migrateSavedFragrances(window.localStorage));
    } catch {
      setItems([]);
    }
    setHydrated(true);

    const syncAcrossTabs = (event: StorageEvent) => {
      if (event.key === QUOTE_LIST_STORAGE_KEY) setItems(parseQuoteList(event.newValue));
    };
    window.addEventListener("storage", syncAcrossTabs);
    return () => window.removeEventListener("storage", syncAcrossTabs);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(QUOTE_LIST_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Saving is an enhancement; the storefront remains usable if storage is blocked.
    }
  }, [hydrated, items]);

  const savedIds = useMemo(() => items.map((item) => item.productId), [items]);
  const isSaved = useCallback((productId: string) => items.some((item) => item.productId === productId), [items]);
  const toggleSaved = useCallback((productId: string) => {
    if (items.length >= MAX_QUOTE_ITEMS && !items.some((item) => item.productId === productId)) {
      setLimitNotice(true);
      return;
    }
    setLimitNotice(false);
    setItems((current) => current.some((item) => item.productId === productId)
      ? current.filter((item) => item.productId !== productId)
      : addQuoteListItem(current, productId));
  }, [items]);
  const setQuantity = useCallback((productId: string, quantity: number) => setItems((current) => updateQuoteListItem(current, productId, { quantity })), []);
  const setNote = useCallback((productId: string, note: string) => setItems((current) => updateQuoteListItem(current, productId, { note })), []);
  const removeItem = useCallback((productId: string) => setItems((current) => current.filter((item) => item.productId !== productId)), []);
  const clearItems = useCallback(() => setItems([]), []);
  const totalQuantity = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);

  const value = useMemo(() => ({ items, savedIds, count: items.length, totalQuantity, hydrated, isSaved, toggleSaved, setQuantity, setNote, removeItem, clearItems }), [items, savedIds, totalQuantity, hydrated, isSaved, toggleSaved, setQuantity, setNote, removeItem, clearItems]);
  return <WishlistContext.Provider value={value}>
    {children}
    {limitNotice && items.length >= MAX_QUOTE_ITEMS && (
      <aside className="quote-limit-notice" aria-label="Quote list limit">
        <p role="status">Your list holds up to {MAX_QUOTE_ITEMS} fragrances. Your selections are safe. Remove one to add another, or send this list before starting another request.</p>
        <div><Link href="/quote-list" onClick={() => setLimitNotice(false)}>Review quote list</Link><button type="button" onClick={() => setLimitNotice(false)}>Dismiss</button></div>
      </aside>
    )}
  </WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside WishlistProvider");
  return context;
}
