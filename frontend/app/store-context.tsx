"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";

const API = "/api";

export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  priceMinor: number;
  currency: string;
  stock: number;
};

export type OrderItem = {
  product_id: string;
  name: string;
  quantity: number;
  unit_price_minor: number;
};

export type Order = {
  id: string;
  status: string;
  total_minor: number;
  currency: string;
  created_at: string;
  items: OrderItem[];
};

type StoreValue = {
  products: Product[];
  cart: Record<string, number>;
  cartCount: number;
  token: string;
  email: string;
  notice: string;
  loadingProducts: boolean;
  setNotice: (message: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  placeOrder: () => Promise<string>;
  request: (path: string, options?: RequestInit, authenticated?: boolean) => Promise<Response>;
};

const StoreContext = createContext<StoreValue | null>(null);

async function messageFrom(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  if (response.ok) return body;
  throw new Error(body.error?.message ?? body.detail ?? fallback);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const checkoutKey = useRef<string | null>(null);

  const request = async (path: string, options: RequestInit = {}, authenticated = false) => {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has("content-type")) headers.set("content-type", "application/json");
    if (authenticated && token) headers.set("authorization", `Bearer ${token}`);
    return fetch(`${API}${path}`, { ...options, headers });
  };

  useEffect(() => {
    setToken(localStorage.getItem("orderflow-token") ?? "");
    setEmail(localStorage.getItem("orderflow-email") ?? "");
    void fetch(`${API}/products`)
      .then((response) => messageFrom(response, "Unable to load products."))
      .then((items) => setProducts(items))
      .catch(() => setNotice("The shop is having trouble connecting. Please try again shortly."))
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    if (!token) {
      setCart({});
      return;
    }
    void request("/cart", {}, true)
      .then((response) => messageFrom(response, "Unable to load your cart."))
      .then((body) => setCart(Object.fromEntries(body.items.map((item: { product_id: string; quantity: number }) => [item.product_id, item.quantity]))))
      .catch(() => setNotice("We couldn't load your saved cart."));
  }, [token]);

  const cartCount = useMemo(() => Object.values(cart).reduce((sum, quantity) => sum + quantity, 0), [cart]);

  async function signIn(userEmail: string, password: string) {
    const response = await request("/auth/login", { method: "POST", body: JSON.stringify({ email: userEmail, password }) });
    const body = await messageFrom(response, "Unable to sign in.");
    localStorage.setItem("orderflow-token", body.access_token);
    localStorage.setItem("orderflow-email", body.user.email);
    setToken(body.access_token);
    setEmail(body.user.email);
    setNotice(`Welcome back, ${body.user.email}.`);
  }

  async function register(userEmail: string, password: string) {
    const response = await request("/auth/register", { method: "POST", body: JSON.stringify({ email: userEmail, password }) });
    await messageFrom(response, "Unable to create your account.");
    setNotice("Your account is ready. Sign in to continue.");
  }

  function signOut() {
    localStorage.removeItem("orderflow-token");
    localStorage.removeItem("orderflow-email");
    setToken("");
    setEmail("");
    setNotice("You have signed out.");
  }

  async function updateCart(next: Record<string, number>) {
    if (!token) throw new Error("Sign in to save items to your cart.");
    const response = await request("/cart", {
      method: "PUT",
      body: JSON.stringify({ items: Object.entries(next).map(([productId, quantity]) => ({ productId, quantity })) }),
    }, true);
    const body = await messageFrom(response, "Unable to update your cart.");
    const confirmed = Object.fromEntries(body.items.map((item: { product_id: string; quantity: number }) => [item.product_id, item.quantity]));
    setCart(confirmed);
    checkoutKey.current = null;
  }

  async function addToCart(productId: string, quantity = 1) {
    const next = { ...cart, [productId]: (cart[productId] ?? 0) + quantity };
    await updateCart(next);
    setNotice("Added to your cart.");
  }

  async function setQuantity(productId: string, quantity: number) {
    const next = { ...cart };
    if (quantity <= 0) delete next[productId];
    else next[productId] = quantity;
    await updateCart(next);
  }

  async function removeFromCart(productId: string) {
    await setQuantity(productId, 0);
    setNotice("Item removed from your cart.");
  }

  async function placeOrder() {
    if (!token) throw new Error("Sign in before placing your order.");
    if (!cartCount) throw new Error("Your cart is empty.");
    checkoutKey.current ??= crypto.randomUUID();
    const response = await request("/orders", {
      method: "POST",
      headers: { "Idempotency-Key": checkoutKey.current },
      body: JSON.stringify({ items: Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity })) }),
    }, true);
    const body = await messageFrom(response, "Unable to place your order.");
    setCart({});
    checkoutKey.current = null;
    setNotice(`Order ${body.id.slice(0, 8)} is ${body.status.toLowerCase()}.`);
    return body.id as string;
  }

  const value: StoreValue = {
    products, cart, cartCount, token, email, notice, loadingProducts, setNotice,
    signIn, register, signOut, addToCart, setQuantity, removeFromCart, placeOrder, request,
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}

export function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amountMinor / 100);
}
