import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChatCircleDots, Gift, SealCheck, Truck } from "@phosphor-icons/react/dist/ssr";
import { ProductBrowser } from "@/components/product-browser";
import { Newsletter } from "@/components/newsletter";
import { getCatalogProducts } from "@/lib/catalog";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const homepageProductIds = [
  "460426e4-f854-40f4-9217-7fac41fe75bf", // Dior Sauvage
  "7fcf5448-ebd6-42d2-9ddf-b67204d63feb", // Tom Ford Black Orchid
  "66c09dc0-cc21-4cbd-a9f9-c475a1137486", // Creed Aventus for Her
  "af8923c3-473a-42a8-9e61-18da1341b878", // Xerjoff Erba Pura
  "1f76c75f-77aa-47ef-b35a-4150e279f60e", // Versace Crystal Noir set
  "4d08132e-e1b4-42ac-b4e2-44b2f7214f85", // Afnan Supremacy Noir
];

const homepageProductImages: Record<string, string> = {
  "460426e4-f854-40f4-9217-7fac41fe75bf": "/images/hero-products/dior-sauvage.png",
  "7fcf5448-ebd6-42d2-9ddf-b67204d63feb": "/images/hero-products/tom-ford-black-orchid.png",
  "66c09dc0-cc21-4cbd-a9f9-c475a1137486": "/images/hero-products/creed-aventus-for-her.png",
  "af8923c3-473a-42a8-9e61-18da1341b878": "/images/hero-products/xerjoff-erba-pura.png",
  "1f76c75f-77aa-47ef-b35a-4150e279f60e": "/images/hero-products/versace-crystal-noir-set.png",
  "4d08132e-e1b4-42ac-b4e2-44b2f7214f85": "/images/hero-products/afnan-supremacy-noir.png",
};

const carriedBrands = [
  ["DIOR", "Christian Dior", "dior"],
  ["TOM FORD", "Tom Ford", "tom-ford"],
  ["GUCCI", "Gucci", "gucci"],
  ["CREED", "Creed", "creed"],
  ["XERJOFF", "Xerjoff", "xerjoff"],
  ["VERSACE", "Versace", "versace"],
  ["GIORGIO ARMANI", "Giorgio Armani", "armani"],
  ["AFNAN", "Afnan", "afnan"],
  ["LATTAFA", "Lattafa", "lattafa"],
  ["MONTBLANC", "Mont Blanc", "montblanc"],
  ["BVLGARI", "Bvlgari", "bvlgari"],
  ["CAROLINA HERRERA", "Carolina Herrera", "carolina-herrera"],
] as const;

