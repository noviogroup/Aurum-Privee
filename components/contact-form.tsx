"use client";

import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { inquiryTopics } from "@/lib/contact-inquiry";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setStatus("loading");
    setMessage("");
    setReference("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await response.json() as { message?: string; reference?: string };
      setMessage(data.message || (response.ok ? "Your note has been received." : "We could not send your note."));
      setReference(data.reference || "");
      setStatus(response.ok ? "success" : "error");
      if (response.ok) formElement.reset();
    } catch {
      setStatus("error");
      setMessage("We could not send your note. Please try again.");
    }
  }

  if (status === "success") return (
    <div className="contact-success" role="status">
      <CheckCircle size={30} weight="light" />
      <p className="utility-label">Note received</p>
      <h2>We’ll take it from here.</h2>
      <p>{message}</p>
      {reference && <strong>Reference {reference}</strong>}
      <button type="button" className="text-button" onClick={() => { setStatus("idle"); setMessage(""); setReference(""); }}>Send another note</button>
    </div>
  );

  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <div className="contact-field contact-field-wide is-honeypot" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="contact-field">
        <label htmlFor="contact-name">Name</label>
        <input id="contact-name" name="name" type="text" autoComplete="name" minLength={2} maxLength={100} required />
      </div>
      <div className="contact-field">
        <label htmlFor="contact-email">Email</label>
        <input id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} required />
      </div>
      <div className="contact-field">
        <label htmlFor="contact-phone">Phone <span>Optional</span></label>
        <input id="contact-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} />
      </div>
      <div className="contact-field">
        <label htmlFor="contact-topic">How can we help?</label>
        <select id="contact-topic" name="topic" defaultValue="Fragrance guidance" required>
          {inquiryTopics.map((topic) => <option value={topic} key={topic}>{topic}</option>)}
        </select>
      </div>
      <div className="contact-field contact-field-wide">
        <label htmlFor="contact-order">Order number <span>Only if this is about an order</span></label>
        <input id="contact-order" name="orderNumber" type="text" maxLength={64} />
      </div>
      <div className="contact-field contact-field-wide">
        <label htmlFor="contact-message">Your note</label>
        <textarea id="contact-message" name="message" minLength={20} maxLength={2000} rows={7} required />
        <small>Tell us what you’re looking for, or include anything we should know about your order.</small>
      </div>
      <div className="contact-form-foot contact-field-wide">
        <p>By sending this note, you agree that Aurum Privée may use these details to respond to your inquiry.</p>
        <button type="submit" className="button button-primary" disabled={status === "loading"}>
          {status === "loading" ? "Sending…" : <>Send your note <ArrowRight size={16} /></>}
        </button>
      </div>
      {message && <p className="form-error contact-field-wide" role="alert">{message}</p>}
    </form>
  );
}
