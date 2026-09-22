"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { addQuoteListItem, migrateSavedFragrances, parseQuoteList, QUOTE_LIST_STORAGE_KEY, type QuoteListItem, updateQuoteListItem } from "@/lib/quote-list";

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
    setItems((current) => current.some((item) => item.productId === productId)
      ? current.filter((item) => item.productId !== productId)
      : addQuoteListItem(current, productId));
  }, []);
  const setQuantity = useCallback((productId: string, quantity: number) => setItems((current) => updateQuoteListItem(current, productId, { quantity })), []);
  const setNote = useCallback((productId: string, note: string) => setItems((current) => updateQuoteListItem(current, productId, { note })), []);
  const removeItem = useCallback((productId: string) => setItems((current) => current.filter((item) => item.productId !== productId)), []);
  const clearItems = useCallback(() => setItems([]), []);
  const totalQuantity = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);

  const value = useMemo(() => ({ items, savedIds, count: items.length, totalQuantity, hydrated, isSaved, toggleSaved, setQuantity, setNote, removeItem, clearItems }), [items, savedIds, totalQuantity, hydrated, isSaved, toggleSaved, setQuantity, setNote, removeItem, clearItems]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside WishlistProvider");
  return context;
}
