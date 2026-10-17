import { expect, test } from "@playwright/test";

test("register, browse, add to cart, and place an order", async ({ page, request }) => {
  const email = `buyer-${Date.now()}@example.com`;
  const password = "OrderFlow-Test-Password-2026";
  const api = process.env.API_BASE_URL ?? "http://localhost:30000/api";

  const registration = await request.post(`${api}/auth/register`, { data: { email, password } });
  expect(registration.status()).toBe(201);

  await page.goto("/account");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("status")).toContainText("Welcome back");

  await page.goto("/shop");
  const item = page.locator("article.product-card").first();
  await expect(item).toBeVisible();
  const productName = await item.locator(".product-title").innerText();
  await item.getByRole("button", { name: `Add ${productName} to cart` }).click();
  await expect(page.getByRole("status")).toContainText(/added to your cart/i);

  await page.getByRole("link", { name: /Cart/ }).click();
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.getByText(productName)).toBeVisible();
  await page.getByRole("button", { name: /Place your order/ }).click();
  await expect(page.getByRole("status")).toContainText(/is confirmed/i);
  await expect(page.getByRole("heading", { name: "Thanks for your order." })).toBeVisible();

  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Your orders" }).click();
  const orderCard = page.locator(".order-list-card").first();
  await expect(orderCard).toBeVisible();
  await expect(orderCard).toContainText("CONFIRMED");
  await expect(orderCard).toContainText(productName);
  await orderCard.click();
  await expect(page.locator(".detail-item")).toContainText(productName);
  await expect(page.locator(".detail-item")).toContainText("Quantity 1");
  await expect(page.locator(".order-summary-panel")).toContainText("Total paid");
});
