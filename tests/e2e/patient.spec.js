import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("home uses a care overview and switches family context", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Care for Aarav Sharma. Switch patient" }),
  ).toContainText("Aarav");
  await page.getByRole("button", { name: "Switch family profile" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Rajesh Sharma/ })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Care for Rajesh Sharma. Switch patient",
    }),
  ).toContainText("Rajesh");
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
    "/link-records",
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

test("header sheets select a hospital, show updates, and dismiss with a gesture", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Change location/ }).click();
  let dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("Your hospital");
  await dialog.getByRole("button", { name: /Whitefield/ }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: /Change location/ }),
  ).toContainText("Whitefield");
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await expect(dialog).toHaveAccessibleName("Your updates");
  await dialog.getByRole("button", { name: "Mark all as read" }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Notifications", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Switch family profile" }).click();
  await dialog.evaluate(async (node) => {
    await Promise.all(node.getAnimations().map((a) => a.finished));
  });
  const grip = await dialog.locator('[class*="sheetGrip"]').boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + 125, { steps: 8 });
  await page.mouse.up();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("navigation")).toBeVisible();
});

test("bottom navigation labels only the active tab beside its icon", async ({
  page,
}) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/", "/appointments", "/records", "/family", "/more"]) {
      await page.goto(path);
      const nav = page.getByRole("navigation");
      const items = nav.getByRole("button");
      await expect(items).toHaveCount(5);
      await expect(nav.locator('[class*="navLabel"]')).toHaveCount(1);
      const geometry = await items.evaluateAll((buttons) =>
        buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          const icon = button
            .querySelector("[data-tp-icon]")
            .getBoundingClientRect();
          const label = button
            .querySelector('[class*="navLabel"]')
            ?.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            named: !!button.getAttribute("aria-label"),
            gap: label ? label.x - icon.right : null,
            offset: label
              ? Math.abs(icon.y + icon.height / 2 - label.y - label.height / 2)
              : 0,
            fits: rect.left >= 0 && rect.right <= innerWidth,
          };
        }),
      );
      expect(
        geometry.every(
          (g) =>
            g.width >= 44 &&
            g.height >= 44 &&
            g.named &&
            g.fits &&
            g.offset < 1,
        ),
      ).toBe(true);
      expect(geometry.find((g) => g.gap !== null).gap).toBeGreaterThanOrEqual(
        6,
      );
    }
  }
});

