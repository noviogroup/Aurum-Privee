import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChatCircleDots, Gift, SealCheck, Truck, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import { ProductBrowser } from "@/components/product-browser";
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
  "460426e4-f854-40f4-9217-7fac41fe75bf": "/images/hero-products/dior-sauvage.webp",
  "7fcf5448-ebd6-42d2-9ddf-b67204d63feb": "/images/hero-products/tom-ford-black-orchid.webp",
  "66c09dc0-cc21-4cbd-a9f9-c475a1137486": "/images/hero-products/creed-aventus-for-her.webp",
  "af8923c3-473a-42a8-9e61-18da1341b878": "/images/hero-products/xerjoff-erba-pura.webp",
  "1f76c75f-77aa-47ef-b35a-4150e279f60e": "/images/hero-products/versace-crystal-noir-set.webp",
  "4d08132e-e1b4-42ac-b4e2-44b2f7214f85": "/images/hero-products/afnan-supremacy-noir.webp",
};

const carriedBrands = [
  ["Dior", "Christian Dior", "/images/brand-logos/dior.svg"],
  ["Tom Ford", "Tom Ford", "/images/brand-logos/tom-ford.svg"],
  ["Gucci", "Gucci", "/images/brand-logos/gucci.svg"],
  ["Creed", "Creed", "/images/brand-logos/creed.svg"],
  ["Versace", "Versace", "/images/brand-logos/versace.svg"],
  ["Giorgio Armani", "Giorgio Armani", "/images/brand-logos/giorgio-armani.svg"],
  ["Montblanc", "Mont Blanc", "/images/brand-logos/montblanc.svg"],
  ["Bvlgari", "Bvlgari", "/images/brand-logos/bvlgari.svg"],
  ["Carolina Herrera", "Carolina Herrera", "/images/brand-logos/carolina-herrera.svg"],
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
      <section className="home-campaign-hero">
        <div className="home-campaign-copy entrance">
          <p className="utility-label">Exceptional fragrance.</p>
          <h1>Without<br />{" "}boundaries.</h1>
          <p>A considered wardrobe of designer, niche and Arabian fragrance—selected in Nassau, worn everywhere.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/shop">Shop the collection</Link>
            <Link className="campaign-text-link" href="#scent-finder">Find your scent <ArrowRight size={16} /></Link>
          </div>
        </div>
        <div className="home-campaign-visual">
          <Image src="/images/campaign/hero-popular-fragrances-v2.webp" alt="Dior Sauvage, Carolina Herrera Good Girl Blush, Baccarat Rouge 540 and Tom Ford Black Orchid fragrances" fill priority sizes="(max-width: 767px) 100vw, 64vw" />
          <div className="home-campaign-caption"><strong>Four icons. One considered edit.</strong><span>Dior · Carolina Herrera · MFK · Tom Ford</span></div>
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
          <Link className="collection-tile" href="/shop?query=woman"><Image src="/images/collections/for-her-v2.webp" alt="Blush fragrance surrounded by lilies" fill sizes="(max-width: 760px) 50vw, 20vw" /><span><strong>For her</strong><b>Shop now</b></span></Link>
          <Link className="collection-tile" href="/shop?query=men"><Image src="/images/collections/for-him-v2.webp" alt="Dark navy fragrance in an evening setting" fill sizes="(max-width: 760px) 50vw, 20vw" /><span><strong>For him</strong><b>Shop now</b></span></Link>
          <Link className="collection-tile" href="/shop?query=unisex"><Image src="/images/collections/unisex-v2.webp" alt="Amber unisex fragrances in warm window light" fill sizes="(max-width: 760px) 50vw, 20vw" /><span><strong>Unisex</strong><b>Shop now</b></span></Link>
          <Link className="collection-tile" href="/shop?query=oud"><Image src="/images/collections/arabian-v2.webp" alt="Ornate oud fragrances in black and bronze" fill sizes="(max-width: 760px) 50vw, 20vw" /><span><strong>Arabian collection</strong><b>Shop now</b></span></Link>
          <Link className="collection-tile" href="/shop?query=gift%20set"><Image src="/images/collections/discovery-v2.webp" alt="Fragrance discovery vials on a stone plinth" fill sizes="(max-width: 760px) 100vw, 20vw" /><span><strong>Discovery sets</strong><b>Shop now</b></span></Link>
        </div>
      </section>

      <section className="bestsellers home-storefront section-shell">
        <div className="home-section-title home-section-title-centered"><h2>Featured fragrances</h2><Link href="/shop">View all <ArrowRight size={16} /></Link></div>
        <ProductBrowser products={featured} compact />
      </section>

      <section className="brand-rail" aria-label="Brands carried by Aurum Privée">
        {carriedBrands.map(([label, query, image]) => (
          <Link href={`/shop?query=${encodeURIComponent(query)}`} className="brand-wordmark" aria-label={`Shop ${label}`} key={query}>
            <Image src={image} alt={label} width={170} height={54} unoptimized />
          </Link>
        ))}
      </section>

      <section className="campaign-journal section-shell" aria-labelledby="campaign-journal-title">
        <div className="campaign-journal-heading">
          <h2 id="campaign-journal-title">A fragrance wardrobe,<br />{" "}composed slowly.</h2>
          <p>Follow instinct across luminous florals, polished amber and the darker pull of oud.</p>
        </div>
        <div className="campaign-journal-grid">
          <Link className="campaign-story campaign-story-baccarat" href="/shop/maison-francis-kurkdjian-baccarat-rouge-540-edp-2-4-540-a5076e">
            <Image src="/images/campaign/baccarat-gifting.webp" alt="Baccarat Rouge 540 presented with Aurum Privée gift packaging" fill sizes="(max-width: 767px) 100vw, 42vw" />
            <span><small>Gift-worthy signatures</small><strong>Baccarat Rouge 540</strong><b>Discover the fragrance <ArrowRight size={15} /></b></span>
          </Link>
          <div className="campaign-journal-side">
            <Link className="campaign-story campaign-story-amber-gold" href="/shop/al-haramain-amber-oud-gold-edp-spray-3-4-oz-e36239">
              <Image src="/images/campaign/amber-oud-gold.webp" alt="Al Haramain Amber Oud Gold Edition in warm daylight" fill sizes="(max-width: 767px) 100vw, 58vw" />
              <span><small>Golden and enveloping</small><strong>Amber Oud Gold</strong><b>Shop the fragrance <ArrowRight size={15} /></b></span>
            </Link>
            <div className="campaign-journal-pair">
              <Link className="campaign-story campaign-story-oud" href="/shop?query=oud">
                <Image src="/images/campaign/oud-ritual.webp" alt="Amber oud fragrance beside carved lantern and oud wood" fill sizes="(max-width: 767px) 100vw, 29vw" />
                <span><small>Smoked woods and resin</small><strong>The oud ritual</strong><b>Explore oud <ArrowRight size={15} /></b></span>
              </Link>
              <Link className="campaign-story campaign-story-roja" href="/shop?family=Amber">
                <Image src="/images/campaign/roja-amber.webp" alt="Amber fragrance presented with oud wood and Aurum Privée ribbon" fill sizes="(max-width: 767px) 100vw, 29vw" />
                <span><small>Deep, magnetic, spiced</small><strong>The amber edit</strong><b>Explore amber <ArrowRight size={15} /></b></span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="scent-finder section-shell" id="scent-finder">
        <div className="scent-title">
          <h2>Find your fragrance by feeling.</h2>
          <p>Choose a scent family and step straight into a more personal edit.</p>
        </div>
        <div className="scent-choices">
          {[
            ["Floral", "Petal-soft and luminous"],
            ["Fresh", "Clear, green and bright"],
            ["Woody", "Warm and close to skin"],
            ["Amber", "Deep, magnetic and spiced"],
          ].map(([name, mood]) => (
            <Link href={`/shop?family=${name}`} className="scent-choice" key={name}>
              <span>{name}</span><strong>{mood}</strong><ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </section>

      <section className="home-services section-shell" aria-label="Private fragrance services">
        <Link className="home-service-card" href="/pages/aurum-room">
          <Image src="/images/services/aurum-room-v2.webp" alt="A private fragrance consultation room" fill sizes="(max-width: 760px) 100vw, 34vw" />
          <span><strong>The Aurum Room</strong><small>A private fragrance experience, tailored to you.</small><b>Learn more</b></span>
        </Link>
        <Link className="home-service-card" href="/shop?query=gift%20set">
          <Image src="/images/services/gifting-v2.webp" alt="Ivory gift box tied with a blush silk ribbon" fill sizes="(max-width: 760px) 100vw, 34vw" />
          <span><strong>Gifting</strong><small>Thoughtful fragrance, beautifully presented.</small><b>Shop gifts</b></span>
        </Link>
        <Link className="home-service-card home-service-help" href="/pages/contact">
          <Image src="/images/services/whatsapp-v2.webp" alt="Hand holding a phone for private fragrance assistance" fill sizes="(max-width: 760px) 100vw, 34vw" />
          <WhatsappLogo className="service-chat-mark" size={28} weight="fill" aria-hidden="true" />
          <span><strong>Need help?</strong><small>Tell us what you wear or the feeling you want.</small><b>Contact us</b></span>
        </Link>
      </section>
    </div>
  );
}
