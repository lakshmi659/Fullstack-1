import { test, expect } from "@playwright/test";
import { BASE_URL, API_URL, ADMIN_USER, NORMAL_USER, BAD_USER, loginAs, logout, getToken } from "./helpers/auth";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.removeItem("jwt_token"));
    await page.goto(BASE_URL);
  });

  test("renders all expected elements", async ({ page }) => {
    await expect(page.locator(".login-title")).toContainText("Welcome back");
    await expect(page.locator("input[placeholder='admin']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    await expect(page.locator("button.btn")).toBeVisible();
  });

  test("submit button is disabled when fields are empty", async ({ page }) => {
    await expect(page.locator("button.btn")).toBeDisabled();
  });

  test("wrong credentials shows error banner", async ({ page }) => {
    await page.locator("input[placeholder='admin']").fill(BAD_USER.username);
    await page.locator("input[type='password']").fill(BAD_USER.password);
    await page.locator("button.btn").click();
    await expect(page.locator(".error-banner")).toBeVisible();
    await expect(page.locator(".login-title")).toBeVisible();
  });

  test("admin login shows dashboard", async ({ page }) => {
    await loginAs(page, ADMIN_USER);
    await expect(page.locator(".user-info .uname")).toContainText("admin");
    await expect(page.locator(".user-info .urole")).toContainText("admin");
  });

  test("regular user login shows dashboard", async ({ page }) => {
    await loginAs(page, NORMAL_USER);
    await expect(page.locator(".user-info .uname")).toContainText("user");
  });

  test("JWT token stored in localStorage after login", async ({ page }) => {
    await loginAs(page, ADMIN_USER);
    const token = await page.evaluate(() => localStorage.getItem("jwt_token"));
    expect(token).toBeTruthy();
    expect(token!.split(".")).toHaveLength(3);
  });

  test("logout clears token and returns to login page", async ({ page }) => {
    await loginAs(page, ADMIN_USER);
    await logout(page);
    const token = await page.evaluate(() => localStorage.getItem("jwt_token"));
    expect(token).toBeNull();
  });

  test("GET /auth/me returns 200 for admin", async ({ page }) => {
    const token = await getToken(page, ADMIN_USER);
    const res = await page.request.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.user).toBe("admin");
  });

  test("GET /auth/me returns 401 without token", async ({ page }) => {
    const res = await page.request.get(`${API_URL}/auth/me`);
    expect(res.status()).toBe(401);
  });

  test("GET /auth/admin-only returns 403 for regular user", async ({ page }) => {
    const token = await getToken(page, NORMAL_USER);
    const res = await page.request.get(`${API_URL}/auth/admin-only`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });
});