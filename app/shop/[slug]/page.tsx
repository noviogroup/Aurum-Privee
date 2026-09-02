import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Package } from "@phosphor-icons/react/dist/ssr";
import { AddToBag } from "@/components/add-to-bag";
import { ProductCard } from "@/components/product-card";
import { SaveButton } from "@/components/save-button";
import { formatMoney } from "@/lib/config";
import { getCatalogProductBySlug, getCatalogProducts } from "@/lib/catalog";
import { productStructuredData, serializeStructuredData } from "@/lib/product-structured-data";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} by ${product.brand}`,
      description: product.description,
      url: `/shop/${product.slug}`,
      images: [{ url: product.image, alt: product.imageAlt }],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);
  if (!product) notFound();
  const products = await getCatalogProducts();
  const related = products
    .filter((item) => item.family === product.family && item.id !== product.id)
    .sort((left, right) => Number(right.brand === product.brand) - Number(left.brand === product.brand))
    .slice(0, 4);
  const hasNotes = [...product.notes.top, ...product.notes.heart, ...product.notes.base].length > 0;

  return (
    <div className="product-page page-top">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredData(productStructuredData(product)) }}
      />
      <Link href="/shop" className="back-link"><ArrowLeft size={16} /> Back to fragrance</Link>
      <div className="product-detail">
        <div className="product-gallery">
          <Image src={product.image} alt={product.imageAlt} fill priority sizes="(max-width: 900px) calc(100vw - 48px), 660px" />
        </div>
        <div className="product-summary">
          <p className="product-brand">{product.brand}</p>
          <h1>{product.name}</h1>
          <p className="product-format">
            <span>{product.family}</span>
            <span>{product.concentration}</span>
            <span>{product.size}</span>
          </p>
          <strong className="detail-price">{formatMoney(product.price)}</strong>
          <p className="detail-description">{product.description}</p>
          <div className="product-purchase-actions">
            <AddToBag product={product} />
            <SaveButton productId={product.id} productName={product.name} detail />
          </div>
          <div className="availability"><Check size={18} /><span>{product.stock > 0 ? "Available for order" : "Currently unavailable"}</span></div>
          <div className="delivery-note"><Package size={21} weight="light" /><p><strong>Pickup or delivery</strong><br />Choose your preference during secure checkout.</p></div>
        </div>
      </div>
      {hasNotes && (
        <section className="scent-profile section-shell" aria-labelledby="scent-profile-title">
          <header className="scent-profile-intro">
            <h2 id="scent-profile-title">Fragrance notes</h2>
            <p>See how this composition develops from its opening notes through its lasting base.</p>
          </header>
          <div className="scent-profile-notes">
            <article><span>Top notes</span><h3>{product.notes.top.join(", ")}</h3></article>
            <article><span>Middle notes</span><h3>{product.notes.heart.join(", ")}</h3></article>
            <article><span>Base notes</span><h3>{product.notes.base.join(", ")}</h3></article>
          </div>
          {product.detailsSource && (
            <a className="scent-profile-source" href={product.detailsSource.url} target="_blank" rel="noreferrer">
              Composition verified by {product.detailsSource.label}
            </a>
          )}
        </section>
      )}
      {related.length > 0 && (
        <section className="related section-shell">
          <h2>You may also like</h2>
          <div className="related-grid">{related.map((item) => <ProductCard product={item} key={item.id} />)}</div>
        </section>
      )}
    </div>
  );
}
