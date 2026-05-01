import { Page, expect } from "@playwright/test";

export const BASE_URL = "http://localhost:3000";
export const API_URL = "http://localhost:8000";
export const ADMIN_USER = { username: "admin", password: "admin123" };
export const NORMAL_USER = { username: "user", password: "user123" };
export const BAD_USER = { username: "ghost", password: "wrong" };

export async function loginAs(page: Page, credentials = ADMIN_USER) {
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.removeItem("jwt_token"));
  await page.goto(BASE_URL);
  await expect(page.locator(".login-title")).toBeVisible();
  await page.locator("input[placeholder='admin']").fill(credentials.username);
  await page.locator("input[type='password']").fill(credentials.password);
  await page.locator("button.btn").click();
  await expect(page.locator(".sidebar-logo .brand")).toBeVisible();
}

export async function logout(page: Page) {
  await page.locator("button.btn-logout").click();
  await expect(page.locator(".login-title")).toBeVisible();
}

export async function navigateTo(page: Page, tab: any) {
  const label = tab === "users" ? "Users" : tab === "files" ? "Files" : "Profile";
  await page.locator(`.nav-item:has-text("${label}")`).click();
  await expect(page.locator(".page-title")).toContainText(label, { ignoreCase: true });
}

export async function getToken(page: Page, credentials = ADMIN_USER) {
  const response = await page.request.post(`${API_URL}/auth/login`, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    data: `username=${credentials.username}&password=${credentials.password}&grant_type=password`,
  });
  const body = await response.json();
  return body.access_token;
}

export async function apiCreateUser(page: Page, token: string, user: any) {
  const res = await page.request.post(`${API_URL}/users/`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    data: JSON.stringify(user),
  });
  const body = await res.json();
  return body.id;
}

export async function apiDeleteUser(page: Page, token: string, id: string) {
  await page.request.delete(`${API_URL}/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}