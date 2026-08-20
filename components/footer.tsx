import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-mark"><BrandMark full /></div>
      <div className="footer-grid">
        <div>
          <h3>Visit</h3>
          <p>Nassau, The Bahamas</p>
          <p>Pickup details are confirmed with your order.</p>
        </div>
        <div>
          <h3>Discover</h3>
          <Link href="/pages/about">Our story</Link>
          <Link href="/pages/aurum-room">The Aurum Room</Link>
          <Link href="/#collections">Collections</Link>
        </div>
        <div>
          <h3>Client care</h3>
          <Link href="/pages/shipping-returns">Shipping & returns</Link>
          <Link href="/pages/contact">Contact</Link>
          <Link href="/pages/authenticity">Authenticity</Link>
          <Link href="/pages/privacy">Privacy</Link>
          <Link href="/pages/terms">Terms</Link>
        </div>
        <div>
          <h3>Your edit</h3>
          <Link href="/saved">Saved fragrances</Link>
          <Link href="/shop">Shop all</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Aurum Privée</span>
        <span>Exceptional fragrance. Without boundaries.</span>
      </div>
    </footer>
  );
}
