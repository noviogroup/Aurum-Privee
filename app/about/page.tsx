import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkle } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "About Aurum Privée",
  description: "Meet Aurum Privée: a fragrance sourcing service for retailers, hospitality teams and professional buyers.",
  alternates: { canonical: "/about" },
};

const principles = [
  {
    title: "Explore the range",
    body: "Compare designer, niche and Arabian fragrance in one catalogue, with scent profiles and product formats to guide your selection.",
  },
  {
    title: "Choose for your customers",
    body: "Select sizes, concentrations and gift sets that suit your customers, intended use and buying plans.",
  },
  {
    title: "Agree the details",
    body: "Receive pricing, order requirements and fulfilment terms in writing before deciding whether to proceed.",
  },
];

export default function AboutPage() {
  return (
    <div className="about-page page-top">
      <section className="about-hero section-shell">
        <div className="about-hero-copy entrance">
          <h1>Fragrance for business.</h1>
          <p>
            Aurum Privée helps retailers, hospitality teams and corporate buyers source fragrance through a trade catalogue and direct quotation service.
          </p>
          <Link href="/shop" className="button button-primary">Browse trade catalogue <ArrowRight size={17} /></Link>
        </div>
        <figure className="about-hero-image">
          <Image
            src="/images/campaign/signature-consultation.webp"
            alt="Fragrance bottles and scent blotters arranged for a consultation"
            fill
            priority
            sizes="(max-width: 767px) 100vw, 58vw"
          />
        </figure>
      </section>

      <section className="about-manifesto section-shell" aria-label="Aurum Privée point of view">
        <Sparkle size={24} weight="thin" aria-hidden="true" />
        <h2>Build a fragrance range around the people you serve.</h2>
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
          <h2>Start with your customers.</h2>
          <p>
            Whether you are planning a retail range, selecting corporate gifts or sourcing for hospitality, begin with the products and quantities that fit your brief.
          </p>
          <p>
            Send us your selection for pricing and availability. If you need help deciding, The Aurum Room offers a conversation with the trade team about your requirements.
          </p>
          <Link href="/pages/aurum-room" className="text-link">Request a consultation <ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className="about-principles section-shell" aria-labelledby="about-principles-title">
        <div className="about-principles-heading">
          <h2 id="about-principles-title">A clear process for professional buyers.</h2>
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
          <h2>Build your next selection.</h2>
          <div>
            <Link href="/shop" className="button button-light">Browse trade catalogue <ArrowRight size={17} /></Link>
            <Link href="/quote-list" className="about-closing-link">Review quote list</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
