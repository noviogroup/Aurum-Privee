"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, List, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWishlist } from "@/components/wishlist-provider";
import { StoreSearch } from "@/components/store-search";
import { BrandMark } from "@/components/brand-mark";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchReturnFocusRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const { count: savedCount, hydrated } = useWishlist();

  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const openSearch = useCallback((returnFocus: HTMLElement) => {
    searchReturnFocusRef.current = returnFocus;
    setMenuOpen(false);
    setSearchOpen(true);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (<>
    <header className={`site-header ${menuOpen ? "menu-is-open" : ""}`}>
      <div className="header-inner">
        <button className="menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <List size={22} />}
        </button>
        <Link href="/" className="wordmark" aria-label="Aurum Privée home"><BrandMark /></Link>
        <nav className="primary-nav" aria-label="Primary navigation">
          <Link href="/">Home</Link>
          <button type="button" aria-expanded={menuOpen} aria-controls="fragrance-menu" onClick={() => setMenuOpen((value) => !value)}>Catalogue</button>
          <Link href="/pages/trade-program">Trade programme</Link>
          <Link href="/pages/aurum-room">The Aurum Room</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <div className="header-actions">
          <button type="button" aria-label="Search fragrances" onClick={(event) => openSearch(event.currentTarget)}><MagnifyingGlass size={20} weight="light" /></button>
          <Link href="/quote-list" className="saved-header-link" aria-label={`Quote list${hydrated ? `, ${savedCount} ${savedCount === 1 ? "item" : "items"}` : ""}`}>
            <FileText size={20} weight={savedCount > 0 ? "fill" : "light"} />
            {hydrated && savedCount > 0 && <span>{savedCount}</span>}
          </Link>
        </div>
      </div>
      <div id="fragrance-menu" className={`fragrance-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <div className="fragrance-menu-inner">
          <div className="fragrance-menu-intro"><p className="utility-label">The trade catalogue</p><h2>Build with intention.</h2><p>Begin with audience, scent character or a house already relevant to your customers.</p></div>
          <div className="fragrance-menu-group"><p>Catalogue</p><Link href="/shop" onClick={() => setMenuOpen(false)}>All fragrance</Link><Link href="/shop?family=New" onClick={() => setMenuOpen(false)}>New arrivals</Link><Link href="/shop?query=gift%20set" onClick={() => setMenuOpen(false)}>Gift sets</Link><Link href="/quote-list" onClick={() => setMenuOpen(false)}>Quote list</Link></div>
          <div className="fragrance-menu-group"><p>Audience</p><Link href="/shop?audience=Women" onClick={() => setMenuOpen(false)}>Women</Link><Link href="/shop?audience=Men" onClick={() => setMenuOpen(false)}>Men</Link><Link href="/shop?audience=Unisex" onClick={() => setMenuOpen(false)}>Unisex</Link></div>
          <div className="fragrance-menu-group"><p>Scent character</p>{['Floral', 'Fresh', 'Woody', 'Amber', 'Gourmand'].map((family) => <Link key={family} href={`/shop?family=${family}`} onClick={() => setMenuOpen(false)}>{family}</Link>)}</div>
          <div className="fragrance-menu-help"><p>Know the name?</p><button type="button" onClick={(event) => openSearch(event.currentTarget)}><MagnifyingGlass size={18} /> Search the catalogue</button><Link href="/#scent-finder" onClick={() => setMenuOpen(false)}>Build by scent family</Link><Link href="/pages/trade-program" onClick={() => setMenuOpen(false)}>How trade quoting works</Link><Link href="/pages/aurum-room" onClick={() => setMenuOpen(false)}>Plan a buyer consultation</Link></div>
        </div>
      </div>
    </header>
    {menuOpen && <button type="button" className="menu-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    <StoreSearch open={searchOpen} onClose={closeSearch} returnFocusRef={searchReturnFocusRef} />
  </>);
}
