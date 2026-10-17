"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useStore, formatMoney } from "../store-context";

export default function CartPage() {
  const router = useRouter();
  const { products, cart, cartCount, token, setQuantity, removeFromCart, placeOrder, setNotice } = useStore();
  const [busy, setBusy] = useState(false);
  const lines = useMemo(() => Object.entries(cart).map(([id, quantity]) => ({ product: products.find((item) => item.id === id), id, quantity })).filter((line) => line.product), [cart, products]);
  const total = lines.reduce((sum, line) => sum + (line.product?.priceMinor ?? 0) * line.quantity, 0);
  const currency = lines[0]?.product?.currency ?? "INR";

  async function checkout() {
    setBusy(true);
    try {
      const orderId = await placeOrder();
      router.push(`/orders/${orderId}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to place your order.");
      if (!token) router.push("/account");
    } finally {
      setBusy(false);
    }
  }

  return <><div className="breadcrumb"><Link href="/">Home</Link><span>/</span><span>Your cart</span></div><section className="page-heading"><div><p className="eyebrow">YOUR GOOD FINDS</p><h1>Your cart<span className="heading-count">{cartCount}</span></h1><p>Take one last look. Your favorites are right here.</p></div><Link className="text-link" href="/shop">← Keep exploring</Link></section>
    {!cartCount ? <section className="empty-cart"><div className="empty-cart-icon">♡</div><h2>Your cart is taking a little breather.</h2><p>Find something useful, beautiful, or just a little bit you.</p><Link className="button button-dark" href="/shop">Explore the shop <span>↗</span></Link></section> : <div className="cart-layout"><section className="cart-lines"><div className="cart-lines-heading"><strong>Your items</strong><span>{cartCount} {cartCount === 1 ? "item" : "items"}</span></div>{lines.map(({ product, id, quantity }) => product && <article className="cart-line" key={id}><Link href={`/products/${id}`} className={`cart-thumb visual-${id.charCodeAt(0) % 4}`}><span>{product.name.slice(0, 1).toUpperCase()}</span></Link><div className="cart-item-info"><p className="eyebrow">{product.category || "ORDERFLOW FIND"}</p><Link href={`/products/${id}`}><h2>{product.name}</h2></Link><span className={product.stock > 0 ? "stock-ok" : "stock-out"}>{product.stock > 0 ? "In stock and ready" : "Currently unavailable"}</span><button className="remove-link" onClick={() => void removeFromCart(id).catch((error) => setNotice(error.message))}>Remove</button></div><div className="cart-quantity"><label htmlFor={`quantity-${id}`}>Qty</label><select id={`quantity-${id}`} value={quantity} onChange={(event) => void setQuantity(id, Number(event.target.value)).catch((error) => setNotice(error.message))}>{Array.from({ length: Math.min(10, Math.max(quantity, 5)) }, (_, index) => index + 1).map((qty) => <option key={qty} value={qty}>{qty}</option>)}</select></div><strong className="cart-line-price">{formatMoney(product.priceMinor * quantity, product.currency)}</strong></article>)}</section><aside className="order-summary-panel"><p className="eyebrow">THE LAST LITTLE STEP</p><h2>Order summary</h2><div className="summary-row"><span>Subtotal · {cartCount} items</span><strong>{formatMoney(total, currency)}</strong></div><div className="summary-row"><span>Delivery</span><strong className="free-delivery">On us</strong></div><div className="summary-total"><span>Estimated total</span><strong>{formatMoney(total, currency)}</strong></div><button className="button button-dark checkout-button" disabled={busy} onClick={() => void checkout()}>{busy ? "Placing your order…" : token ? "Place your order" : "Sign in to checkout"}<span>→</span></button><p className="secure-note"><span>✓</span> Secure checkout · Your details stay private</p><div className="summary-promise"><span>✳</span><p><strong>Need a hand?</strong><br />We’re here to make your shopping feel easy.</p></div></aside></div>}
  </>;
}
