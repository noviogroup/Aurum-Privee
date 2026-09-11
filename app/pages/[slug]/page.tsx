import type { Metadata } from "next";
import { notFound } from "next/navigation";

const pages: Record<string, { title: string; intro: string; sections: Array<{ heading: string; body: string }> }> = {
  "shipping-returns": {
    title: "Shipping & returns",
    intro: "Clear delivery expectations make a beautiful purchase feel even better.",
    sections: [
      { heading: "Nassau pickup", body: "Choose pickup at checkout. We will email when the order is packed and ready, along with the confirmed pickup location and hours." },
      { heading: "Local delivery", body: "Delivery areas, timing and fees will appear at checkout once the final courier arrangement is connected." },
      { heading: "Returns", body: "Unopened fragrance may be returned within the published return window. Final policy terms must be approved by Aurum Privée before launch." },
    ],
  },
  authenticity: {
    title: "Authenticity",
    intro: "Aurum Privée is committed to selling authentic fragrance from trusted sources.",
    sections: [{ heading: "Our standard", body: "Each bottle is checked for condition, presentation and traceability before fulfillment. Final sourcing language should be approved by the merchant." }],
  },
  privacy: {
    title: "Privacy",
    intro: "This page is prepared for the final merchant-approved privacy notice.",
    sections: [{ heading: "Data handling", body: "The live policy should cover checkout providers, email communications, analytics, order retention, customer rights and contact details." }],
  },
  terms: {
    title: "Terms",
    intro: "This page is prepared for the final merchant-approved terms of sale.",
    sections: [{ heading: "Before launch", body: "Confirm pricing, payment, fulfillment, cancellations, returns, age rules if any, governing law and contact details with the merchant and legal adviser." }],
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
  return { title: page.title, description: page.intro, alternates: { canonical: `/pages/${slug}` } };
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();
  return (
    <article className="content-page section-shell page-top">
      <h1>{page.title}</h1>
      <p className="content-intro">{page.intro}</p>
      <div className="content-sections">
        {page.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></section>)}
      </div>
    </article>
  );
}
