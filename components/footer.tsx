import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Newsletter } from "@/components/newsletter";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-mark"><BrandMark /></div>
          <p>Exceptional fragrance.<br />Without boundaries.</p>
          <p>Nassau, The Bahamas</p>
        </div>
        <div>
          <h3>Shop</h3>
          <Link href="/shop">All fragrances</Link>
          <Link href="/shop?query=women">For her</Link>
          <Link href="/shop?query=men">For him</Link>
          <Link href="/shop?query=unisex">Unisex</Link>
          <Link href="/shop?query=gift%20set">Gift sets</Link>
        </div>
        <div>
          <h3>Client care</h3>
          <Link href="/pages/shipping-returns">Shipping & returns</Link>
          <Link href="/pages/contact">Contact</Link>
          <Link href="/pages/authenticity">Authenticity</Link>
          <Link href="/pages/privacy">Privacy</Link>
          <Link href="/pages/terms">Terms</Link>
          <Link href="/account">My account</Link>
        </div>
        <div>
          <h3>About</h3>
          <Link href="/pages/about">Our story</Link>
          <Link href="/pages/aurum-room">The Aurum Room</Link>
          <Link href="/#collections">Collections</Link>
          <Link href="/saved">Saved fragrances</Link>
        </div>
        <div className="footer-newsletter">
          <h3>Private list</h3>
          <p>New arrivals, gifting ideas and the occasional invitation.</p>
          <Newsletter />
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Aurum Privée</span>
        <span>Designed in The Bahamas</span>
      </div>
    </footer>
  );
}
