import Link from "next/link";

export function TradeBuyingGuide() {
  return <section className="trade-buying-guide" aria-label="Before you request a quote">
    <h2>Before you request a quote.</h2>
    <div>
      <article><h3>Quantities &amp; minimums</h3><p>Enter the units you need. We confirm minimum order quantities and case packs in your quote.</p></article>
      <article><h3>Availability &amp; delivery</h3><p>We check availability and confirm lead times and freight for your destination. A quote request does not reserve stock.</p></article>
      <article><h3>Your next step</h3><p>Keep your request reference for follow-up. Quotes are valid for 7 calendar days unless stated otherwise. Payment is due before dispatch unless credit terms are agreed in writing.</p></article>
    </div>
    <Link href="/pages/trade-program">Read the trade process →</Link>
  </section>;
}
