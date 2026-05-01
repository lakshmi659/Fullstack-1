import { test, expect } from "@playwright/test";
import { ADMIN_USER, NORMAL_USER, loginAs, navigateTo } from "./helpers/auth";

test.describe("Profile tab - admin", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_USER);
    await navigateTo(page, "profile");
  });

  test("renders all three panels", async ({ page }) => {
    await expect(page.locator(".panel-title").nth(0)).toContainText("/auth/me");
    await expect(page.locator(".panel-title").nth(1)).toContainText("JWT Payload");
    await expect(page.locator(".panel-title").nth(2)).toContainText("Bearer Token");
  });

  test("shows correct username for admin", async ({ page }) => {
    const userCard = page.locator(".stat-card", { hasText: "User" });
    await expect(userCard.locator(".stat-value")).toContainText("admin");
  });

  test("shows admin role badge", async ({ page }) => {
    const badge = page.locator(".badge");
    await expect(badge).toContainText("admin");
    await expect(badge).toHaveClass(/badge-admin/);
  });

  test("JWT Payload shows sub and role claims", async ({ page }) => {
    const jwtPanel = page.locator(".panel").nth(1);
    await expect(jwtPanel.locator(".code-block")).toContainText('"sub"');
    await expect(jwtPanel.locator(".code-block")).toContainText('"role"');
  });

  test("Bearer Token panel shows JWT string", async ({ page }) => {
    const tokenPanel = page.locator(".panel").nth(2);
    const rawToken = await tokenPanel.locator(".code-block").textContent();
    expect(rawToken?.split(".")).toHaveLength(3);
  });
});

test.describe("Profile tab - regular user", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, NORMAL_USER);
    await navigateTo(page, "profile");
  });

  test("shows username as user", async ({ page }) => {
    const userCard = page.locator(".stat-card", { hasText: "User" });
    await expect(userCard.locator(".stat-value")).toContainText("user");
  });

  test("role badge has user styling", async ({ page }) => {
    const badge = page.locator(".badge");
    await expect(badge).toContainText("user");
    await expect(badge).toHaveClass(/badge-user/);
  });
});