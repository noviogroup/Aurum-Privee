import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Aurum Privée for fragrance guidance, gifting help or order support.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="contact-page page-top">
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
    </main>
  );
}
