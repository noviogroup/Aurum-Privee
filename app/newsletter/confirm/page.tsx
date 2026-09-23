import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Confirm your subscription", robots: { index: false, follow: false } };

export default async function ConfirmNewsletterPage({ searchParams }: { searchParams: Promise<{ token?: string; status?: string }> }) {
  const { token, status } = await searchParams;
  const validToken = typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
  const copy = status === "confirmed"
    ? { title: "Subscription confirmed.", body: "You’re subscribed to Aurum Privée catalogue news and product updates." }
    : status === "invalid"
      ? { title: "That link is invalid or has expired.", body: "Return to the home page and request a fresh confirmation email." }
      : status === "unavailable"
        ? { title: "Confirmation is briefly unavailable.", body: "Please try the same link again shortly." }
        : { title: "Confirm your subscription.", body: "Confirm that you want to receive catalogue news and product updates from Aurum Privée." };
  return (
    <div className="section-shell page-top" style={{ minHeight: "65vh", maxWidth: 760 }}>
      <p className="utility-label">Aurum Privée trade updates</p>
      <h1>{copy.title}</h1>
      <p>{copy.body}</p>
      {!status && validToken ? (
        <form action="/api/newsletter/confirm" method="post">
          <input type="hidden" name="token" value={token} />
          <button className="button button-primary" type="submit">Confirm subscription</button>
        </form>
      ) : <Link className="button button-primary" href="/">Return home</Link>}
    </div>
  );
}
