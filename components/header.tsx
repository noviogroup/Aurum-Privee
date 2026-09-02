"use client";

import Link from "next/link";
import { Heart, List, MagnifyingGlass, ShoppingBag, UserCircle, X } from "@phosphor-icons/react";
import { useCallback, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useWishlist } from "@/components/wishlist-provider";
import { StoreSearch } from "@/components/store-search";
import { BrandMark } from "@/components/brand-mark";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { count, openCart } = useCart();
  const { count: savedCount, hydrated } = useWishlist();

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (<>
    <header className={`site-header ${menuOpen ? "menu-is-open" : ""}`}>
      <div className="header-inner">
        <button className="menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <List size={22} />}
        </button>
        <Link href="/" className="wordmark" aria-label="Aurum Privée home"><BrandMark /></Link>
        <nav className="primary-nav" aria-label="Primary navigation">
          <Link href="/">Home</Link>
          <button type="button" aria-expanded={menuOpen} aria-controls="fragrance-menu" onClick={() => setMenuOpen((value) => !value)}>Shop</button>
          <Link href="/#collections">Collections</Link>
          <Link href="/pages/aurum-room">The Aurum Room</Link>
          <Link href="/pages/about">About</Link>
          <Link href="/pages/contact">Contact</Link>
        </nav>
        <div className="header-actions">
          <button type="button" aria-label="Search fragrances" onClick={() => { setMenuOpen(false); setSearchOpen(true); }}><MagnifyingGlass size={20} weight="light" /></button>
          <Link href="/account" aria-label="My account"><UserCircle size={20} weight="light" /></Link>
          <Link href="/saved" className="saved-header-link" aria-label={`Saved fragrances${hydrated ? `, ${savedCount} ${savedCount === 1 ? "item" : "items"}` : ""}`}>
            <Heart size={20} weight={savedCount > 0 ? "fill" : "light"} />
            {hydrated && savedCount > 0 && <span>{savedCount}</span>}
          </Link>
          <button aria-label={`Open bag with ${count} items`} onClick={openCart}>
            <ShoppingBag size={20} weight="light" />
            {count > 0 && <span>{count}</span>}
          </button>
        </div>
      </div>
      <div id="fragrance-menu" className={`fragrance-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <div className="fragrance-menu-inner">
          <div className="fragrance-menu-intro"><p className="utility-label">The fragrance index</p><h2>Follow your instinct.</h2><p>Begin with who it is for, how it should feel, or a fragrance already in mind.</p></div>
          <div className="fragrance-menu-group"><p>Shop</p><Link href="/shop" onClick={() => setMenuOpen(false)}>All fragrance</Link><Link href="/shop?family=New" onClick={() => setMenuOpen(false)}>New arrivals</Link><Link href="/shop?query=gift%20set" onClick={() => setMenuOpen(false)}>Gift sets</Link><Link href="/saved" onClick={() => setMenuOpen(false)}>Saved fragrances</Link></div>
          <div className="fragrance-menu-group"><p>For whom</p><Link href="/shop?query=women" onClick={() => setMenuOpen(false)}>For her</Link><Link href="/shop?query=men" onClick={() => setMenuOpen(false)}>For him</Link><Link href="/shop?query=unisex" onClick={() => setMenuOpen(false)}>For everyone</Link></div>
          <div className="fragrance-menu-group"><p>Scent character</p>{['Floral', 'Fresh', 'Woody', 'Amber', 'Gourmand'].map((family) => <Link key={family} href={`/shop?family=${family}`} onClick={() => setMenuOpen(false)}>{family}</Link>)}</div>
          <div className="fragrance-menu-help"><p>Know the name?</p><button type="button" onClick={() => { setMenuOpen(false); setSearchOpen(true); }}><MagnifyingGlass size={18} /> Search the collection</button><Link href="/#scent-finder" onClick={() => setMenuOpen(false)}>Not sure? Find your scent</Link><Link href="/pages/aurum-room" onClick={() => setMenuOpen(false)}>Enter The Aurum Room</Link><Link href="/pages/about" onClick={() => setMenuOpen(false)}>About Aurum Privée</Link></div>
        </div>
      </div>
    </header>
    {menuOpen && <button type="button" className="menu-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    <StoreSearch open={searchOpen} onClose={closeSearch} />
  </>);
}
