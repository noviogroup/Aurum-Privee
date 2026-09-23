import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Newsletter } from "@/components/newsletter";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-mark"><BrandMark /></div>
          <p>A considered catalogue<br />for modern fragrance retail.</p>
        </div>
        <div>
          <h2>Catalogue</h2>
          <Link href="/shop">All fragrances</Link>
          <Link href="/shop?audience=Women">Women&apos;s fragrance</Link>
          <Link href="/shop?audience=Men">Men&apos;s fragrance</Link>
          <Link href="/shop?audience=Unisex">Unisex fragrance</Link>
          <Link href="/shop?query=gift%20set">Gift sets</Link>
        </div>
        <div>
          <h2>Client care</h2>
          <Link href="/pages/shipping-returns">Trade fulfilment</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/pages/authenticity">Authenticity</Link>
          <Link href="/pages/privacy">Privacy</Link>
          <Link href="/pages/terms">Terms</Link>
        </div>
        <div>
          <h2>About</h2>
          <Link href="/about">Our story</Link>
          <Link href="/pages/trade-program">Trade programme</Link>
          <Link href="/pages/aurum-room">The Aurum Room</Link>
          <Link href="/quote-list">Request a quote</Link>
        </div>
        <div className="footer-newsletter">
          <h2>Private list</h2>
          <p>New arrivals, catalogue notes and occasional trade updates.</p>
          <Newsletter />
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Aurum Privée</span>
        <span>Created with intention</span>
      </div>
    </footer>
  );
}
