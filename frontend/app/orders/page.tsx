"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Order, formatMoney, useStore } from "../store-context";

export default function OrdersPage() {
  const { request, token, setNotice } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let active = true;
    void request("/orders", {}, true).then(async (response) => {
      const body = await response.json().catch(() => []);
      if (!response.ok) throw new Error(body.error?.message ?? body.detail ?? "Unable to load your orders.");
      if (active) setOrders(body);
    }).catch((error) => { if (active) setNotice(error instanceof Error ? error.message : "Unable to load your orders."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  return <><div className="breadcrumb"><Link href="/">Home</Link><span>/</span><span>Your orders</span></div><section className="page-heading"><div><p className="eyebrow">YOUR ORDERFLOW</p><h1>Order history</h1><p>All the good things you’ve brought home.</p></div><Link className="text-link" href="/shop">Find something new <span>→</span></Link></section>
    {!token ? <div className="empty-shop"><span>⌑</span><h3>Your orders are waiting for you.</h3><p>Sign in to see what you’ve ordered.</p><Link className="button button-dark" href="/account">Sign in <span>→</span></Link></div> : loading ? <div className="loading-line">Finding your orders…</div> : orders.length ? <section className="orders-grid">{orders.map((order) => <Link className="order-list-card" href={`/orders/${order.id}`} key={order.id}><div className="order-list-top"><span className="order-number">ORDER #{order.id.slice(0, 8).toUpperCase()}</span><span className={`status-chip status-${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span></div><p className="order-date">Placed {new Date(order.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p><div className="order-preview"><div className="order-preview-mark">{order.items[0]?.name.slice(0, 1).toUpperCase() ?? "o"}</div><div><strong>{order.items[0]?.name ?? "OrderFlow purchase"}</strong><span>{order.items.length > 1 ? `and ${order.items.length - 1} more ${order.items.length === 2 ? "item" : "items"}` : `Quantity ${order.items[0]?.quantity ?? 1}`}</span></div><b>→</b></div><div className="order-list-bottom"><span>Order total</span><strong>{formatMoney(order.total_minor, order.currency)}</strong></div></Link>)}</section> : <div className="empty-shop"><span>✳</span><h3>Nothing ordered just yet.</h3><p>Your first good find is waiting.</p><Link className="button button-dark" href="/shop">Explore the shop <span>↗</span></Link></div>}
  </>;
}
