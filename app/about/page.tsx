import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Sparkle } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "About Aurum Privée",
  description: "Discover Aurum Privée’s considered approach to designer, niche and Arabian fragrance in The Bahamas and Ghana.",
  alternates: { canonical: "/about" },
};

const principles = [
  {
    title: "Start with instinct",
    body: "A name on a bottle can open the door. Mood, memory and the way a fragrance settles on skin are what make the choice personal.",
  },
  {
    title: "Keep the edit considered",
    body: "Designer signatures, niche compositions and Arabian perfumery belong in one wardrobe when each selection earns its place.",
  },
  {
    title: "Make discovery human",
    body: "We help narrow the collection through conversation—what you already love, what you want to feel and where the fragrance will be worn.",
  },
];

export default function AboutPage() {
  return (
    <main className="about-page page-top">
      <section className="about-hero section-shell">
        <div className="about-hero-copy entrance">
          <h1>Fragrance,<br />chosen with <em>feeling.</em></h1>
          <p>
            Aurum Privée brings designer, niche and Arabian fragrance into one considered edit—made for the deeply personal way scent becomes memory.
          </p>
          <Link href="/shop" className="button button-primary">Explore the collection <ArrowRight size={17} /></Link>
        </div>
        <figure className="about-hero-image">
          <Image
            src="/images/campaign/signature-consultation.webp"
            alt="Aurum Privée fragrance consultation with Dior fragrances and scent blotters"
            fill
            priority
            sizes="(max-width: 767px) 100vw, 58vw"
          />
          <figcaption>Personal fragrance discovery, the Aurum Privée way.</figcaption>
        </figure>
      </section>

      <section className="about-manifesto section-shell" aria-label="Aurum Privée point of view">
        <Sparkle size={24} weight="thin" aria-hidden="true" />
        <p>We believe a fragrance wardrobe should move with the person wearing it—not the label someone else chose for them.</p>
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
          <h2>Exceptional fragrance.<br />Without boundaries.</h2>
          <p>
            Our collection makes room for luminous florals, polished woods, enveloping amber and the darker pull of oud. We invite clients to move between fragrance traditions and follow what feels unmistakably their own.
          </p>
          <p>
            Whether the search begins with a familiar house, a particular note or no vocabulary at all, Aurum Privée turns a crowded category into a calmer, more personal discovery.
          </p>
          <Link href="/pages/aurum-room" className="text-link">Enter The Aurum Room <ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className="about-principles section-shell" aria-labelledby="about-principles-title">
        <div className="about-principles-heading">
          <h2 id="about-principles-title">A considered way to find your next fragrance.</h2>
          <p>Less about rules. More about recognition.</p>
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

      <section className="about-presence section-shell">
        <div className="about-presence-heading">
          <MapPin size={24} weight="thin" aria-hidden="true" />
          <h2>From the islands,<br />with a wider point of view.</h2>
        </div>
        <div className="about-presence-locations">
          <p><strong>Nassau</strong><span>New Providence, The Bahamas</span></p>
          <p><strong>Harbour Island</strong><span>Eleuthera, The Bahamas</span></p>
          <p><strong>Ghana</strong><span>Service details to be confirmed</span></p>
        </div>
      </section>

      <section className="about-closing">
        <Image src="/images/campaign/oud-ritual.webp" alt="Amber oud fragrance arranged for a warm evening ritual" fill sizes="100vw" />
        <div className="about-closing-scrim" />
        <div className="about-closing-copy section-shell">
          <h2>Your next signature may be the one you did not expect.</h2>
          <div>
            <Link href="/shop" className="button button-light">Shop fragrances <ArrowRight size={17} /></Link>
            <Link href="/contact" className="about-closing-link">Ask for guidance</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
