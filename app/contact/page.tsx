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
        <p>Ask about a quote, sourcing requirement or buyer consultation. Include your company name and any existing request reference so we can help.</p>
      </header>
      <div className="contact-layout section-shell">
        <aside className="contact-aside">
          <div><ChatCircleDots size={24} weight="light" aria-hidden="true" /><h2>Product guidance</h2><p>Tell us who you buy for, the categories you need and your preferred formats.</p></div>
          <div><Buildings size={24} weight="light" aria-hidden="true" /><h2>Trade support</h2><p>Use the quote list for product and quantity requests. Use this form for questions, changes or follow-up.</p></div>
          <div><ShieldCheck size={24} weight="light" aria-hidden="true" /><h2>Your information</h2><p>We use your details to respond to your enquiry. Sending a message does not subscribe you to trade updates.</p></div>
        </aside>
        <section className="contact-form-panel" aria-labelledby="contact-form-title">
          <h2 id="contact-form-title">How may we help?</h2>
          <ContactForm />
        </section>
      </div>
    </div>
  );
}
