import type { Metadata } from "next";
import { ChatCircleDots, Package, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Aurum Privée for fragrance guidance, gifting help or order support.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="contact-page page-top">
      <header className="contact-heading section-shell entrance">
        <h1>A thoughtful answer,<br />from a real person.</h1>
        <p>Ask about a fragrance, a gift or an existing order. We’ll reply using the email address you share below.</p>
      </header>
      <div className="contact-layout section-shell">
        <aside className="contact-aside">
          <div><ChatCircleDots size={24} weight="light" aria-hidden="true" /><h2>Fragrance guidance</h2><p>Tell us what you usually wear, what you want to feel, or who the gift is for.</p></div>
          <div><Package size={24} weight="light" aria-hidden="true" /><h2>Order care</h2><p>Include your order number so the team can find the right purchase quickly.</p></div>
          <div><ShieldCheck size={24} weight="light" aria-hidden="true" /><h2>Private by default</h2><p>Your message is stored securely for client care and is never published.</p></div>
        </aside>
        <section className="contact-form-panel" aria-labelledby="contact-form-title">
          <h2 id="contact-form-title">How may we help?</h2>
          <ContactForm />
        </section>
      </div>
    </div>
  );
}
