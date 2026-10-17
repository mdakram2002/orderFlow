"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Order, formatMoney, useStore } from "../../store-context";

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { request, token, setNotice } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!token || !id) { setLoading(false); return; }
    let active = true;
    void request(`/orders/${encodeURIComponent(id)}`, {}, true).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error?.message ?? body.detail ?? "Unable to load this order.");
      if (active) setOrder(body);
    }).catch((error) => { if (active) setNotice(error instanceof Error ? error.message : "Unable to load this order."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, token]);

  if (!token) return <section className="empty-shop"><span>⌑</span><h3>Sign in to see your order.</h3><Link className="button button-dark" href="/account">Go to your account <span>→</span></Link></section>;
  if (loading) return <div className="loading-line">Loading your order…</div>;
  if (!order) return <section className="empty-shop"><span>⌕</span><h3>We couldn’t find that order.</h3><p>It may have been removed or the link may be incorrect.</p><Link className="button button-dark" href="/orders">Back to orders <span>→</span></Link></section>;

  const uncertain = order.status === "PAYMENT_OUTCOME_UNKNOWN" || order.status === "PAYMENT_PROCESSING";
  return <><div className="breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/orders">Your orders</Link><span>/</span><span>#{order.id.slice(0, 8).toUpperCase()}</span></div><section className="page-heading order-detail-heading"><div><p className="eyebrow">ORDER DETAILS</p><h1>Thanks for your order.</h1><p>Placed {new Date(order.created_at).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}</p></div><span className={`status-chip status-${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span></section>
    {uncertain && <div className="order-alert"><span>◷</span><div><strong>We’re confirming your payment.</strong><p>Your items are safely reserved. This page will show the confirmed order status once we hear back.</p></div></div>}
    <div className="detail-layout"><section className="detail-items"><div className="cart-lines-heading"><strong>In your order</strong><span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span></div>{order.items.map((item, index) => <article className="detail-item" key={`${item.product_id}-${index}`}><div className={`cart-thumb visual-${index % 4}`}><span>{item.name.slice(0, 1).toUpperCase()}</span></div><div><p className="eyebrow">ORDERFLOW FIND</p><h2>{item.name}</h2><span>Quantity {item.quantity}</span></div><strong>{formatMoney(item.unit_price_minor * item.quantity, order.currency)}</strong></article>)}<Link className="text-link back-to-shop" href="/shop">← Keep exploring</Link></section><aside className="order-summary-panel detail-summary"><p className="eyebrow">ORDER #{order.id.slice(0, 8).toUpperCase()}</p><h2>Order summary</h2><div className="summary-row"><span>Items</span><strong>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</strong></div><div className="summary-row"><span>Delivery</span><strong className="free-delivery">On us</strong></div><div className="summary-total"><span>Total paid</span><strong>{formatMoney(order.total_minor, order.currency)}</strong></div><p className="order-detail-note">This order is associated with your OrderFlow account. You can come back here any time from your order history.</p><Link href="/orders" className="button button-quiet full-button">View all orders <span>→</span></Link></aside></div>
  </>;
}