test("patients link UHID and ABHA with verification and consent, persist and unlink", async ({
  page,
}) => {
  await page.goto("/records");
  await page.getByRole("button", { name: /Link your health records/ }).click();
  for (const [method, value] of [
    ["UHID", "TP-10482"],
    ["ABHA", "12-3456-7890-1234"],
  ]) {
    await page
      .getByRole("button", { name: `Link ${method}`, exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByLabel(method === "UHID" ? "UHID" : "ABHA number", { exact: true })
      .fill(value);
    await dialog
      .getByRole("button", { name: "Continue to demo verification" })
      .click();
    await dialog
      .getByLabel("Demo verification code", { exact: true })
      .fill("000000");
    await dialog
      .getByRole("button", { name: "Verify demo code", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText("Incorrect");
    await dialog
      .getByLabel("Demo verification code", { exact: true })
      .fill("123456");
    await dialog
      .getByRole("button", { name: "Verify demo code", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Confirm demo link", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText("consent");
    await dialog.getByRole("checkbox").check();
    await dialog
      .getByRole("button", { name: "Confirm demo link", exact: true })
      .click();
    await expect(dialog).toContainText(
      "No new medical records have been imported",
    );
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await expect(dialog).toBeHidden();
  }
  await page.reload();
  await expect(page.getByText("Demo linked", { exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: /For Aarav Sharma/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Rajesh Sharma/ })
    .click();
  await expect(page.getByText("Demo linked", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /For Rajesh Sharma/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Aarav Sharma/ })
    .click();
  await page
    .getByRole("button", { name: "Unlink", exact: true })
    .first()
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Unlink identity", exact: true })
    .click();
  await expect(page.getByText("Demo linked", { exact: true })).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Link UHID", exact: true }),
  ).toBeVisible();
});

test("direct ABHA entry and reduced-motion sheets remain accessible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/abha");
  await expect(page.getByRole("dialog")).toHaveAccessibleName("Link your ABHA");
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact),
    ),
  ).toEqual([]);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("home keeps patient context and banners fixed while its sheet overlays them", async ({
  page,
}) => {
  await page.goto("/");
  const header = page.locator('[class*="patientHeader"]');
  const initial = await header.boundingBox();
  expect(initial.height).toBeLessThanOrEqual(80);
  const name = page.getByRole("button", {
    name: "Care for Aarav Sharma. Switch patient",
  });
  const location = page.getByRole("button", { name: /Change location/ });
  expect((await name.boundingBox()).y).toBeLessThan(
    (await location.boundingBox()).y,
  );
  expect(
    await name.evaluate((n) => parseFloat(getComputedStyle(n).fontSize)),
  ).toBeGreaterThan(
    await location.evaluate((n) => parseFloat(getComputedStyle(n).fontSize)),
  );
  const banner = page.locator('[class*="homeTop"]');
  const beforeBanner = await banner.boundingBox();
  const panel = page.locator('[class*="homePanel"]');
  const beforePanel = await panel.boundingBox();
  await expect(
    page.getByRole("button", { name: "Link ABHA", exact: true }),
  ).toHaveCSS("border-radius", "12px");
  await expect(
    page.getByRole("group", { name: "1 of 3: Upcoming appointment" }),
  ).toContainText("Dr. Meera Iyer");
  await page.getByRole("button", { name: "Next care update" }).click();
  await expect(
    page.getByRole("button", { name: "Show banner 2: New health record" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("group", { name: "2 of 3: New health record" }),
  ).toContainText("Complete blood count");
  await page.getByRole("button", { name: "Next care update" }).click();
  await expect(
    page.getByRole("button", { name: "Show banner 3: Your outstanding bills" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("group", { name: "3 of 3: Your outstanding bills" }),
  ).toContainText("₹700");
  await page.locator("main").evaluate((node) => (node.scrollTop = 480));
  const scrolled = await header.boundingBox();
  expect(Math.abs(scrolled.y - initial.y)).toBeLessThan(1);
  expect(
    Math.abs((await banner.boundingBox()).y - beforeBanner.y),
  ).toBeLessThan(1);
  expect((await panel.boundingBox()).y).toBeLessThan(beforePanel.y - 400);
  await expect(banner).toHaveAttribute("inert", "");
  expect((await page.locator('[class*="homeSheetTop"]').boundingBox()).y).toBe(
    initial.y + initial.height,
  );
  await page.locator("main").evaluate((node) => (node.scrollTop = 0));
  await expect(banner).not.toHaveAttribute("inert");
  await page.locator("main").evaluate((node) => (node.scrollTop = 480));
  await expect(
    page.getByRole("button", { name: /Change location/ }),
  ).toBeInViewport();
  await expect(page.getByRole("link", { name: "Create ABHA" })).toHaveAttribute(
    "href",
    "https://abha.abdm.gov.in/abha/v3/",
  );
  await page.getByRole("button", { name: "Link ABHA", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName("Link your ABHA");
});

test("home banners follow family context and quick actions use one colour", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  const backgrounds = await page
    .locator('[class*="quickIcon"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).backgroundImage),
    );
  expect(new Set(backgrounds).size).toBe(1);
  expect(
    await page
      .locator("main")
      .evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true);
  await page.getByRole("button", { name: "Switch family profile" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Rajesh Sharma/ })
    .click();
  await expect(
    page.getByRole("group", { name: /1 of .*Upcoming appointment/ }),
  ).toContainText("Dr. Arjun Rao");
  await expect(
    page.getByRole("group", { name: /Upcoming appointment/ }),
  ).not.toContainText("Dr. Meera Iyer");
  await page.getByRole("button", { name: "Switch family profile" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Sunita Sharma/ })
    .click();
  await expect(
    page.getByRole("group", { name: /1 of .*Your next step to better health/ }),
  ).toContainText("Let’s plan your next visit.");
  await expect(
    page.getByRole("button", { name: "Find a doctor", exact: true }),
  ).toBeVisible();
});
