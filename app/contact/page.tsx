import type { Metadata } from "next";
import { Buildings, ChatCircleDots, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Aurum Privée for trade quote support, product guidance or partnership enquiries.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="contact-page page-top">
      <header className="contact-heading section-shell entrance">
        <h1>Contact the trade team.</h1>
        <p>Ask about a trade quote, product assortment or partnership. We’ll reply using the email address you share below.</p>
      </header>
      <div className="contact-layout section-shell">
        <aside className="contact-aside">
          <div><ChatCircleDots size={24} weight="light" aria-hidden="true" /><h2>Product guidance</h2><p>Tell us about your customers, assortment goals or the fragrance categories you want to source.</p></div>
          <div><Buildings size={24} weight="light" aria-hidden="true" /><h2>Trade support</h2><p>Build a quote list for a structured request, or contact us for help shaping the right selection.</p></div>
          <div><ShieldCheck size={24} weight="light" aria-hidden="true" /><h2>Private by default</h2><p>Your message is stored securely for the trade team and is never published.</p></div>
        </aside>
        <section className="contact-form-panel" aria-labelledby="contact-form-title">
          <h2 id="contact-form-title">How may we help?</h2>
          <ContactForm />
        </section>
      </div>
    </div>
  );
}
