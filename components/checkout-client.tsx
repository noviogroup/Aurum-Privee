"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, GlobeHemisphereWest, LockKey, Package, Storefront, Truck, UserCircle } from "@phosphor-icons/react";
import { useCart } from "@/components/cart-provider";
import {
  CheckoutResponseBody,
  checkoutNetworkError,
  checkoutRedirectUrlFromBody,
  checkoutResponseError,
} from "@/lib/checkout-response";
import { ClientRequestTimeoutError, ClientResponseFormatError, requestJson } from "@/lib/client-json-request";
import { formatMoney } from "@/lib/config";
import { productVariantLabel } from "@/lib/product-variants";
import { calculateAddedTax } from "@/lib/tax";

type Fulfillment = "pickup" | "delivery";

type CheckoutClientProps = {
  initialEmail: string;
  paymentReady: boolean;
  checkoutCancelled: boolean;
  pickupLabel: string;
  deliveryFee: number;
  commerceProvider: "legacy" | "wix";
};

export function CheckoutClient({ initialEmail, paymentReady, checkoutCancelled, pickupLabel, deliveryFee, commerceProvider }: CheckoutClientProps) {
  const { items, hydrated } = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState("");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("pickup");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const requestPending = useRef(false);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => () => requestController.current?.abort(), []);

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = items.reduce((sum, item) => sum + calculateAddedTax(item.product.price * item.quantity, item.product.loyverseTaxes), 0);
  const shipping = commerceProvider === "wix" ? 0 : fulfillment === "delivery" ? deliveryFee : 0;
  const total = subtotal + (commerceProvider === "legacy" ? tax : 0) + shipping;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestPending.current) return;
    setError("");
    if (!paymentReady) {
      setError("The checkout experience is ready, but secure payment still needs the production payment, email and inventory credentials.");
      return;
    }
    requestPending.current = true;
    const controller = new AbortController();
    requestController.current = controller;
    setSubmitting(true);
    try {
      const { response, data } = await requestJson<CheckoutResponseBody>("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          customer: commerceProvider === "legacy" ? { name, email, phone } : undefined,
          fulfillment,
        }),
        signal: controller.signal,
      });
      window.location.assign(checkoutRedirectUrlFromBody(response, data));
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(caught instanceof ClientRequestTimeoutError
        ? "Checkout took too long. Check your connection and try again."
        : caught instanceof ClientResponseFormatError
          ? checkoutResponseError
          : caught instanceof TypeError
            ? checkoutNetworkError
            : caught instanceof Error ? caught.message : checkoutNetworkError);
      setSubmitting(false);
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        requestPending.current = false;
      }
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
          <p>{commerceProvider === "wix" ? "Review your selection, then continue to Aurum Privée’s secure checkout." : "Complete your details, choose pickup or delivery, then continue to secure payment."}</p>
        </div>
        <Link href="/account" className="checkout-account-link"><UserCircle size={20} />{initialEmail ? "Account connected" : "Sign in for faster checkout"}</Link>
      </header>

      {checkoutCancelled && (
        <div className="checkout-return-notice" role="status">
          <strong>Checkout wasn’t completed.</strong>
          <span>Your shopping bag is still saved. Review it whenever you’re ready to continue.</span>
        </div>
      )}

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submit} aria-busy={submitting}>
          {commerceProvider === "legacy" ? <section className="checkout-section" aria-labelledby="checkout-contact-title">
            <div className="checkout-section-heading"><div><h2 id="checkout-contact-title">Contact details</h2><p>Your receipt and order updates will be sent here.</p></div></div>
            <div className="checkout-fields">
              <label><span>Full name</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required minLength={2} maxLength={100} /></label>
              <label><span>Email</span><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required maxLength={320} /></label>
              <label className="checkout-field-wide"><span>Phone</span><input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" maxLength={40} placeholder="Optional" /></label>
            </div>
          </section> : (
            <section className="checkout-section" aria-labelledby="checkout-contact-title">
              <div className="checkout-section-heading"><div><h2 id="checkout-contact-title">Secure checkout</h2><p>Contact, delivery and payment details are collected securely on the next page.</p></div></div>
              <div className="checkout-security"><LockKey size={20} /><span>Your order details are transferred through an encrypted checkout handoff.</span></div>
            </section>
          )}

          {commerceProvider === "legacy" ? <section className="checkout-section" aria-labelledby="checkout-fulfillment-title">
            <div className="checkout-section-heading"><div><h2 id="checkout-fulfillment-title">Pickup or delivery</h2><p>Select how you would like to receive your order.</p></div></div>
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
                <span><strong>Delivery</strong><small>Your delivery address is collected securely next.</small></span>
                <b>{formatMoney(deliveryFee)}</b>
              </label>
            </div>
          </section> : (
            <section className="checkout-section" aria-labelledby="checkout-fulfillment-title">
              <div className="checkout-section-heading"><div><h2 id="checkout-fulfillment-title">Delivery or collection</h2><p>Available methods are calculated from your location in secure checkout.</p></div></div>
              <div className="checkout-security"><GlobeHemisphereWest size={20} /><span>Service availability is confirmed for your address.</span></div>
            </section>
          )}

          <section className="checkout-section checkout-payment" aria-labelledby="checkout-payment-title">
            <div className="checkout-section-heading"><div><h2 id="checkout-payment-title">{commerceProvider === "wix" ? "Payment and fulfillment" : "Secure payment"}</h2><p>{commerceProvider === "wix" ? "Choose an available payment method and confirm delivery or collection in secure checkout." : "Payment details are entered on the hosted payment page and never touch this website."}</p></div></div>
            <div className="checkout-security"><LockKey size={20} /><span>Encrypted payment handoff</span></div>
            {!paymentReady && (
              <p className="checkout-gate-notice" role="status">
                Checkout is currently closed while the catalog, locations and order confirmations complete acceptance testing.
              </p>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary button-full" type="submit" disabled={submitting || !paymentReady}>
              {submitting ? "Opening secure checkout" : paymentReady ? "Continue to secure checkout" : "Checkout opening after testing"}<ArrowRight size={17} />
            </button>
          </section>
        </form>

        <aside className="checkout-summary" aria-label="Order summary">
          <div className="checkout-summary-head"><h2>Order summary</h2><Link href="/shop">Continue shopping</Link></div>
          <div className="checkout-summary-lines">
            {items.map(({ product, quantity }) => (
              <article key={product.id}>
                <div className="checkout-summary-image"><Image src={product.image} alt="" fill sizes="92px" /></div>
                <div><p>{product.brand}</p><h3>{product.name}</h3><span>{productVariantLabel(product)} · Quantity {quantity}</span></div>
                <strong>{formatMoney(product.price * quantity)}</strong>
              </article>
            ))}
          </div>
          <dl className="checkout-totals">
            <div><dt>Subtotal</dt><dd>{formatMoney(subtotal)}</dd></div>
            {commerceProvider === "legacy" && tax > 0 && <div><dt>VAT</dt><dd>{formatMoney(tax)}</dd></div>}
            <div><dt>{commerceProvider === "wix" ? "Taxes & fulfillment" : fulfillment === "delivery" ? "Delivery" : "Pickup"}</dt><dd>{commerceProvider === "wix" ? "Calculated next" : shipping > 0 ? formatMoney(shipping) : "Complimentary"}</dd></div>
            <div className="checkout-total"><dt>{commerceProvider === "wix" ? "Items total" : "Total"}</dt><dd>{formatMoney(total)}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
