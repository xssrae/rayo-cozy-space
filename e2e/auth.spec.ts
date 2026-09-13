import { expect, test } from "@playwright/test";

test("public login is responsive and keyboard reachable", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Boas-vindas de volta" }),
  ).toBeVisible();
  await page.getByLabel("E-mail").focus();
  await expect(page.getByLabel("E-mail")).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
});
