import { test, expect } from "@playwright/test";

test("ABHA sync preference, source filter and document actions stay consistent", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/records");
  await page.getByRole("button", { name: /For Aarav Sharma/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Rajesh Sharma/ })
    .click();
  const patient = page.getByRole("button", { name: /For Rajesh Sharma/ });
  const badge = patient.getByRole("img", { name: "ABHA linked" });
  await expect(badge).toBeVisible();
  const p = await patient.boundingBox(),
    b = await badge.boundingBox();
  expect(b.x + b.width).toBeLessThanOrEqual(p.x + p.width);
  await page.getByRole("button", { name: "Sync", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Sync records from ABHA" });
  const auto = dialog.getByRole("switch", {
    name: "Automatically sync new records",
  });
  await expect(auto).not.toBeChecked();
  const toggle = await auto.boundingBox();
  expect(toggle.width).toBeGreaterThan(toggle.height);
  await auto.check();
  await dialog.getByRole("button", { name: "Approve and sync" }).click();
  await page.getByRole("button", { name: "View records", exact: true }).click();
  const source = page.getByRole("button", { name: "From ABHA", exact: true });
  await source.click();
  const tile = page.getByRole("article", {
    name: "Abdomen ultrasound",
    exact: true,
  });
  await expect(tile).toBeVisible();
  await expect(
    tile.getByRole("img", { name: "ABHA", exact: true }),
  ).toBeVisible();
  await tile
    .getByRole("button", { name: "Actions for Abdomen ultrasound" })
    .click();
  dialog = page.getByRole("dialog", { name: "Document actions" });
  await expect(
    dialog.getByRole("button", { name: "Download Document" }),
  ).toBeEnabled();
  await expect(
    dialog.getByRole("button", { name: "Share Document" }),
  ).toBeEnabled();
  await dialog.getByRole("button", { name: "View Document" }).click();
  dialog = page.getByRole("dialog", { name: /Abdomen ultrasound/ });
  await expect(
    dialog.getByText("Fetched from ABHA", { exact: true }),
  ).toBeVisible();
  await expect(dialog.locator("h2")).not.toContainText("Metro Imaging");
  await page.screenshot({ path: "/tmp/abha-report-refined.png" });
  await page.goto("/records?abha=card");
  const setting = page.getByRole("switch", {
    name: "Auto-sync records from ABHA",
  });
  await expect(setting).toBeChecked();
  await page.screenshot({ path: "/tmp/abha-toggle-refined.png" });
  await setting.uncheck();
  await page.reload();
  await expect(
    page.getByRole("switch", { name: "Auto-sync records from ABHA" }),
  ).not.toBeChecked();
  await page.goto("/link-records");
  await expect(page.getByRole("button", { name: /UHID/ })).toHaveCount(0);
});
