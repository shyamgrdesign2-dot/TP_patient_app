import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("home follows the mobile reference and switches family context", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "View your health card" }),
  ).toContainText("Aarav Sharma");
  await page.getByRole("button", { name: "Switch family profile" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Rajesh Sharma/ })
    .click();
  await expect(
    page.getByRole("button", { name: "View your health card" }),
  ).toContainText("Rajesh Sharma");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Records", exact: true })
    .click();
  await expect(
    page.getByText("Cardiology consultation", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Complete blood count", { exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("Cardiology consultation", { exact: true }),
  ).toBeVisible();
});

test("book, reschedule and cancel a visit end to end", async ({ page }) => {
  await page.goto("/doctors");
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Visits", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("button", { name: /Book a visit/ })
    .first()
    .click();
  await page.getByRole("button", { name: "09:00 AM", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Rajesh (Father)", exact: true })
    .click();
  await page
    .getByLabel("Reason for your visit (optional)")
    .fill("Routine review");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm demo appointment", exact: true })
    .click();
  await expect(
    page.getByText("Your appointment is confirmed.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View my appointments" }).click();
  await expect(
    page.getByRole("button", { name: /For Rajesh Sharma/ }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Visits", exact: true })
    .click();
  await page
    .getByRole("button", { name: "View details", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Reschedule visit" }).click();
  await page.getByRole("button", { name: "09:30 AM", exact: true }).click();
  await page.getByRole("button", { name: "Confirm new time" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(/09:30 AM/).first()).toBeVisible();
  await page
    .getByRole("button", { name: "View details", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Cancel appointment", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel appointment", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancelled", exact: true }).click();
  await expect(page.getByText("Dr. Meera Iyer", { exact: true })).toBeVisible();
});

test("record uploads persist and are attached to the current patient", async ({
  page,
}) => {
  await page.goto("/records");
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await page.getByLabel("Record file").setInputFiles({
    name: "sample.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l8sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByLabel("Record title", { exact: true }).fill("My sample scan");
  await page
    .getByRole("button", { name: "Scans & imaging", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: /My sample scan/ }).click();
  await expect(
    page.getByRole("dialog").getByRole("img", { name: "My sample scan" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download file" }).click();
  expect((await download).suggestedFilename()).toBe("sample.png");
});

test("billing demo is explicit and receipt survives reload", async ({
  page,
}) => {
  await page.goto("/billing");
  await page.getByRole("button", { name: /INV-1048/ }).click();
  await page.getByRole("button", { name: /Simulate payment/ }).click();
  await expect(
    page.getByText("No money was charged. This is a payment-flow preview."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Unpaid", exact: true }).click();
  await expect(page.getByText("No bills to show")).toBeVisible();
});

test("branding applies name colour font and logo globally", async ({
  page,
}) => {
  await page.goto("/branding");
  await page.getByRole("button", { name: /Coastal Health/ }).click();
  await expect(page).toHaveTitle(/Coastal Health/);
  await page.getByLabel("App name", { exact: true }).fill("Orchid Health");
  await page
    .getByLabel("Hospital name", { exact: true })
    .fill("Orchid Hospital");
  await page.getByLabel("Primary colour", { exact: true }).fill("#205c44");
  await page.getByRole("button", { name: "Mulish", exact: true }).click();
  await page.getByRole("button", { name: "Apply hospital branding" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Home", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Orchid Hospital/ }),
  ).toBeVisible();
  expect(
    await page
      .locator("html")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--tesseract-blue-500").trim(),
      ),
  ).toBe("#205c44");
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain("Mulish");
  await page.reload();
  await expect(page).toHaveTitle(/Orchid Health/);
});

test("OTP rejects invalid code; saved PIN signs back in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Mobile number", { exact: true }).fill("9000000001");
  await page
    .getByRole("button", { name: "Continue with mobile number" })
    .click();
  await page.getByLabel("6-digit demo code").fill("000000");
  await page.getByRole("button", { name: "Sign in to demo" }).click();
  await expect(page.getByRole("alert")).toContainText("123456");
  await page.getByLabel("6-digit demo code").fill("123456");
  await page.getByRole("button", { name: "Sign in to demo" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/settings");
  await page.getByRole("button", { name: /Quick access/ }).click();
  await page.getByLabel("6-digit PIN", { exact: true }).fill("384926");
  await page.getByLabel("Confirm pin", { exact: true }).fill("384926");
  await page.getByRole("button", { name: "Save pin" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out of demo" }).click();
  await page.getByRole("button", { name: "Quick PIN", exact: true }).click();
  await page.getByLabel("Your quick PIN").fill("384926");
  await page.getByRole("button", { name: "Sign in to demo" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("create a family profile with explicit permission", async ({ page }) => {
  await page.goto("/family?add=1");
  await page.getByLabel("Full name", { exact: true }).fill("Neha Sharma");
  await page.getByRole("button", { name: "Sibling", exact: true }).click();
  await page.getByLabel("Date of birth", { exact: true }).fill("1998-02-12");
  await page.getByLabel("Mobile number", { exact: true }).fill("9000000004");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Add family member", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Neha Sharma" }),
  ).toBeVisible();
});

test("all screens render without crashes or horizontal overflow", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of [
    "/",
    "/doctors",
    "/appointments",
    "/records",
    "/family",
    "/profile",
    "/queue",
    "/billing",
    "/packages",
    "/vaccines",
    "/home-care",
    "/hospital",
    "/inpatient",
    "/more",
    "/notifications",
    "/settings",
    "/branding",
    "/emergency",
    "/abha",
    "/feedback",
    "/assistant",
    "/welcome",
    "/login",
  ]) {
    await page.goto(route);
    await expect(page.locator("main")).not.toContainText(
      "Something didn’t load",
    );
    const overflow = await page
      .locator("main")
      .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(overflow, `${route} overflow`).toBe(false);
  }
  expect(errors).toEqual([]);
});

test("home and family drawer have no serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  let results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations
      .filter((v) => ["serious", "critical"].includes(v.impact))
      .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await page.getByRole("button", { name: "Switch family profile" }).click();
  await page
    .getByRole("dialog")
    .evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations
      .filter((v) => ["serious", "critical"].includes(v.impact))
      .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
});

test("doctor and record filters stay within narrow phone screens", async ({
  page,
}) => {
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["/doctors", "/records"]) {
      await page.goto(route);
      expect(
        await page
          .locator("main")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
    }
  }
});
