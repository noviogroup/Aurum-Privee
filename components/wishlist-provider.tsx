"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { addSavedFragranceId, parseSavedFragranceIds, WISHLIST_STORAGE_KEY } from "@/lib/wishlist";

type WishlistContextValue = {
  savedIds: string[];
  count: number;
  hydrated: boolean;
  isSaved: (productId: string) => boolean;
  toggleSaved: (productId: string) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setSavedIds(parseSavedFragranceIds(window.localStorage.getItem(WISHLIST_STORAGE_KEY)));
    } catch {
      setSavedIds([]);
    }
    setHydrated(true);

    const syncAcrossTabs = (event: StorageEvent) => {
      if (event.key === WISHLIST_STORAGE_KEY) setSavedIds(parseSavedFragranceIds(event.newValue));
    };
    window.addEventListener("storage", syncAcrossTabs);
    return () => window.removeEventListener("storage", syncAcrossTabs);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(savedIds));
    } catch {
      // Saving is an enhancement; the storefront remains usable if storage is blocked.
    }
  }, [hydrated, savedIds]);

  const isSaved = useCallback((productId: string) => savedIds.includes(productId), [savedIds]);
  const toggleSaved = useCallback((productId: string) => {
    setSavedIds((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : addSavedFragranceId(current, productId));
  }, []);

  const value = useMemo(() => ({ savedIds, count: savedIds.length, hydrated, isSaved, toggleSaved }), [savedIds, hydrated, isSaved, toggleSaved]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside WishlistProvider");
  return context;
}
