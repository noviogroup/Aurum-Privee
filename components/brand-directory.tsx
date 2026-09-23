"use client";

import Link from "next/link";
import { useState } from "react";

export function BrandDirectory({ brands }: { brands: string[] }) {
  const [query, setQuery] = useState("");
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const filtered = brands.filter((brand) => normalize(brand).includes(normalize(query.trim())));
  const letters = [...new Set(filtered.map((brand) => brand[0].toUpperCase()))];
  return <>
    <div className="brand-directory-search">
      <label htmlFor="brand-query">Find a brand</label>
      <input id="brand-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. Dior or Tom Ford" autoComplete="off" />
      <p role="status">{filtered.length} {filtered.length === 1 ? "brand" : "brands"}</p>
    </div>
    <nav className="brand-alphabet" aria-label="Brand alphabet">
      {letters.map((letter) => <a key={letter} href={`#brands-${letter}`}>{letter}</a>)}
    </nav>
    {letters.map((letter) => <section className="brand-letter-group" key={letter} aria-labelledby={`brands-${letter}`}>
      <h2 id={`brands-${letter}`}>{letter}</h2>
      <ul>{filtered.filter((brand) => brand[0].toUpperCase() === letter).map((brand) => <li key={brand}><Link href={`/shop?brand=${encodeURIComponent(brand)}`}>{brand}<span aria-hidden="true">↗</span></Link></li>)}</ul>
    </section>)}
    {!filtered.length && <div className="catalog-empty"><h2>No matching brands.</h2><p>Try another spelling, or search the full catalogue by fragrance name.</p><button className="button button-secondary" onClick={() => setQuery("")}>Clear brand search</button></div>}
  </>;
}
