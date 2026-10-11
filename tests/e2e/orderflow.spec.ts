import { expect, test } from "@playwright/test";

test("register, browse, add to cart, and place an order", async ({ page, request }) => {
  const email = `buyer-${Date.now()}@example.com`;
  const password = "OrderFlow-Test-Password-2026";
  const api = process.env.API_BASE_URL ?? "http://localhost:30000/api";

  const registration = await request.post(`${api}/auth/register`, { data: { email, password } });
  expect(registration.status()).toBe(201);

  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("status")).toContainText("Welcome back");

  const item = page.locator("article.product").first();
  await expect(item).toBeVisible();
  await item.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("status")).toContainText("added to your cart");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByRole("status")).toContainText("confirmed");
  await page.getByRole("button", { name: "View orders" }).click();
  const orderCard = page.locator("article.order-card").first();
  await expect(orderCard).toBeVisible();
  await expect(orderCard).toContainText("CONFIRMED");
  await expect(orderCard).toContainText("OrderFlow Demo Notebook");
  await expect(orderCard).toContainText("Qty 1");
  await expect(orderCard.locator(".order-card-header h3")).toHaveText(/^#[0-9a-f]{8}$/i);
  await expect(orderCard).toContainText("INR 4999.00");
  await expect(orderCard.locator(".order-summary > span")).not.toBeEmpty();
  await expect(orderCard.locator("pre")).toHaveCount(0);
});
