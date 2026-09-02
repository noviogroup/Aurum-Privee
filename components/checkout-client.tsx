"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, LockKey, Package, Storefront, Truck, UserCircle } from "@phosphor-icons/react";
import { useCart } from "@/components/cart-provider";
import { formatMoney } from "@/lib/config";
import { calculateAddedTax } from "@/lib/tax";

type Fulfillment = "pickup" | "delivery";

type CheckoutClientProps = {
  initialEmail: string;
  paymentReady: boolean;
  pickupLabel: string;
  deliveryFee: number;
};

export function CheckoutClient({ initialEmail, paymentReady, pickupLabel, deliveryFee }: CheckoutClientProps) {
  const { items, hydrated } = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState("");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("pickup");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = items.reduce((sum, item) => sum + calculateAddedTax(item.product.price * item.quantity, item.product.loyverseTaxes), 0);
  const shipping = fulfillment === "delivery" ? deliveryFee : 0;
  const total = subtotal + tax + shipping;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!paymentReady) {
      setError("The checkout experience is ready, but secure payment still needs the production payment, email and inventory credentials.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          customer: { name, email, phone },
          fulfillment,
        }),
      });
      const body = await response.json() as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error || "Checkout could not be started.");
      window.location.assign(body.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout could not be started.");
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return <div className="checkout-loading section-shell page-top" aria-live="polite">Preparing your selection...</div>;
  }

  if (!items.length) {
    return (
      <div className="status-page section-shell page-top">
        <Package size={46} weight="thin" />
        <h1>Your bag is empty.</h1>
        <p>Choose a fragrance before starting checkout.</p>
        <Link href="/shop" className="button button-primary">Explore the collection</Link>
      </div>
    );
  }

  return (
    <div className="checkout-page section-shell page-top">
      <header className="checkout-heading">
        <div>
          <h1>Checkout</h1>
          <p>Complete your details, choose pickup or delivery, then continue to secure payment.</p>
        </div>
        <Link href="/account" className="checkout-account-link"><UserCircle size={20} />{initialEmail ? "Account connected" : "Sign in for faster checkout"}</Link>
      </header>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submit}>
          <section className="checkout-section" aria-labelledby="checkout-contact-title">
            <div className="checkout-section-heading"><span>01</span><div><h2 id="checkout-contact-title">Contact details</h2><p>Your receipt and order updates will be sent here.</p></div></div>
            <div className="checkout-fields">
              <label><span>Full name</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required minLength={2} maxLength={100} /></label>
              <label><span>Email</span><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required maxLength={320} /></label>
              <label className="checkout-field-wide"><span>Phone</span><input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" maxLength={40} placeholder="Optional" /></label>
            </div>
          </section>

          <section className="checkout-section" aria-labelledby="checkout-fulfillment-title">
            <div className="checkout-section-heading"><span>02</span><div><h2 id="checkout-fulfillment-title">Pickup or delivery</h2><p>Select how you would like to receive your order.</p></div></div>
            <div className="fulfillment-options">
              <label className={fulfillment === "pickup" ? "is-selected" : ""}>
                <input type="radio" name="fulfillment" value="pickup" checked={fulfillment === "pickup"} onChange={() => setFulfillment("pickup")} />
                <Storefront size={24} weight="light" />
                <span><strong>{pickupLabel}</strong><small>We will email when your order is ready.</small></span>
                <b>Complimentary</b>
              </label>
              <label className={fulfillment === "delivery" ? "is-selected" : ""}>
                <input type="radio" name="fulfillment" value="delivery" checked={fulfillment === "delivery"} onChange={() => setFulfillment("delivery")} />
                <Truck size={24} weight="light" />
                <span><strong>New Providence delivery</strong><small>Your Bahamian delivery address is collected securely next.</small></span>
                <b>{formatMoney(deliveryFee)}</b>
              </label>
            </div>
          </section>

          <section className="checkout-section checkout-payment" aria-labelledby="checkout-payment-title">
            <div className="checkout-section-heading"><span>03</span><div><h2 id="checkout-payment-title">Secure payment</h2><p>Payment details are entered on the hosted payment page and never touch this website.</p></div></div>
            <div className="checkout-security"><LockKey size={20} /><span>Encrypted payment handoff</span></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary button-full" type="submit" disabled={submitting}>
              {submitting ? "Opening secure payment" : "Continue to secure payment"}<ArrowRight size={17} />
            </button>
          </section>
        </form>

        <aside className="checkout-summary" aria-label="Order summary">
          <div className="checkout-summary-head"><h2>Order summary</h2><Link href="/shop">Continue shopping</Link></div>
          <div className="checkout-summary-lines">
            {items.map(({ product, quantity }) => (
              <article key={product.id}>
                <div className="checkout-summary-image"><Image src={product.image} alt="" fill sizes="92px" /></div>
                <div><p>{product.brand}</p><h3>{product.name}</h3><span>Quantity {quantity}</span></div>
                <strong>{formatMoney(product.price * quantity)}</strong>
              </article>
            ))}
          </div>
          <dl className="checkout-totals">
            <div><dt>Subtotal</dt><dd>{formatMoney(subtotal)}</dd></div>
            {tax > 0 && <div><dt>VAT</dt><dd>{formatMoney(tax)}</dd></div>}
            <div><dt>{fulfillment === "delivery" ? "Delivery" : "Pickup"}</dt><dd>{shipping > 0 ? formatMoney(shipping) : "Complimentary"}</dd></div>
            <div className="checkout-total"><dt>Total</dt><dd>{formatMoney(total)}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
