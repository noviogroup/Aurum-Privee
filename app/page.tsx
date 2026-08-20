import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChatCircleDots, Gift, SealCheck, Storefront } from "@phosphor-icons/react/dist/ssr";
import { ProductBrowser } from "@/components/product-browser";
import { Newsletter } from "@/components/newsletter";
import { getCatalogProducts } from "@/lib/catalog";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const homepageProductIds = [
  "652905bb-f6ea-4765-b54d-991c32d815a1", // Orientica Oud Saffron
  "e43aa84f-4bb4-4a57-9574-535d7390536c", // Viktor & Rolf Flowerbomb set
  "c72c7a6e-53f3-4eae-96bf-be97c2a464c3", // Versace Yellow Diamond set
  "8596ca5c-369c-4925-a338-c3b25628bf86", // Nautica Voyage
  "ffaf98e9-eb5c-48c2-818d-b4e805a6471e", // Yves Saint Laurent L'Elixir
  "1cba4d6c-21e2-479e-b9bc-7d6559fda022", // Chloe Rose Tangerine
  "9b87ea12-e27b-4385-ab2f-5bf662577ddd", // Into the Night
  "fed10f0e-e87f-4eee-b8a3-a5e928f2078d", // Dolce & Gabbana Velvet Sublime
];

export default async function HomePage() {
  const products = await getCatalogProducts();
  const curatedHomepageProducts = homepageProductIds
    .map((id) => products.find((product) => product.id === id || product.loyverseVariantId === id))
    .filter((product) => product !== undefined);
  const featured = [
    ...curatedHomepageProducts,
    ...products.filter((product) => product.featured && !curatedHomepageProducts.includes(product)),
  ].slice(0, 8);
  return (
    <div className="home-page">
      <section className="hero">
        <Image
          src="/product-images/e43aa84f-4bb4-4a57-9574-535d7390536c.webp"
          alt="Rose-toned fragrance bottles surrounded by flowers and citrus"
          fill
          priority
          sizes="100vw"
          className="hero-image"
        />
        <div className="hero-scrim" />
        <div className="hero-content entrance">
          <p className="utility-label">Exceptional fragrance. Without boundaries.</p>
          <h1>A world of scent,<br />privately curated.</h1>
          <p>Designer, niche and expressive fragrance selected for the mood, the memory and the person wearing it.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/shop">Shop fragrance</Link>
            <Link className="button button-ghost" href="#scent-finder">Find your scent</Link>
          </div>
        </div>
      </section>

      <section className="home-assurance-bar" aria-label="Aurum Privée services">
        <article><Storefront size={25} weight="light" /><div><strong>Complimentary pickup</strong><span>Prepared for collection in Nassau</span></div></article>
        <article><Gift size={25} weight="light" /><div><strong>Gift-ready presentation</strong><span>Beautifully prepared on request</span></div></article>
        <article><SealCheck size={25} weight="light" /><div><strong>Authentic &amp; curated</strong><span>Every bottle checked with care</span></div></article>
        <article><ChatCircleDots size={25} weight="light" /><div><strong>Personal guidance</strong><span>Help choosing the right scent</span></div></article>
      </section>

      <section className="home-collections section-shell" id="collections">
        <div className="home-section-title"><p className="utility-label">The fragrance cabinet</p><h2>Shop by instinct.</h2><Link href="/shop">View all fragrance <ArrowRight size={16} /></Link></div>
        <div className="collection-cabinet">
          <Link className="collection-tile collection-tile-wide" href="/shop"><Image src="/product-images/fed10f0e-e87f-4eee-b8a3-a5e928f2078d.webp" alt="Golden fragrance portrait with citrus and white blossoms" fill sizes="(max-width: 760px) 100vw, 36vw" /><span><small>The complete edit</small><strong>All fragrance</strong><b>Explore</b></span></Link>
          <Link className="collection-tile" href="/shop?family=Floral"><Image src="/product-images/1cba4d6c-21e2-479e-b9bc-7d6559fda022.webp" alt="Pink floral fragrance portrait with roses and tangerine" fill sizes="(max-width: 760px) 100vw, 20vw" /><span><small>Petal-soft and luminous</small><strong>Floral</strong><b>Explore</b></span></Link>
          <Link className="collection-tile" href="/shop?query=oud"><Image src="/product-images/652905bb-f6ea-4765-b54d-991c32d815a1.webp" alt="Rich oud and saffron fragrance portrait" fill sizes="(max-width: 760px) 100vw, 20vw" /><span><small>Deep and magnetic</small><strong>The oud edit</strong><b>Explore</b></span></Link>
          <Link className="collection-tile" href="/shop?query=gift%20set"><Image src="/product-images/c72c7a6e-53f3-4eae-96bf-be97c2a464c3.webp" alt="Luminous yellow fragrance gift collection" fill sizes="(max-width: 760px) 100vw, 20vw" /><span><small>Ready for the occasion</small><strong>Gift sets</strong><b>Explore</b></span></Link>
          <Link className="collection-tile collection-tile-portrait" href="#scent-finder"><Image src="/product-images/ffaf98e9-eb5c-48c2-818d-b4e805a6471e.webp" alt="Dark amber fragrance portrait with lavender and woods" fill sizes="(max-width: 760px) 100vw, 20vw" /><span><small>Begin with a feeling</small><strong>Find your scent</strong><b>Explore</b></span></Link>
        </div>
      </section>

      <section className="bestsellers home-storefront section-shell">
        <div className="home-section-title home-section-title-centered"><p className="utility-label">Chosen often</p><h2>Featured fragrances</h2><Link href="/shop">View all <ArrowRight size={16} /></Link></div>
        <ProductBrowser products={featured} compact />
      </section>

      <section className="brand-rail" aria-label="Brands in the Aurum Privée collection">
        {['Afnan', 'Christian Dior', 'Giorgio Armani', 'Gucci', 'Lattafa', 'Mont Blanc', 'Tom Ford', 'Versace'].map((brand) => <span key={brand}>{brand}</span>)}
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
