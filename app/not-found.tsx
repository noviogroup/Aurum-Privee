import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <section className="state-page section-shell" aria-labelledby="not-found-title">
      <div className="state-page-copy">
        <span className="state-page-code" aria-hidden="true">404</span>
        <h1 id="not-found-title">Page not found.</h1>
        <p>The address may be incomplete, or this fragrance may no longer be available.</p>
        <div className="state-page-actions">
          <Link className="button button-primary" href="/shop">
            Browse catalogue <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link className="text-link" href="/">Return home</Link>
        </div>
      </div>
      <figure className="state-page-media">
        <Image
          src="/images/campaign/oud-ritual.webp"
          alt="Golden fragrance bottle arranged with oud wood and a lantern"
          fill
          sizes="(max-width: 767px) calc(100vw - 32px), 56vw"
        />
      </figure>
    </section>
  );
}
