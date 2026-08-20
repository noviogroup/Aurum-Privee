"use client";

import { FormEvent, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";

export function OperationsLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/operations/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Sign-in failed");
      window.location.assign("/operations");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed");
      setSubmitting(false);
    }
  }

  return (
    <form className="operations-login-form" onSubmit={submit}>
      <label htmlFor="operations-password">Operator password</label>
      <input
        id="operations-password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        minLength={12}
        maxLength={256}
        aria-describedby={error ? "operations-login-error" : undefined}
      />
      {error && <p id="operations-login-error" className="operations-form-error" role="alert">{error}</p>}
      <button type="submit" className="operations-primary-button" disabled={submitting}>
        {submitting ? "Signing in" : "Open operations"}<ArrowRight size={16} weight="bold" />
      </button>
    </form>
  );
}

