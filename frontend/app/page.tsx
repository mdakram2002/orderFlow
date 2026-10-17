"use client";

import Link from "next/link";
import { ProductCard } from "./components/product-card";
import { useStore } from "./store-context";

const collections = [
  { title: "Tech that fits your life", category: "Electronics", note: "Smart picks, made simple", style: "collection-tech", symbol: "◉" },
  { title: "Make home feel more you", category: "Home", note: "Little details, big comfort", style: "collection-home", symbol: "⌂" },
  { title: "Everyday, elevated", category: "Accessories", note: "The finishing touches", style: "collection-style", symbol: "✳" },
];

export default function Home() {
  const { products, loadingProducts } = useStore();
  return <>
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow-pill"><i /> THE BETTER WAY TO BROWSE</span>
        <h1>Find your next<br /><em>everyday favorite.</em></h1>
        <p>Good design, useful things, and little discoveries. Shop a considered collection for all the ways you live.</p>
        <div className="hero-actions"><Link className="button button-dark" href="/shop">Explore the shop <span>↗</span></Link><Link className="text-link" href="/about">Our approach <span>→</span></Link></div>
        <div className="hero-trust"><div className="avatar-stack"><i>J</i><i>M</i><i>A</i><i>+</i></div><span><strong>Made for your everyday</strong><small>A little more joy in every delivery</small></span></div>
      </div>
      <div className="hero-art" aria-label="Featured everyday essentials">
        <div className="hero-art-glow"/><div className="hero-sun"/><div className="hero-shape hero-shape-one"/><div className="hero-shape hero-shape-two"/><div className="hero-product"><div className="hero-product-top"/><div className="hero-product-label">GOOD<br />THINGS<br /><b>INSIDE</b></div></div>
        <span className="art-caption caption-top">CURATED FOR YOU <b>✳</b></span><span className="art-caption caption-bottom">THE LITTLE THINGS<br />MAKE THE DAY.</span>
      </div>
    </section>

    <div className="benefit-strip"><div><span>✦</span><p><strong>Thoughtfully chosen</strong><small>Quality in every detail</small></p></div><div><span>↗</span><p><strong>Easy, secure checkout</strong><small>A smoother way to shop</small></p></div><div><span>♡</span><p><strong>Here when you need us</strong><small>Shopping made personal</small></p></div></div>

    <section className="section-block collection-section">
      <div className="section-title-row"><div><p className="eyebrow">A GOOD PLACE TO START</p><h2>Shop by mood</h2></div><Link className="text-link" href="/shop">All collections <span>→</span></Link></div>
      <div className="collection-grid">{collections.map((item) => <Link className={`collection-card ${item.style}`} key={item.category} href={`/shop?category=${item.category}`}><span className="collection-symbol">{item.symbol}</span><div><small>{item.note}</small><h3>{item.title}</h3><span className="collection-link">Explore collection <b>↗</b></span></div></Link>)}</div>
    </section>

    <section className="section-block featured-section">
      <div className="section-title-row"><div><p className="eyebrow">THE GOOD STUFF</p><h2>Popular right now</h2><p className="section-subtitle">A few things our customers can’t stop coming back to.</p></div><Link className="text-link" href="/shop">Shop everything <span>→</span></Link></div>
      {loadingProducts ? <div className="loading-line">Finding the good stuff…</div> : products.length ? <div className="product-grid">{products.slice(0, 4).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="empty-shop"><span>✳</span><h3>Your next favorite is on its way.</h3><p>We’re getting the shelves ready. Check back soon.</p></div>}
    </section>

    <section className="story-banner"><div className="story-badge">A MORE HUMAN<br /><b>WAY TO SHOP</b></div><div><p className="eyebrow">MADE FOR REAL LIFE</p><h2>Less endless scrolling.<br /><em>More things you’ll love.</em></h2><p>We believe shopping should feel easy, useful, and a little inspiring. That’s why every find has a reason to be here.</p><Link href="/about" className="button button-light">Get to know us <span>↗</span></Link></div></section>
  </>;
}
