"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../store-context";

export function SiteHeader() {
  const router = useRouter();
  const { cartCount, email } = useStore();
  const [query, setQuery] = useState("");

  function search(event: FormEvent) {
    event.preventDefault();
    router.push(`/shop${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
  }

  return (
    <header className="site-header">
      <div className="header-main">
        <Link href="/" className="brand" aria-label="OrderFlow home">
          <span className="brand-icon">o</span><span>orderflow<span className="brand-dot">.</span></span>
        </Link>
        <form className="global-search" role="search" onSubmit={search}>
          <label className="sr-only" htmlFor="site-search">Search the shop</label>
          <input id="site-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, brands and more" />
          <button aria-label="Search" type="submit"><SearchIcon /></button>
        </form>
        <div className="header-tools">
          <Link className="account-link" href="/account"><span className="tool-icon"><UserIcon /></span><span><small>{email ? "Welcome" : "Hello, sign in"}</small><strong>{email ? email.split("@")[0] : "Account"}</strong></span></Link>
          <Link className="cart-link" href="/cart" aria-label={`Cart, ${cartCount} items`}><span className="tool-icon cart-tool"><BagIcon /><i>{cartCount}</i></span><strong>Cart</strong></Link>
        </div>
      </div>
      <nav className="main-nav" aria-label="Main navigation">
        <Link href="/shop" className="nav-shop">Shop all</Link>
        <Link href="/shop?category=Electronics">Electronics</Link>
        <Link href="/shop?category=Home">Home & living</Link>
        <Link href="/shop?category=Accessories">Accessories</Link>
        <Link href="/about">About us</Link>
        <Link href="/orders" className="nav-orders">Your orders</Link>
      </nav>
    </header>
  );
}

function SearchIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2"/></svg>; }
function UserIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c.4-3.6 2.7-5.5 6.5-5.5s6.1 1.9 6.5 5.5"/></svg>; }
function BagIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>; }
