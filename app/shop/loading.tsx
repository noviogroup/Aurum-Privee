const collectionPlaceholders = Array.from({ length: 8 }, (_, index) => index);

export default function ShopLoading() {
  return (
    <section className="shop-loading shop-page section-shell page-top" aria-busy="true" aria-label="Loading fragrance collection">
      <p className="sr-only" role="status">Loading the fragrance collection.</p>
      <div className="shop-loading-hero" aria-hidden="true">
        <span className="loading-block loading-block-copy" />
        <span className="loading-block loading-block-media" />
      </div>
      <div className="shop-loading-tools" aria-hidden="true">
        <span className="loading-line loading-line-wide" />
        <span className="loading-line" />
      </div>
      <div className="shop-loading-grid" aria-hidden="true">
        {collectionPlaceholders.map((placeholder) => (
          <div className="shop-loading-card" key={placeholder}>
            <span className="loading-block" />
            <span className="loading-line" />
            <span className="loading-line loading-line-short" />
          </div>
        ))}
      </div>
    </section>
  );
}
