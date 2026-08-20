"use client";

import { FormEvent, useState } from "react";

export function Newsletter() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    setStatus("loading");
    const response = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setStatus(response.ok ? "success" : "error");
    setMessage(data.message);
    if (response.ok) event.currentTarget.reset();
  };

  return (
    <form className="newsletter-form" onSubmit={submit}>
      <label htmlFor="newsletter-email">Email address</label>
      <div>
        <input id="newsletter-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        <button type="submit" disabled={status === "loading"}>{status === "loading" ? "Joining" : "Join the list"}</button>
      </div>
      {message && <p className={status === "error" ? "form-error" : "form-success"} role="status">{message}</p>}
    </form>
  );
}
