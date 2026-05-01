import { test, expect } from "@playwright/test";
import { API_URL, ADMIN_USER, loginAs, navigateTo, getToken } from "./helpers/auth";

const uid = () => Date.now().toString(36);

test.describe("Users tab", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_USER);
    await navigateTo(page, "users");
  });

  test("page title is visible", async ({ page }) => {
    await expect(page.locator(".page-title")).toContainText("Users");
  });

  test("creates a user", async ({ page }) => {
    const name = "Alice " + uid();
    const email = "alice_" + uid() + "@example.com";
    await page.locator("input[placeholder='Alice Smith']").fill(name);
    await page.locator("input[placeholder='alice@example.com']").fill(email);
    await page.locator("button:has-text('+ Add User')").click();
    await expect(page.locator(".toast")).toContainText(/created/i);
  });
});

test.describe("Users API", () => {
  let token: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    token = await getToken(page, ADMIN_USER);
    await page.close();
  });

  test("unknown user returns 404", async ({ page }) => {
    const res = await page.request.get(
      API_URL + "/users/00000000-0000-0000-0000-000000000000",
      { headers: { Authorization: "Bearer " + token } }
    );
    expect(res.status()).toBe(404);
  });
});