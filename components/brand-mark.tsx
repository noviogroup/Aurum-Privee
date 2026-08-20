export function BrandMark({ full = false }: { full?: boolean }) {
  return (
    <span className={`brand-mark${full ? " brand-mark-full" : ""}`} aria-hidden="true">
      <span className="brand-mark-name">AURUM PRIVÉE</span>
      {full && <span className="brand-mark-device"><i /><b /><i /></span>}
      {full && <span className="brand-mark-tagline">Exceptional fragrance. Without boundaries.</span>}
    </span>
  );
}
