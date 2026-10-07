"use client";

import { FormEvent, useEffect, useState } from "react";

const API = "/api";

type Product = {
  id: string;
  name: string;
  description: string;
  priceMinor: number;
  currency: string;
  stock: number;
};

type OrderItem = {
  name: string;
  quantity: number;
  unit_price_minor: number;
};

type Order = {
  id: string;
  status: string;
  total_minor: number;
  currency: string;
  created_at: string;
  items: OrderItem[];
};

function formatMoney(amountMinor: number, currency: string) {
  return `${currency} ${(amountMinor / 100).toFixed(2)}`;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");

  async function requestApi(
    path: string,
    options?: RequestInit
  ): Promise<Response | null> {
    try {
      return await fetch(`${API}${path}`, options);
    } catch {
      setMessage("OrderFlow API is unavailable. Check that the gateway is running.");
      return null;
    }
  }

  useEffect(() => {
    void requestApi("/products")
      .then((response) => response?.json())
      .then((result) => {
        if (result) setProducts(result);
      })
      .catch(() => setMessage("Unable to load products right now."));
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();

    const response = await requestApi("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response) return;

    const result = await response.json();

    if (!response.ok) {
      return setMessage(
        result.error?.message ?? result.detail ?? "Unable to sign in."
      );
    }

    setToken(result.access_token);
    setMessage(`Welcome back, ${result.user.email}.`);
  }

  async function register() {
    const response = await requestApi("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response) return;

    const result = await response.json();

    if (!response.ok) {
      return setMessage(
        result.error?.message ?? result.detail ?? "Unable to create account."
      );
    }

    setMessage("Your account has been created. You can now sign in.");
  }

  async function checkout() {
    if (!token) {
      return setMessage("Please sign in before placing an order.");
    }

    const response = await requestApi("/orders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: Object.entries(cart).map(([productId, quantity]) => ({
          productId,
          quantity,
        })),
      }),
    });
    if (!response) return;

    const result = await response.json();

    if (!response.ok) {
      return setMessage(
        result.error?.message ?? result.detail ?? "Unable to place order."
      );
    }

    setCart({});
    setMessage(`Order ${result.id} has been ${result.status.toLowerCase()}.`);
    await loadOrders();
  }

  async function addToCart(productId: string) {
    if (!token) {
      return setMessage("Please sign in before adding items to your cart.");
    }

    const response = await requestApi("/cart/items", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productId,
        quantity: 1,
      }),
    });
    if (!response) return;

    const result = await response.json();

    if (!response.ok) {
      return setMessage(result.error?.message ?? "Unable to update your cart.");
    }

    setCart(
      Object.fromEntries(
        result.items.map(
          (item: { product_id: string; quantity: number }) => [
            item.product_id,
            item.quantity,
          ]
        )
      )
    );

    setMessage("Item added to your cart.");
  }

  async function searchProducts(value: string) {
    setSearch(value);

    const response = await requestApi(
      `${API}/products/search?q=${encodeURIComponent(value)}`
    );

    if (response?.ok) {
      setProducts(await response.json());
    }
  }

  async function loadOrders() {
    const response = await requestApi("/orders", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    if (!response) return;

    const result = await response.json();

    if (response.ok) {
      setOrders(result);
    }
  }

  const cartItemCount = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0
  );

  return (
    <main className="shell">
      <header>
        <div>
          <p className="eyebrow">WELCOME TO ORDERFLOW</p>
          <h1>OrderFlow</h1>
        </div>

        <span className="badge">Shop online</span>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">DISCOVER · SHOP · ORDER</p>

          <h2>Everything you need, in one place.</h2>

          <p>
            Browse our products, add your favorites to the cart, and place
            your order securely.
          </p>
        </div>

        <form className="login" onSubmit={login}>
          <h3>Sign in to your account</h3>

          <input
            aria-label="Email"
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <input
            aria-label="Password"
            type="password"
            required
            minLength={10}
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <div className="auth-actions">
            <button type="submit">Sign in</button>

            <button
              className="secondary"
              type="button"
              onClick={register}
            >
              Create account
            </button>
          </div>
        </form>
      </section>

      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}

      <section className="catalog">
        <div className="section-heading">
          <div>
            <p className="eyebrow">OUR STORE</p>
            <h2>Browse products</h2>
          </div>

          <div className="catalog-tools">
            <input
              aria-label="Search products"
              placeholder="Search products"
              value={search}
              onChange={(event) =>
                void searchProducts(event.target.value)
              }
            />

            <span>
              {products.length} product{products.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {products.length === 0 ? (
          <p className="empty">
            No products are currently available.
          </p>
        ) : (
          <div className="grid">
            {products.map((product) => (
              <article className="product" key={product.id}>
                <div className="product-mark">
                  {product.name.slice(0, 1).toUpperCase()}
                </div>

                <p className="eyebrow">
                  {product.stock > 0
                    ? `${product.stock} available`
                    : "Out of stock"}
                </p>

                <h3>{product.name}</h3>

                <p>{product.description}</p>

                <div className="product-bottom">
                  <strong>
                    {product.currency}{" "}
                    {(product.priceMinor / 100).toFixed(2)}
                  </strong>

                  <button
                    disabled={product.stock < 1 || !token}
                    onClick={() => void addToCart(product.id)}
                  >
                    Add to cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="checkout">
        <div>
          <p className="eyebrow">YOUR CART</p>

          <h2>Ready to checkout?</h2>

          <p>
            {cartItemCount} item{cartItemCount !== 1 ? "s" : ""} in your cart
          </p>
        </div>

        <div className="actions">
          <button
            className="secondary"
            onClick={loadOrders}
            disabled={!token}
          >
            View orders
          </button>

          <button
            onClick={checkout}
            disabled={!Object.keys(cart).length || !token}
          >
            Place order
          </button>
        </div>
      </section>

      {orders.length > 0 && (
        <section className="orders-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ACCOUNT</p>
              <h2>Your orders</h2>
            </div>
          </div>

          <div className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order.id}>
                <div className="order-card-header">
                  <div>
                    <p className="eyebrow">ORDER</p>
                    <h3>#{order.id.slice(0, 8)}</h3>
                  </div>
                  <span
                    className={`order-status order-status-${order.status.toLowerCase()}`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="order-summary">
                  <span>
                    {new Date(order.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <strong>{formatMoney(order.total_minor, order.currency)}</strong>
                </div>

                <ul className="order-items">
                  {order.items.map((item, index) => (
                    <li className="order-item" key={`${order.id}-${index}`}>
                      <span className="order-item-name">
                        <strong>{item.name}</strong>
                        <small>Qty {item.quantity}</small>
                      </span>
                      <span className="order-item-price">
                        {formatMoney(item.unit_price_minor, order.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer>
        © {new Date().getFullYear()} OrderFlow. All rights reserved.
      </footer>
    </main>
  );
}