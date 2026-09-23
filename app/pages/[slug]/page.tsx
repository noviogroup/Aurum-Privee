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
    intro: "Aurum Privée is committed to offering authentic fragrance sourced through trusted commercial relationships.",
    sections: [{ heading: "Our standard", body: "Product condition, presentation and available traceability are reviewed before commercial fulfilment. Contact the trade team if your business requires specific sourcing documentation." }],
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
  "trade-program": {
    title: "Trade programme",
    intro: "A clear way for retailers and professional buyers to build an assortment and begin a private commercial conversation.",
    sections: [
      { heading: "Who it is for", body: "The trade catalogue is intended for retailers, distributors, hospitality teams, corporate buyers and other organisations sourcing fragrance for resale, gifting or professional use." },
      { heading: "How quoting works", body: "Add products to a quote list, set the quantities you are considering and include any relevant notes. The Aurum Privée team reviews the complete request before responding.", link: { href: "/quote-list", label: "Build a quote request" } },
      { heading: "Commercial terms", body: "Pricing, minimum quantities, availability, lead times, payment and freight are supplied privately. Catalogue inclusion does not guarantee supply, reserve inventory or create an order." },
      { heading: "Buyer support", body: "If you need help shaping the assortment before submitting, request a private buyer consultation through The Aurum Room.", link: { href: "/pages/aurum-room", label: "Plan a consultation" } },
    ],
  },
  "aurum-room": {
    title: "The Aurum Room",
    intro: "A private buyer consultation for assortment planning and product selection.",
    sections: [
      { heading: "Assortment guidance", body: "Share your customer profile, existing range or sourcing priorities. We will help narrow the catalogue into a more relevant working selection." },
      { heading: "Formats and opportunities", body: "Explore gift sets, fragrance families and complementary formats that may help broaden a retail or corporate programme." },
      { heading: "Arrange a consultation", body: "Contact the trade team to discuss the right format for a private buyer conversation." },
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
            <p className="utility-label">Private buyer service</p>
            <h1>{page.title}</h1>
            <p>{page.intro}</p>
            <Link className="button button-primary" href="/contact">Request a consultation <ArrowRight size={16} /></Link>
          </div>
          <div className="aurum-room-hero-image">
            <Image src="/images/services/aurum-room-v2.webp" alt="A private Aurum Privée fragrance consultation room" fill priority sizes="(max-width: 767px) calc(100vw - 32px), 52vw" />
          </div>
        </section>
        <section className="aurum-room-details section-shell" aria-label="The Aurum Room buyer experience">
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
            <h2>Discuss your assortment with the trade team.</h2>
            <p>Tell us about your customers, target formats or the range you want to build. The trade team will respond with the next consultation options.</p>
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
