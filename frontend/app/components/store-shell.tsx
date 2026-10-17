"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { StoreProvider, useStore } from "../store-context";
import { SiteHeader } from "./site-header";

export function StoreShell({ children }: { children: ReactNode }) {
  return <StoreProvider><StoreFrame>{children}</StoreFrame></StoreProvider>;
}

function StoreFrame({ children }: { children: ReactNode }) {
  const { notice, setNotice } = useStore();
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5200);
    return () => window.clearTimeout(timer);
  }, [notice, setNotice]);
  return <><SiteHeader />{notice && <div className="toast" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}>×</button></div>}<main className="page-content">{children}</main><footer className="site-footer"><div className="footer-top"><Link className="brand footer-brand" href="/"><span className="brand-icon">o</span><span>orderflow<span className="brand-dot">.</span></span></Link><p>Good things, delivered with care.</p><div className="footer-links"><Link href="/about">About</Link><Link href="/shop">Shop</Link><Link href="/orders">Orders</Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} OrderFlow</span><span>Thoughtful finds. A smoother way to shop.</span></div></footer></>;
}
