"use client";

import { createBrowserClient } from "@supabase/ssr";
import { ArrowRight, EnvelopeSimple } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";

type AccountSignInProps = {
  configured: boolean;
  supabaseUrl?: string;
  publishableKey?: string;
};

export function AccountSignIn({ configured, supabaseUrl, publishableKey }: AccountSignInProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!configured || !supabaseUrl || !publishableKey) {
      setError("Customer sign-in is ready for the Supabase project URL and publishable key.");
      return;
    }
    setStatus("sending");
    const supabase = createBrowserClient(supabaseUrl, publishableKey);
    const redirectTo = `${window.location.origin}/auth/callback?next=/account`;
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    if (signInError) {
      setError("We could not send the sign-in email. Please try again.");
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return <div className="account-email-sent" role="status"><EnvelopeSimple size={28} weight="light" /><h2>Check your inbox.</h2><p>Use the secure link we sent to {email} to open your account.</p></div>;
  }

  return (
    <form className="account-sign-in-form" onSubmit={submit}>
      <label htmlFor="account-email">Email address</label>
      <div><input id="account-email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required maxLength={320} placeholder="you@example.com" /><button type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending" : "Email me a secure link"}<ArrowRight size={16} /></button></div>
      <p>No password to remember. The link signs you in securely and creates your account if this is your first visit.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}
