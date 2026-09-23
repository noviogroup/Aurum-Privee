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
    awaitingApproval: true,
    intro: "Availability, lead times and fulfilment terms are confirmed privately for each accepted trade quote.",
    sections: [
      { heading: "Availability and lead times", body: "Catalogue inclusion does not guarantee supply. Quantities and estimated dispatch times are confirmed in the written quote. Products are not reserved by submitting an enquiry. Any substitution requires the buyer’s agreement." },
      { heading: "Fulfilment", body: "The written quote confirms the delivery destination, freight method, estimated timing and freight charges, including responsibility for taxes, duties and import clearance where applicable. Shipping is subject to carrier acceptance and destination requirements. Dispatch follows cleared payment unless credit terms are agreed in writing." },
      { heading: "Damage, shortages and incorrect items", body: "Inspect deliveries promptly and contact the trade team with your reference, photographs and details of any damage, shortage or incorrect item. Retain the goods and packaging for review. Do not return goods without written return instructions." },
      { heading: "Returns and cancellations", body: "Return eligibility, claim deadlines and cancellation conditions are stated in the written quote before acceptance. Contact the trade team promptly if your requirements change; any agreed change must be confirmed in writing.", link: { href: "/contact", label: "Ask about trade fulfilment" } },
    ],
  },
  authenticity: {
    title: "Authenticity",
    intro: "Ask about product sourcing, condition and available documentation before confirming an order.",
    sections: [{ heading: "Sourcing information", body: "Include any documentation or traceability requirements in your enquiry. The trade team will confirm what information is available for the products being quoted." }, { heading: "Product presentation", body: "Confirm the edition, size, concentration and packaging in your written quote. Catalogue imagery illustrates the product; packaging may vary by edition or market. Raise any specific packaging requirements before accepting." }],
  },
  privacy: {
    title: "Privacy",
    awaitingApproval: true,
    intro: "How Aurum Privée uses information provided through this trade catalogue and its enquiry services.",
    sections: [
      { heading: "Information you provide", body: "When you request a quote or contact us, we collect the company and contact details, product selections, quantities and messages you submit. Phone numbers, destination details and additional notes are optional. Do not include payment-card details, passwords or sensitive identity documents in these forms." },
      { heading: "How information is used", body: "Aurum Privée uses enquiry information to assess your requirements, confirm availability, prepare commercial terms, respond to you and keep a record of the conversation. Technical request information is also used to protect the service against abuse. No purchase or payment is completed through this website." },
      { heading: "Your quote list and browser storage", body: "Your product selections, quantities and product notes are saved in this browser on your device until you remove them, submit the list successfully or clear site data. Submitting a request sends a copy to the trade team. Clearing your browser does not delete a request already submitted. Staff sign-in uses a session cookie." },
      { heading: "Service providers", body: "Netlify hosts the website and stores submitted quote requests. Resend processes enquiry emails. Wix supplies catalogue content. These providers may process information outside your country. Enquiries are available to authorised staff and the providers needed to operate and support the service." },
      { heading: "Trade updates", body: "Requesting a quote does not subscribe you to marketing. The separate Trade updates signup asks you to confirm your email address before subscribing. Contact us if you want to stop receiving trade updates." },
      { heading: "Retention and your choices", body: "Enquiry records support commercial follow-up and recordkeeping. Contact us to request access, correction or deletion, or to ask how long a particular record is held. We may need to verify your identity and retain records needed for an ongoing transaction, dispute or legal obligation.", link: { href: "/contact", label: "Contact us about your information" } },
    ],
  },
  terms: {
    title: "Terms",
    awaitingApproval: true,
    intro: "This website is a trade catalogue and quote-request service; it does not accept purchases or payments.",
    sections: [
      { heading: "Quote requests", body: "Submitting a list is an invitation to discuss availability and commercial terms. It is not an order, reservation, price quote or acceptance by Aurum Privée." },
      { heading: "Commercial agreement", body: "Each written quote identifies the products, quantities, minimums, currency, prices, applicable taxes, freight, estimated timing, payment terms and expiry date. Unless the quote states otherwise, pricing is valid for seven calendar days from issue and remains subject to availability. A transaction exists only after both parties separately accept the written terms." },
      { heading: "Payment and allocation", body: "Payment is due before dispatch unless credit terms have been approved in writing. Submission of a request does not reserve stock. Allocation and dispatch timing are confirmed with the accepted quote; credit is not granted automatically." },
      { heading: "Professional use", body: "This service is for organisations sourcing fragrance for resale, gifting or professional use. Business details may be verified before a trade relationship is approved. Individual consumer purchases are not offered through this catalogue.", link: { href: "/contact", label: "Ask a trade question" } },
    ],
  },
  "trade-program": {
    title: "Trade programme",
    intro: "Wholesale fragrance sourcing for retailers, distributors, hospitality teams and corporate buyers.",
    sections: [
      { heading: "Who it is for", body: "The trade catalogue is intended for retailers, distributors, hospitality teams, corporate buyers and other organisations sourcing fragrance for resale, gifting or professional use." },
      { heading: "How quoting works", body: "Add products to a quote list, set the quantities you are considering and include any relevant notes. The Aurum Privée team reviews the complete request before responding.", link: { href: "/quote-list", label: "Build a quote request" } },
      { heading: "Quantities and minimums", body: "Enter the quantities you would like us to review. Requested quantities are individual units unless an item is described as a set. Minimum order values, case packs and product or brand minimums are confirmed in your quote; adding one unit is an enquiry, not a promise that a single-unit order can be supplied." },
      { heading: "From enquiry to order", body: "We review your business details and requirements, confirm availability and send a written quote. Review the currency, prices, minimums, freight, payment terms and expiry date before accepting. Unless otherwise stated, quotes are valid for seven calendar days. Payment is due before dispatch unless credit terms are approved in writing." },
      { heading: "Larger assortments", body: "Each request can include up to 20 different fragrances and 999 units per line. For a larger assortment, send a further request and mention the earlier reference, or contact the trade team. This website limit is not a commercial order minimum." },
      { heading: "Buyer support", body: "If you need help shaping the assortment before submitting, request a private buyer consultation through The Aurum Room.", link: { href: "/pages/aurum-room", label: "Plan a consultation" } },
    ],
  },
  "aurum-room": {
    title: "The Aurum Room",
    intro: "Talk through your buying brief with the Aurum Privée trade team.",
    sections: [
      { heading: "Assortment guidance", body: "Tell us about your customers, current range and buying priorities. We’ll help you identify products to include in a quote request." },
      { heading: "Formats and opportunities", body: "Compare sizes, concentrations, fragrance families and gift sets for your retail, hospitality or corporate brief." },
      { heading: "Arrange a consultation", body: "Send your company name, buying brief and preferred time through our contact form. The trade team will confirm the consultation arrangements." },
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
            <p className="utility-label">Buyer consultation</p>
            <h1>{page.title}</h1>
            <p>{page.intro}</p>
            <Link className="button button-primary" href="/contact">Request a consultation <ArrowRight size={16} /></Link>
          </div>
          <div className="aurum-room-hero-image">
            <Image src="/images/services/aurum-room-v2.webp" alt="A fragrance consultation setting with seating and display shelves" fill priority sizes="(max-width: 767px) calc(100vw - 32px), 52vw" />
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
            <h2>Let’s discuss your buying brief.</h2>
            <p>Share the products, quantities and timing you have in mind. We’ll contact you to arrange a conversation.</p>
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