export default async function HomePage() {
  const products = await getCatalogProducts();
  const curatedHomepageProducts = homepageProductIds
    .map((id) => products.find((product) => product.id === id || product.loyverseVariantId === id))
    .filter((product) => product !== undefined)
    .map((product) => ({ ...product, image: homepageProductImages[product.id] ?? product.image }));
  const featured = [
    ...curatedHomepageProducts,
    ...products.filter((product) => product.featured && !homepageProductIds.includes(product.id)),
  ].slice(0, 6);
  return (
    <div className="home-page">
      <section className="hero">
        <Image
          src="/images/hero-merchandising-background-v2.webp"
          alt="Sunlit travertine fragrance display with blush lilies"
          fill
          priority
          sizes="100vw"
          className="hero-image"
        />
        <div className="hero-scrim" />
        <div className="hero-merchandise" aria-label="Featured fragrances available from Aurum Privée">
          <Link className="hero-product hero-product-dior" href="/shop/christian-dior-dior-sauvage-3-4-edp-sp-460426" aria-label="Shop Dior Sauvage Eau de Parfum">
            <Image src="/images/hero-products/dior-sauvage.png" alt="Dior Sauvage Eau de Parfum bottle and box" fill sizes="28vw" />
          </Link>
          <Link className="hero-product hero-product-tom-ford" href="/shop/tom-ford-black-orchid-1-7-edp-sp-7fcf54" aria-label="Shop Tom Ford Black Orchid">
            <Image src="/images/hero-products/tom-ford-black-orchid.png" alt="Tom Ford Black Orchid bottle and box" fill sizes="27vw" />
          </Link>
          <Link className="hero-product hero-product-afnan" href="/shop/afnan-supremacy-noir-edp-3-4-oz-4d0813" aria-label="Shop Afnan Supremacy Noir">
            <Image src="/images/hero-products/afnan-supremacy-noir.png" alt="Afnan Supremacy Noir bottle and box" fill sizes="25vw" />
          </Link>
        </div>
        <div className="hero-content entrance">
          <p className="utility-label">Exceptional fragrance.</p>
          <h1>Without<br />boundaries.</h1>
          <p>A curated selection of the world&apos;s finest fragrances. Designer, niche and luxury from every corner of the globe.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/shop">Shop now</Link>
          </div>
        </div>
      </section>

      <section className="home-assurance-bar" aria-label="Aurum Privée services">
        <article><Truck size={25} weight="light" /><div><strong>Complimentary delivery</strong><span>Nassau &amp; Harbour Island</span></div></article>
        <article><Gift size={25} weight="light" /><div><strong>Luxury packaging</strong><span>Every order beautifully wrapped</span></div></article>
        <article><SealCheck size={25} weight="light" /><div><strong>Authentic &amp; curated</strong><span>100% authentic guarantee</span></div></article>
        <article><ChatCircleDots size={25} weight="light" /><div><strong>Personal service</strong><span>We&apos;re here to help</span></div></article>
      </section>

      <section className="home-collections section-shell" id="collections">
        <div className="home-section-title home-section-title-centered collection-heading"><h2>Shop by collection</h2><Link href="/shop">View all fragrance <ArrowRight size={16} /></Link></div>
        <div className="collection-cabinet">
          <Link className="collection-tile collection-tile-real collection-for-her" href="/shop?query=woman"><Image src="/product-images/loyverse/7ee5e1c6-424a-4768-b2a3-cdd513a01351.webp" alt="Abercrombie & Fitch Naturally Fierce for women" fill sizes="(max-width: 760px) 50vw, 20vw" /><span><strong>For her</strong><b>Shop now</b></span></Link>
          <Link className="collection-tile collection-tile-real collection-for-him" href="/shop?query=men"><Image src="/product-images/loyverse/645c039f-0050-4d2e-9539-e47b79090f01.webp" alt="Dunhill Desire Red for men" fill sizes="(max-width: 760px) 50vw, 20vw" /><span><strong>For him</strong><b>Shop now</b></span></Link>
          <Link className="collection-tile collection-tile-real collection-unisex" href="/shop?query=unisex"><Image src="/product-images/loyverse/a67eb208-0372-4c16-ab86-232822c70dcf.webp" alt="Xerjoff Erba Pura unisex fragrance" fill sizes="(max-width: 760px) 50vw, 20vw" /><span><strong>Unisex</strong><b>Shop now</b></span></Link>
          <Link className="collection-tile collection-tile-real collection-arabian" href="/shop?query=oud"><Image src="/product-images/loyverse/b6e45592-7537-4020-9826-fdb294860e5e.webp" alt="Afnan Supremacy Noir Arabian fragrance" fill sizes="(max-width: 760px) 50vw, 20vw" /><span><strong>Arabian collection</strong><b>Shop now</b></span></Link>
          <Link className="collection-tile collection-tile-real collection-discovery" href="/shop?query=gift%20set"><Image src="/product-images/loyverse/1f0799ca-7ad0-4369-8f46-3e482f4a7dad.webp" alt="Al Haramain Amber Oud discovery gift set" fill sizes="(max-width: 760px) 100vw, 20vw" /><span><strong>Discovery sets</strong><b>Shop now</b></span></Link>
        </div>
      </section>

      <section className="bestsellers home-storefront section-shell">
        <div className="home-section-title home-section-title-centered"><p className="utility-label">Chosen often</p><h2>Featured fragrances</h2><Link href="/shop">View all <ArrowRight size={16} /></Link></div>
        <ProductBrowser products={featured} compact />
      </section>

      <section className="brand-rail" aria-label="Brands carried by Aurum Privée">
        {carriedBrands.map(([label, query, style]) => <Link href={`/shop?query=${encodeURIComponent(query)}`} className={`brand-wordmark brand-${style}`} key={query}>{label}</Link>)}
      </section>

      <section className="scent-finder section-shell" id="scent-finder">
        <div className="scent-title">
          <h2>Start with how you want to feel.</h2>
          <p>Scent families make fragrance easier to browse. Choose the mood that feels most like you today.</p>
        </div>
        <div className="scent-choices">
          {[
            ["Floral", "Petal-soft, luminous, expressive", "Iris / rose / jasmine"],
            ["Fresh", "Clear, green, bright", "Citrus / tea / mineral notes"],
            ["Woody", "Quiet, warm, close to skin", "Cedar / vetiver / sandalwood"],
            ["Amber", "Deep, magnetic, after dark", "Resins / spice / incense"],
          ].map(([name, mood, notes]) => (
            <Link href={`/shop?family=${name}`} className="scent-choice" key={name}>
              <span>{name}</span><strong>{mood}</strong><small>{notes}</small><ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </section>

      <section className="home-editorial section-shell">
        <article className="home-editorial-primary"><Image src="/product-images/9b87ea12-e27b-4385-ab2f-5bf662577ddd.webp" alt="Midnight fragrance portrait with plum and amber notes" fill sizes="(max-width: 760px) 100vw, 52vw" /><div><p className="utility-label">Your private edit</p><h2>A fragrance wardrobe, not one signature.</h2><p>Find bottles for quiet mornings, polished workdays and memorable nights.</p><Link href="/shop">Explore every mood <ArrowRight size={16} /></Link></div></article>
        <article className="home-editorial-note"><p className="utility-label">Gifting</p><h3>Give them something unforgettable.</h3><p>Choose a fragrance or gift set, then ask us about presentation for the occasion.</p><Link href="/shop?query=gift%20set">Shop gifts <ArrowRight size={15} /></Link></article>
        <article className="home-editorial-note"><p className="utility-label">Need help?</p><h3>Let us narrow the shelf.</h3><p>Tell us what they wear, how they want to feel, or the notes they already love.</p><Link href="/pages/contact">Ask Aurum Privée <ArrowRight size={15} /></Link></article>
      </section>

      <section className="newsletter section-shell">
        <div>
          <h2>A note from Aurum Privée.</h2>
          <p>New arrivals, thoughtful gift ideas and the occasional invitation.</p>
        </div>
        <Newsletter />
      </section>
    </div>
  );
}
