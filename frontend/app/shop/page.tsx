"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "../components/product-card";
import { useStore } from "../store-context";

export default function ShopPage() {
  const { products, loadingProducts } = useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All finds");
  const [sort, setSort] = useState("featured");
  const categories = useMemo(() => ["All finds", ...Array.from(new Set(products.map((product) => product.category).filter(Boolean)))], [products]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
    const requested = params.get("category");
    if (requested) setCategory(requested);
  }, []);

  const visible = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    const result = products.filter((product) => {
      const matchesCategory = category === "All finds" || product.category?.toLowerCase() === category.toLowerCase();
      const matchesQuery = !normalized || `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
    if (sort === "price-low") result.sort((a, b) => a.priceMinor - b.priceMinor);
    if (sort === "price-high") result.sort((a, b) => b.priceMinor - a.priceMinor);
    if (sort === "name") result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [products, query, category, sort]);

  return <>
    <section className="page-hero shop-hero"><div><p className="eyebrow">THE ORDERFLOW EDIT</p><h1>Find your kind<br /><em>of everyday.</em></h1><p>Useful, beautiful, and just a little unexpected. Good things start here.</p></div><div className="shop-hero-stamp"><span>✳</span><small>CURATED<br />WITH CARE</small></div></section>
    <div className="shop-layout">
      <aside className="shop-sidebar"><p className="eyebrow">BROWSE</p><h2>Collections</h2><div className="category-list">{categories.map((item) => <button key={item} className={category === item ? "category-active" : ""} onClick={() => setCategory(item)}>{item}<span>{item === "All finds" ? products.length : products.filter((p) => p.category?.toLowerCase() === item.toLowerCase()).length}</span></button>)}</div><div className="sidebar-note"><span>✦</span><strong>Good things,<br />chosen with care.</strong><p>Every product here has earned its place.</p><Link href="/about">Our story →</Link></div></aside>
      <section className="shop-results"><div className="shop-toolbar"><div><p className="eyebrow">{category.toUpperCase()}</p><h2>{query ? `Results for “${query}”` : category}</h2><span>{visible.length} {visible.length === 1 ? "find" : "finds"} to explore</span></div><label className="sort-control"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="name">Name</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></div>
        {loadingProducts ? <div className="loading-line">Loading the collection…</div> : visible.length ? <div className="product-grid">{visible.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="empty-shop"><span>⌕</span><h3>No finds just yet.</h3><p>Try another search or browse the full collection.</p><button className="button button-dark" onClick={() => { setQuery(""); setCategory("All finds"); }}>Clear filters</button></div>}
      </section>
    </div>
  </>;
}
