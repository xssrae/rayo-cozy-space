import { expect, test } from "@playwright/test";

test("public login is responsive and keyboard reachable", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByLabel("Email").focus();
  await expect(page.getByLabel("Email")).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
});
