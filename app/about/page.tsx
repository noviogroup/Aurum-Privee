import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkle } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "About Aurum Privée",
  description: "Learn how Aurum Privée supports trade fragrance sourcing and assortment planning.",
  alternates: { canonical: "/about" },
};

const principles = [
  {
    title: "Compare fragrance categories",
    body: "Recognisable designer houses, niche signatures and Arabian perfumery can sit together when every addition has a clear role in the assortment.",
  },
  {
    title: "Select the right formats",
    body: "A large catalogue becomes useful only when formats, fragrance character and audience are easy to compare and select.",
  },
  {
    title: "Review terms directly",
    body: "A quote request begins the conversation. Availability and commercial terms are reviewed with the needs of each business in mind.",
  },
];

export default function AboutPage() {
  return (
    <div className="about-page page-top">
      <section className="about-hero section-shell">
        <div className="about-hero-copy entrance">
          <h1>Trade fragrance<br />sourcing.</h1>
          <p>
            Aurum Privée brings designer, niche and Arabian fragrance into one catalogue for retailers and professional buyers.
          </p>
          <Link href="/shop" className="button button-primary">Browse catalogue <ArrowRight size={17} /></Link>
        </div>
        <figure className="about-hero-image">
          <Image
            src="/images/campaign/signature-consultation.webp"
            alt="Aurum Privée fragrance consultation with Dior fragrances and scent blotters"
            fill
            priority
            sizes="(max-width: 767px) 100vw, 58vw"
          />
        </figure>
      </section>

      <section className="about-manifesto section-shell" aria-label="Aurum Privée point of view">
        <Sparkle size={24} weight="thin" aria-hidden="true" />
        <h2>The catalogue combines established designer houses, niche fragrance and Arabian perfumery for professional buyers.</h2>
      </section>

      <section className="about-editorial section-shell">
        <figure className="about-editorial-image">
          <Image
            src="/images/campaign/baccarat-gifting.webp"
            alt="Baccarat Rouge 540 presented with Aurum Privée gifting details"
            fill
            sizes="(max-width: 767px) 100vw, 44vw"
          />
        </figure>
        <div className="about-editorial-copy">
          <h2>Compare houses, formats and fragrance families.</h2>
          <p>
            Browse floral, woody, amber, oud and fresh profiles across multiple houses and formats.
          </p>
          <p>
            Add relevant products to a quote list, set quantities and send the selection for availability and private commercial terms.
          </p>
          <Link href="/pages/aurum-room" className="text-link">Plan a buyer consultation <ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className="about-principles section-shell" aria-labelledby="about-principles-title">
        <div className="about-principles-heading">
          <h2 id="about-principles-title">How we support assortment planning.</h2>
        </div>
        <div className="about-principles-list">
          {principles.map((principle) => (
            <article key={principle.title}>
              <h3>{principle.title}</h3>
              <p>{principle.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-closing">
        <Image src="/images/campaign/oud-ritual.webp" alt="Amber oud fragrance arranged for a warm evening ritual" fill sizes="100vw" />
        <div className="about-closing-scrim" />
        <div className="about-closing-copy section-shell">
          <h2>Ready to build your quote list?</h2>
          <div>
            <Link href="/shop" className="button button-light">Browse catalogue <ArrowRight size={17} /></Link>
            <Link href="/quote-list" className="about-closing-link">Start a quote request</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
