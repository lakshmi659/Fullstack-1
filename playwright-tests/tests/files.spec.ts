import { test, expect } from "@playwright/test";
import { API_URL, ADMIN_USER, loginAs, navigateTo, getToken } from "./helpers/auth";

test.describe("Files tab", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_USER);
    await navigateTo(page, "files");
  });

  test("renders upload zone", async ({ page }) => {
    await expect(page.locator(".upload-zone")).toBeVisible();
  });

  test("shows file types", async ({ page }) => {
    await expect(page.locator(".upload-zone")).toContainText(/JPEG|PNG|PDF/i);
  });
});

test.describe("Files API", () => {
  let token: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    token = await getToken(page, ADMIN_USER);
    await page.close();
  });

  test("unsupported type returns 415", async ({ page }) => {
    const res = await page.request.post(
      API_URL + "/files/upload",
      { headers: { Authorization: "Bearer " + token },
        multipart: { file: { name: "test.txt", mimeType: "text/plain", buffer: Buffer.from("hello") } }
      }
    );
    expect(res.status()).toBe(415);
  });

  test("unknown file returns 404", async ({ page }) => {
    const res = await page.request.get(
      API_URL + "/files/00000000-0000-0000-0000-000000000000",
      { headers: { Authorization: "Bearer " + token } }
    );
    expect(res.status()).toBe(404);
  });
});