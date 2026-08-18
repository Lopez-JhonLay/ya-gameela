import { expect, test } from "@playwright/test";

test("renders the starter homepage", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Hello World")).toBeVisible();
});
