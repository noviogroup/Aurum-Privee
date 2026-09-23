"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowClockwise } from "@phosphor-icons/react";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="state-page section-shell" aria-labelledby="error-title">
      <div className="state-page-copy">
        <h1 id="error-title">We could not load this page.</h1>
        <p>Try again, or return to the catalogue to continue browsing.</p>
        <div className="state-page-actions">
          <button className="button button-primary" type="button" onClick={reset}>
            Try again <ArrowClockwise size={17} aria-hidden="true" />
          </button>
          <Link className="text-link" href="/shop">Browse catalogue</Link>
        </div>
      </div>
      <figure className="state-page-media">
        <Image
          src="/images/campaign/signature-consultation.webp"
          alt="Fragrance consultation with scent strips and selected bottles"
          fill
          sizes="(max-width: 767px) calc(100vw - 32px), 56vw"
        />
      </figure>
    </section>
  );
}
