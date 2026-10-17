"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductCard } from "../../components/product-card";
import { Product, formatMoney, useStore } from "../../store-context";

export default function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { products, loadingProducts, request, addToCart, setNotice } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fromList = products.find((item) => item.id === id);
    if (fromList) { setProduct(fromList); setLoading(false); return; }
    if (loadingProducts) return;
    let active = true;
    void request(`/products/${encodeURIComponent(id)}`).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error?.message ?? body.detail ?? "Product not found.");
      if (active) setProduct(body);
    }).catch(() => { if (active) setProduct(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, products, loadingProducts]);

  if (loading) return <div className="loading-line">Finding your item…</div>;
  if (!product) return <section className="empty-shop"><span>⌕</span><h3>We couldn’t find that product.</h3><Link className="button button-dark" href="/shop">Back to the shop <span>→</span></Link></section>;
  const related = products.filter((item) => item.id !== product.id && item.category === product.category).slice(0, 3);

  return <><div className="breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/shop">Shop</Link><span>/</span><span>{product.name}</span></div><section className="product-detail"><div className={`product-detail-art visual-${product.id.charCodeAt(0) % 4}`}><span className="visual-orbit orbit-one"/><span className="visual-orbit orbit-two"/><span className="visual-label">ORDERFLOW EDIT</span><span className="detail-product-letter">{product.name.slice(0, 1).toUpperCase()}</span><span className="detail-art-star">✳</span></div><div className="product-detail-info"><p className="eyebrow">{product.category || "THOUGHTFULLY CHOSEN"}</p><h1>{product.name}</h1><div className="product-rating"><small>Thoughtfully chosen for everyday</small></div><strong className="detail-price">{formatMoney(product.priceMinor, product.currency)}</strong><p className="detail-description">{product.description || "A thoughtful everyday find, selected for good design, quality, and lasting usefulness."}</p><div className="detail-stock"><i className={product.stock > 0 ? "" : "out"}/>{product.stock > 0 ? `In stock · ${product.stock} available` : "Currently out of stock"}</div><button className="button button-dark add-detail" disabled={product.stock < 1} onClick={() => void addToCart(product.id).catch((error) => setNotice(error.message))}>Add to cart <span>+</span></button><div className="detail-perks"><p><span>↗</span><strong>Easy, secure checkout</strong></p><p><span>♡</span><strong>Useful everyday finds</strong></p><p><span>✳</span><strong>Thoughtfully selected</strong></p></div><div className="detail-description-block"><h2>The good details</h2><p>{product.description || "Made for the rhythm of real life. This is one of those simple, useful things that just feels right."}</p></div></div></section>{related.length > 0 && <section className="section-block related-section"><div className="section-title-row"><div><p className="eyebrow">MORE TO LOVE</p><h2>More good finds</h2></div><Link href="/shop" className="text-link">Shop all <span>→</span></Link></div><div className="product-grid">{related.map((item, index) => <ProductCard key={item.id} product={item} index={index} />)}</div></section>}</>;
}
