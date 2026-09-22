import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

type ContentSection = { heading: string; body: string; link?: { href: string; label: string } };
type ContentPage = { title: string; intro: string; sections: ContentSection[]; awaitingApproval?: boolean };

const pages: Record<string, ContentPage> = {
  "shipping-returns": {
    title: "Trade fulfilment",
    intro: "Availability, lead times and fulfilment terms are confirmed privately for each accepted trade quote.",
    awaitingApproval: true,
    sections: [
      { heading: "Availability and lead times", body: "Catalogue inclusion does not guarantee supply. Aurum Privée confirms quantities, lead times and any substitutions when responding to a quote request." },
      { heading: "Fulfilment", body: "Freight method, destination, handoff and related costs are agreed as part of the private commercial quote. No purchase or payment is completed through this website." },
      { heading: "Returns and cancellations", body: "Applicable return, cancellation and claim terms are supplied with the commercial quote before an order is accepted.", link: { href: "/contact", label: "Ask about trade fulfilment" } },
    ],
  },
  authenticity: {
    title: "Authenticity",
    intro: "Aurum Privée is committed to selling authentic fragrance from trusted sources.",
    sections: [{ heading: "Our standard", body: "Each bottle is checked for condition, presentation and traceability before fulfillment. Final sourcing language should be approved by the merchant." }],
  },
  privacy: {
    title: "Privacy",
    intro: "Aurum Privée is preparing its final merchant-approved privacy notice.",
    awaitingApproval: true,
    sections: [
      { heading: "Before you share information", body: "Your quote list remains on your device. Contact and trade-enquiry forms send only the information you choose to provide. Online ordering is not offered through this catalogue." },
      { heading: "Privacy questions", body: "Contact client care before submitting information if you have a question about access, correction, deletion, service providers or retention.", link: { href: "/contact", label: "Ask a privacy question" } },
    ],
  },
  terms: {
    title: "Terms",
    intro: "This website is a trade catalogue and quote-request service; it does not accept purchases or payments.",
    awaitingApproval: true,
    sections: [
      { heading: "Quote requests", body: "Submitting a list is an invitation to discuss availability and commercial terms. It is not an order, reservation, price quote or acceptance by Aurum Privée." },
      { heading: "Commercial agreement", body: "Pricing, minimum quantities, lead times, freight, payment and other binding terms are provided privately. A transaction exists only after both parties separately accept those terms.", link: { href: "/contact", label: "Ask a trade question" } },
    ],
  },
  "aurum-room": {
    title: "The Aurum Room",
    intro: "A private fragrance experience for thoughtful discovery, personal gifting and a more considered way to choose scent.",
    sections: [
      { heading: "Private fragrance guidance", body: "Share what you already wear, the feeling you want, or the occasion ahead. We will narrow the collection into a personal edit." },
      { heading: "Gifting, made personal", body: "We can help choose a fragrance or discovery set with presentation suited to the occasion." },
      { heading: "Arrange your experience", body: "Contact client care to discuss availability and the right format for your visit or consultation." },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) return {};
  return {
    title: page.title,
    description: page.intro,
    alternates: { canonical: `/pages/${slug}` },
    robots: page.awaitingApproval ? { index: false, follow: true } : undefined,
  };
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();
  if (slug === "aurum-room") {
    return (
      <article className="aurum-room-page page-top">
        <section className="aurum-room-hero section-shell">
          <div className="aurum-room-hero-copy entrance">
            <p className="utility-label">Private fragrance service</p>
            <h1>{page.title}</h1>
            <p>{page.intro}</p>
            <Link className="button button-primary" href="/contact">Request a consultation <ArrowRight size={16} /></Link>
          </div>
          <div className="aurum-room-hero-image">
            <Image src="/images/services/aurum-room-v2.webp" alt="A private Aurum Privée fragrance consultation room" fill priority sizes="(max-width: 767px) calc(100vw - 32px), 52vw" />
          </div>
        </section>
        <section className="aurum-room-details section-shell" aria-label="The Aurum Room experience">
          {page.sections.map((section) => (
            <article key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </article>
          ))}
        </section>
        <section className="aurum-room-consultation section-shell">
          <div className="aurum-room-consultation-image">
            <Image src="/images/campaign/signature-consultation.webp" alt="Aurum Privée fragrance consultation with selected bottles and scent strips" fill sizes="(max-width: 767px) calc(100vw - 32px), 48vw" />
          </div>
          <div className="aurum-room-consultation-copy">
            <p className="utility-label">Begin with a conversation</p>
            <h2>Your edit, considered together.</h2>
            <p>Tell us what you wear, the occasion ahead, or the feeling you want. Client care will respond with the next available consultation options.</p>
            <Link className="text-link" href="/contact">Request a consultation <ArrowRight size={16} /></Link>
          </div>
        </section>
      </article>
    );
  }
  return (
    <article className="content-page section-shell page-top">
      <h1>{page.title}</h1>
      <p className="content-intro">{page.intro}</p>
      <div className="content-sections">
        {page.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p>{section.link && <Link className="content-section-link" href={section.link.href}>{section.link.label}</Link>}</section>)}
      </div>
    </article>
  );
}
