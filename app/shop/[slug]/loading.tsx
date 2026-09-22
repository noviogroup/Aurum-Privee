export default function ProductLoading() {
  return (
    <section className="product-loading product-page page-top" aria-busy="true" aria-label="Loading fragrance details">
      <p className="sr-only" role="status">Loading fragrance details.</p>
      <span className="product-loading-back loading-line" aria-hidden="true" />
      <div className="product-loading-detail" aria-hidden="true">
        <span className="loading-block product-loading-media" />
        <div className="product-loading-copy">
          <span className="loading-line loading-line-short" />
          <span className="loading-line product-loading-title" />
          <span className="loading-line loading-line-wide" />
          <span className="loading-line loading-line-short" />
          <span className="loading-block product-loading-button" />
        </div>
      </div>
    </section>
  );
}
