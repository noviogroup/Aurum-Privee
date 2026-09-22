import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Package } from "@phosphor-icons/react/dist/ssr";
import { AddToBag } from "@/components/add-to-bag";
import { ProductCard } from "@/components/product-card";
import { ProductVariantOptions } from "@/components/product-variant-options";
import { SaveButton } from "@/components/save-button";
import { formatMoney } from "@/lib/config";
import { getCatalogProductBySlug, getCatalogProducts } from "@/lib/catalog";
import { rankRelatedProducts } from "@/lib/product-relationships";
import { getProductVariantFamily, getProductVariants } from "@/lib/product-variants";
import { productStructuredData, serializeStructuredData } from "@/lib/product-structured-data";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);
  if (!product) return {};
  const family = getProductVariantFamily(product.id);
  const brand = product.wixProductId ? product.brand : family?.brand || product.brand;
  const name = product.wixProductId ? product.name : family?.name || product.name;
  return {
    title: name,
    description: product.description,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${name} by ${brand}`,
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
  const variantFamily = getProductVariantFamily(product.id);
  const variants = getProductVariants(product.id, products);
  const related = rankRelatedProducts(product, products);
  const hasNotes = [...product.notes.top, ...product.notes.heart, ...product.notes.base].length > 0;
  const productFormat = [
    product.family,
    product.concentration !== "Fine fragrance" ? product.concentration : "",
    product.size !== "Size not specified" ? product.size : "",
  ].filter(Boolean);
  const noteSections = [
    { label: product.notes.heart.length || product.notes.base.length ? "Top notes" : "Key notes", notes: product.notes.top },
    { label: "Middle notes", notes: product.notes.heart },
    { label: "Base notes", notes: product.notes.base },
  ].filter((section) => section.notes.length > 0);

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
          <h1><span className="product-brand">{product.wixProductId ? product.brand : variantFamily?.brand || product.brand}</span>{product.wixProductId ? product.name : variantFamily?.name || product.name}</h1>
          <p className="product-format">
            {productFormat.map((detail) => <span key={detail}>{detail}</span>)}
          </p>
          <div className="product-primary-purchase">
            <strong className="detail-price">{formatMoney(product.price)}</strong>
            <div className="product-purchase-actions">
              <AddToBag product={product} />
              <SaveButton productId={product.id} productName={product.name} detail />
            </div>
            <div className="availability"><Check size={18} /><span>{product.stock > 0 ? "Available for order" : "Currently unavailable"}</span></div>
          </div>
          <ProductVariantOptions current={product} variants={variants} />
          <p className="detail-description">{product.description}</p>
          <div className="delivery-note"><Package size={21} weight="light" /><p><strong>Pickup or delivery</strong><br />Choose your preference during secure checkout.</p></div>
        </div>
      </div>
      {hasNotes && (
        <section className="scent-profile section-shell" aria-labelledby="scent-profile-title">
          <header className="scent-profile-intro">
            <h2 id="scent-profile-title">Fragrance notes</h2>
            <p>See how this composition develops from its opening notes through its lasting base.</p>
          </header>
          <div className={`scent-profile-notes scent-profile-notes-${noteSections.length}`}>
            {noteSections.map((section) => <article key={section.label}><span>{section.label}</span><h3>{section.notes.join(", ")}</h3></article>)}
          </div>
          {product.detailsSource && (
            <a className="scent-profile-source" href={product.detailsSource.url} target="_blank" rel="noreferrer">
              Composition verified by {product.detailsSource.label}
            </a>
          )}
        </section>
      )}
      {related.length > 0 && (
        <section className="related section-shell" aria-labelledby="related-title">
          <header className="related-heading">
            <div>
              <h2 id="related-title">You may also like</h2>
            </div>
            <p>Thoughtfully connected through fragrance profile, audience, house, format and price.</p>
          </header>
          <div className="related-grid">
            {related.map((relationship) => (
              <div className="related-card" key={relationship.product.id}>
                <p className="related-match"><span>Why it connects</span>{relationship.primaryReason}</p>
                <ProductCard product={relationship.product} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
