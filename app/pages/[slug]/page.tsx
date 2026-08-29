import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/contact-form";

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
  contact: {
    title: "Contact",
    intro: "Questions about a scent, an order or a gift? We are happy to help.",
    sections: [],
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
  about: {
    title: "About Aurum Privée",
    intro: "A Nassau fragrance house built around discovery, discernment and the deeply personal way scent becomes memory.",
    sections: [
      { heading: "Our point of view", body: "We bring designer, niche and expressive fragrance into one considered collection, selected for quality, character and the pleasure of finding something that feels entirely your own." },
      { heading: "Exceptional, without boundaries", body: "A fragrance wardrobe should move with the person wearing it. We help clients explore beyond labels and begin with mood, memory, notes and instinct." },
      { heading: "Based in The Bahamas", body: "Orders are prepared in Nassau, with pickup and approved delivery choices confirmed during checkout." },
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
  return { title: page.title, description: page.intro, alternates: { canonical: `/pages/${slug}` } };
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();
  if (slug === "contact") return (
    <article className="contact-page page-top">
      <header className="contact-heading section-shell entrance">
        <p className="utility-label">Client care</p>
        <h1>A thoughtful answer,<br />from a real person.</h1>
        <p>Ask about a fragrance, a gift or an existing order. We’ll reply using the email address you share below.</p>
      </header>
      <div className="contact-layout section-shell">
        <aside className="contact-aside">
          <div><span>01</span><h2>Fragrance guidance</h2><p>Tell us what you usually wear, what you want to feel, or who the gift is for.</p></div>
          <div><span>02</span><h2>Order care</h2><p>Include your order number so the team can find the right purchase quickly.</p></div>
          <div><span>03</span><h2>Private by default</h2><p>Your message is stored securely for client care and is never published.</p></div>
        </aside>
        <section className="contact-form-panel" aria-labelledby="contact-form-title">
          <p className="utility-label">Leave us a note</p>
          <h2 id="contact-form-title">How may we help?</h2>
          <ContactForm />
        </section>
      </div>
    </article>
  );
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
