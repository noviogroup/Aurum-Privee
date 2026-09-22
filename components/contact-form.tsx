"use client";

import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { inquiryTopics } from "@/lib/contact-inquiry";
import { ClientRequestTimeoutError, ClientResponseFormatError, requestJson } from "@/lib/client-json-request";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const requestPending = useRef(false);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => () => requestController.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestPending.current) return;
    requestPending.current = true;
    const controller = new AbortController();
    requestController.current = controller;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setStatus("loading");
    setMessage("");
    setReference("");
    try {
      const { response, data } = await requestJson<{ message?: string; reference?: string }>("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
        signal: controller.signal,
      });
      setMessage(data.message || (response.ok ? "Your note has been received." : "We could not send your note."));
      setReference(data.reference || "");
      setStatus(response.ok ? "success" : "error");
      if (response.ok) formElement.reset();
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus("error");
      setMessage(error instanceof ClientRequestTimeoutError
        ? "Sending took too long. Check your connection and try again."
        : error instanceof ClientResponseFormatError
          ? "Client care returned an unexpected response. Your note is still here, so please try again."
          : "We could not send your note. Check your connection and try again.");
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        requestPending.current = false;
      }
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
    <form className="contact-form" onSubmit={submit} aria-busy={status === "loading"}>
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
        <select id="contact-topic" name="topic" defaultValue="Trade quote help" required>
          {inquiryTopics.map((topic) => <option value={topic} key={topic}>{topic}</option>)}
        </select>
      </div>
      <div className="contact-field contact-field-wide">
        <label htmlFor="contact-message">Your note</label>
        <textarea id="contact-message" name="message" minLength={20} maxLength={2000} rows={7} required />
        <small>Tell us about your business, the assortment you need, or how we can help with your quote.</small>
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
