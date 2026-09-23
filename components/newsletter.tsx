"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ClientRequestTimeoutError, ClientResponseFormatError, requestJson } from "@/lib/client-json-request";

export function Newsletter() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const requestPending = useRef(false);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => () => requestController.current?.abort(), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestPending.current) return;
    requestPending.current = true;
    const controller = new AbortController();
    requestController.current = controller;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email") || "");
    setStatus("loading");
    setMessage("");
    try {
      const { response, data } = await requestJson<{ message?: string }>("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });
      setStatus(response.ok ? "success" : "error");
      setMessage(data.message || (response.ok ? "Please check your inbox to confirm." : "We could not add you to the list."));
      if (response.ok) formElement.reset();
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus("error");
      setMessage(error instanceof ClientRequestTimeoutError
        ? "The request took too long. Check your connection and try again."
        : error instanceof ClientResponseFormatError
          ? "We could not confirm your signup. Your email is still here, so please try again."
          : "We could not submit your signup. Check your connection and try again.");
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        requestPending.current = false;
      }
    }
  };

  return (
    <form className="newsletter-form" onSubmit={submit} aria-busy={status === "loading"}>
      <label htmlFor="newsletter-email">Email address</label>
      <div>
        <input id="newsletter-email" name="email" type="email" autoComplete="email" placeholder="Email address" required />
        <button type="submit" disabled={status === "loading"}>{status === "loading" ? "Joining" : "Join the list"}</button>
      </div>
      {message && <p className={status === "error" ? "form-error" : "form-success"} role={status === "error" ? "alert" : "status"}>{message}</p>}
    </form>
  );
}
