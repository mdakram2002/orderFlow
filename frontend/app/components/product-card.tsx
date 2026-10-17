"use client";

import Link from "next/link";
import { Product, formatMoney, useStore } from "../store-context";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { addToCart, token, setNotice } = useStore();
  const theme = index % 4;
  return <article className="product-card">
    <Link href={`/products/${product.id}`} className={`product-visual visual-${theme}`} aria-label={`View ${product.name}`}>
      <span className="visual-orbit orbit-one"/><span className="visual-orbit orbit-two"/>
      <span className="visual-label">{product.category || "CURATED FIND"}</span>
      <span className="visual-letter">{product.name.slice(0, 1).toUpperCase()}</span>
      <span className="visual-spark">✳</span>
    </Link>
    <div className="product-info">
      <div className="product-meta"><span>{product.category || "Everyday essentials"}</span><span className={product.stock > 0 ? "stock-ok" : "stock-out"}>{product.stock > 0 ? "In stock" : "Sold out"}</span></div>
      <Link className="product-title" href={`/products/${product.id}`}>{product.name}</Link>
      <p className="product-description">{product.description || "A well-made favorite for everyday living."}</p>
      <div className="product-card-bottom"><strong>{formatMoney(product.priceMinor, product.currency)}</strong><button aria-label={`Add ${product.name} to cart`} disabled={product.stock < 1 || !token} onClick={() => void addToCart(product.id).catch((error) => setNotice(error instanceof Error ? error.message : "Unable to add this item."))}>+</button></div>
    </div>
  </article>;
}
