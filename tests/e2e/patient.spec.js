import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("home uses a care overview and switches family context", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Care for Aarav Sharma. Switch patient" }),
  ).toContainText("Aarav");
  await page.getByRole("button", { name: /Care for .*Switch patient/ }).click();
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
  await expect(page).toHaveURL(/\/records$/);
  await expect(
    page.getByRole("heading", { name: "Health records", exact: true }),
  ).toBeVisible();
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
      .getByRole("button", { name: "Calendar", exact: true }),
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
    .getByRole("button", { name: "Calendar", exact: true })
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
  await page
    .getByRole("button", { name: "Upload document", exact: true })
    .click();
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
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("6-digit demo code").fill("000000");
  await page.getByRole("button", { name: "Verify & sign in" }).click();
  await expect(page.getByRole("alert")).toContainText("123456");
  await page.getByLabel("6-digit demo code").fill("123456");
  await page.getByRole("button", { name: "Verify & sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/settings");
  await page.getByRole("button", { name: /Quick access/ }).click();
  await page.getByLabel("6-digit PIN", { exact: true }).fill("384926");
  await page.getByLabel("Confirm pin", { exact: true }).fill("384926");
  await page.getByRole("button", { name: "Save pin" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out of demo" }).click();
  await page
    .getByRole("button", { name: "Use another sign-in method" })
    .click();
  await page.getByRole("button", { name: "Quick PIN", exact: true }).click();
  await page.getByLabel("Your quick PIN").fill("384926");
  await page.getByRole("button", { name: "Verify & sign in" }).click();
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
  await page.getByRole("button", { name: /Care for .*Switch patient/ }).click();
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
  await page.getByRole("button", { name: /Care for .*Switch patient/ }).click();
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
      await expect(items).toHaveCount(4);
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
    page.getByRole("group", { name: /1 of .*Upcoming appointment/ }),
  ).toContainText("Dr. Meera Iyer");
  await page.getByRole("button", { name: /Show banner 2:/ }).click();
  await expect(
    page.getByRole("button", { name: "Show banner 2: New health record" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("group", { name: "2 of 4: New health record" }),
  ).toContainText("Complete blood count");
  await page.getByRole("button", { name: /Show banner 3:/ }).click();
  await expect(
    page.getByRole("button", { name: "Show banner 3: Your outstanding bills" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("group", { name: "3 of 4: Your outstanding bills" }),
  ).toContainText("₹700");
  await page.locator("main").evaluate((node) => (node.scrollTop = 480));
  const scrolled = await header.boundingBox();
  expect(Math.abs(scrolled.y - initial.y)).toBeLessThan(1);
  expect(
    Math.abs((await banner.boundingBox()).y - beforeBanner.y),
  ).toBeLessThan(1);
  expect((await panel.boundingBox()).y).toBeLessThan(beforePanel.y - 400);
  await expect(banner).toHaveAttribute("inert", "");
  expect(
    (await page.locator('[class*="homeSheetTop"]').boundingBox()).y,
  ).toBeLessThan(initial.y);
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
  await page.getByRole("button", { name: /Care for .*Switch patient/ }).click();
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
  await page.getByRole("button", { name: /Care for .*Switch patient/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Sunita Sharma/ })
    .click();
  await expect(
    page.getByRole("group", { name: /1 of .*Latest completed visit/ }),
  ).toContainText("Dr. Rohan Menon");
  await expect(
    page.getByRole("button", { name: "View summary", exact: true }),
  ).toBeVisible();
});

test("home categories, brand and rounded effect layers fit mobile and desktop", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator('[class*="headerHospital"]')).toHaveCount(0);
    const cards = page.locator("[data-category]").filter({ visible: true });
    await expect(cards).toHaveCount(12);
    expect(
      await cards.evaluateAll((ns) => [
        ...new Set(ns.map((n) => n.dataset.category)),
      ]),
    ).toEqual(["appointments", "records", "payments", "completed"]);
    for (let i = 0; i < 4; i++) {
      await page
        .getByRole("button", { name: new RegExp(`Show banner ${i + 1}:`) })
        .click();
      const current = page.locator("[data-category]:not([inert])");
      await expect(current).toHaveAttribute(
        "data-category",
        ["appointments", "records", "payments", "completed"][i],
      );
      const geometry = await current.evaluate((n) => {
        const style = getComputedStyle(n),
          glow = getComputedStyle(n, "::before"),
          lattice = n.querySelector("[data-pattern]");
        const track = n.parentElement.getBoundingClientRect(),
          rect = n.getBoundingClientRect();
        return {
          fits: rect.left >= track.left - 1 && rect.right <= track.right + 1,
          overflow: n.scrollWidth > n.clientWidth + 1,
          radius: style.borderRadius,
          glowRadius: glow.borderRadius,
          patternHidden: lattice?.getAttribute("aria-hidden"),
          shape: style.getPropertyValue("corner-shape"),
          glowShape: glow.getPropertyValue("corner-shape"),
          patternGeometry: lattice
            ?.querySelector("g > path")
            ?.getAttribute("d"),
        };
      });
      expect(geometry.fits).toBe(true);
      expect(geometry.overflow).toBe(false);
      expect(geometry.glowRadius).toBe(geometry.radius);
      expect(geometry.patternHidden).toBe("true");
      expect(geometry.glowShape).toBe(geometry.shape);
      expect(["appointments", "records", "payments", "completed"]).toContain(
        await current.locator("[data-pattern]").getAttribute("data-pattern"),
      );
    }
    expect(
      await page
        .locator("main")
        .evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
    ).toBe(true);
  }
});

test("subpages have a sticky title-only header and direct-entry back fallback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const path of [
    "/assistant",
    "/doctors",
    "/records",
    "/family",
    "/billing",
    "/more",
    "/branding",
  ]) {
    await page.goto(path);
    const header = page.locator('[class*="pageHeader"]');
    await expect(header.locator("h1")).toBeVisible();
    await expect(header.locator("p")).toHaveCount(0);
    const back = header.getByRole("button", { name: "Go back", exact: true });
    await expect(back).toBeVisible();
    await expect(back).toHaveCSS("border-top-width", "0px");
    const top = (await header.boundingBox()).y;
    await page.locator("main").evaluate((n) => (n.scrollTop = 400));
    expect(Math.abs((await header.boundingBox()).y - top)).toBeLessThan(1);
    expect(
      await page
        .locator("main")
        .evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
    ).toBe(true);
  }
  await page.goto("/assistant");
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  await expect(page).toHaveURL("/");
});

test("carousel loops in both directions with angled neighbours and no arrow buttons", async ({
  page,
}) => {
  await page.goto("/");
  const track = page.locator('[class*="bannerTrack"]');
  const current = page.locator("[data-category]:not([inert])");
  await expect(
    page.getByRole("button", { name: /Next care update|Previous care update/ }),
  ).toHaveCount(0);
  await expect(current).toHaveAttribute("data-category", "appointments");
  for (let n = 0; n < 5; n++) {
    await track.evaluate((node) =>
      node.scrollBy({
        left: -(node.children[0].offsetWidth + 10),
        behavior: "instant",
      }),
    );
    await page.waitForTimeout(230);
  }
  await expect(current).toHaveAttribute("data-category", "completed");
  await track.evaluate((node) =>
    node.scrollBy({
      left: node.children[0].offsetWidth + 10,
      behavior: "instant",
    }),
  );
  await expect(current).toHaveAttribute("data-category", "appointments");
  const geometry = await current.evaluate((node) => {
    const box = node.getBoundingClientRect(),
      track = node.parentElement.getBoundingClientRect();
    const prev = node.previousElementSibling.getBoundingClientRect(),
      next = node.nextElementSibling.getBoundingClientRect();
    return {
      center: Math.abs((box.left + box.right - track.left - track.right) / 2),
      leftPeek: prev.right - track.left,
      rightPeek: track.right - next.left,
      width: box.width,
      angle: getComputedStyle(node.nextElementSibling).transform,
    };
  });
  expect(geometry.center).toBeLessThan(2);
  expect(geometry.leftPeek / geometry.width).toBeGreaterThan(0.06);
  expect(geometry.leftPeek / geometry.width).toBeLessThan(0.11);
  expect(geometry.rightPeek / geometry.width).toBeGreaterThan(0.06);
  expect(geometry.angle).not.toBe("none");
});

test("symptom collector reviews and edits a summary then hands it to booking", async ({
  page,
}) => {
  await page.goto("/assistant");
  await page.getByRole("button", { name: "Start symptom collection" }).click();
  await page.getByLabel("Symptoms", { exact: true }).fill("Headache");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "1-2 Day(s)", exact: true }).click();
  await page.getByRole("button", { name: "Mild", exact: true }).click();
  await page
    .getByLabel("Medical history & allergies", { exact: true })
    .fill("No known allergies");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your visit summary" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit Vitals & questions" }).click();
  await page
    .getByLabel("Vitals & questions", { exact: true })
    .fill("I would like to discuss triggers.");
  await page.getByRole("button", { name: "Review summary" }).click();
  await page.getByRole("button", { name: "Choose a doctor" }).click();
  await page.getByRole("button", { name: /Dr. Meera Iyer/ }).click();
  expect(page.url()).not.toContain("Headache");
  await page.getByRole("button", { name: "09:00 AM", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Reason for your visit (optional)")).toHaveValue(
    /Symptoms: Headache/,
  );
  await expect(page.getByLabel("Reason for your visit (optional)")).toHaveValue(
    /triggers/,
  );
  await page
    .getByRole("button", { name: "Rajesh (Father)", exact: true })
    .click();
  await expect(page.getByLabel("Reason for your visit (optional)")).toHaveValue(
    "",
  );
});

test("four-tab navigation keeps family in More and inputs use the new shared geometry", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('[class*="deviceStatus"]')).toHaveCount(0);
  await expect(page.locator('[class*="avatarButton"]')).toHaveCount(0);
  await expect(page.locator('[class*="headerHospital"]')).toHaveCount(0);
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("button", { name: "Family" })).toHaveCount(0);
  await nav.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("button", { name: "Manage family" }).click();
  await expect(page).toHaveURL(/\/family$/);
  await expect(
    nav.getByRole("button", { name: "More", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goto("/records");
  await expect(
    page
      .getByRole("button", { name: /Link your health records/ })
      .getByRole("img", { name: "ABHA", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Upload document", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Close", exact: true }),
  ).toHaveCSS("border-width", "0px");
  await expect(dialog.getByLabel("Record title", { exact: true })).toHaveCSS(
    "border-radius",
    "12px",
  );
  await expect(dialog.getByLabel("Record file", { exact: true })).toHaveCSS(
    "opacity",
    "0",
  );
  await expect(dialog.locator('[class*="uploadZone"] strong')).toHaveCSS(
    "text-decoration-line",
    "underline",
  );
});

test("home shows only relevant updates, with single and empty states", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("tatva-patient-demo-v1"));
    state.appointments = [];
    state.records = [];
    state.bills = [];
    localStorage.setItem("tatva-patient-demo-v1", JSON.stringify(state));
  });
  await page.reload();
  await expect(
    page.getByRole("group", { name: "1 of 1: Book your first visit" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Book visit", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("tatva-patient-demo-v1"));
    state.bills = [
      {
        id: "one-bill",
        memberId: state.activeMember,
        date: new Date().toLocaleDateString("en-CA"),
        status: "Unpaid",
        amount: 100,
        title: "Test invoice",
      },
    ];
    localStorage.setItem("tatva-patient-demo-v1", JSON.stringify(state));
  });
  await page.reload();
  await expect(page.locator("[data-category]")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Show banner/ })).toHaveCount(
    0,
  );
  await expect(page.locator("[data-category]")).toContainText(
    "₹100 outstanding",
  );
});

test("header contact sheet uses configured hospital numbers and unconfigured actions stay disabled", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Emergency hospital contacts" })
    .click();
  const sheet = page.getByRole("dialog");
  await expect(
    sheet.getByRole("button", { name: "Call hospital emergency" }),
  ).toBeDisabled();
  await expect(
    sheet.getByRole("button", { name: "Call hospital ambulance" }),
  ).toBeDisabled();
  await sheet.getByRole("button", { name: "Close", exact: true }).click();
  await page.evaluate(() => {
    const brand = JSON.parse(localStorage.getItem("tatva-brand-preview"));
    brand.emergencyPhone = "+91 80000 00001";
    brand.ambulancePhone = "+91 80000 00002";
    localStorage.setItem("tatva-brand-preview", JSON.stringify(brand));
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Emergency hospital contacts" })
    .click();
  await expect(
    sheet.getByRole("link", { name: "Call hospital emergency" }),
  ).toHaveAttribute("href", "tel:+918000000001");
  await expect(
    sheet.getByRole("link", { name: "Call hospital ambulance" }),
  ).toHaveAttribute("href", "tel:+918000000002");
});

test("arrival validates location then shows a persistent green token on Home", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({
    latitude: 13.5,
    longitude: 77.64,
    accuracy: 20,
  });
  await page.goto("/queue");
  await page.getByRole("button", { name: "Skip symptoms for now" }).click();
  await page.getByRole("button", { name: "I have arrived · Check in" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "away from this hospital",
  );
  await expect(page.getByText("YOUR TOKEN NUMBER")).toHaveCount(0);
  await context.setGeolocation({
    latitude: 12.9784,
    longitude: 77.6408,
    accuracy: 20,
  });
  await page.getByRole("button", { name: "I have arrived · Check in" }).click();
  await expect(page.getByText("YOUR TOKEN NUMBER")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "You’re checked in" }),
  ).toBeDisabled();
  await page.goto("/");
  const banner = page.locator("[data-category]:not([inert])");
  await expect(banner).toHaveAttribute("data-state", "queue");
  await expect(banner).toHaveAttribute("data-tone", "success");
  await expect(banner).toContainText("Token A-001");
  await page.reload();
  await expect(banner).toContainText("Token A-001");
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("tatva-patient-demo-v1"));
    state.appointments.find((a) => a.queue?.checkedIn).queue.minutes = 45;
    localStorage.setItem("tatva-patient-demo-v1", JSON.stringify(state));
  });
  await page.reload();
  await expect(banner).toHaveAttribute("data-tone", "warning");
  await expect(banner).toContainText("Longer wait");
  await banner.getByRole("heading").click();
  await expect(page).toHaveURL(/\/queue$/);
});

test("denied location does not create a token", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition: (_ok, fail) => fail({ code: 1 }) },
    });
  });
  await page.goto("/queue");
  await page.getByRole("button", { name: "Skip symptoms for now" }).click();
  await page.getByRole("button", { name: "I have arrived · Check in" }).click();
  await expect(page.getByRole("alert")).toContainText("Allow location access");
  await expect(page.getByText("YOUR TOKEN NUMBER")).toHaveCount(0);
});

test("PDF records render in a tall sheet with share, download, print and no grip", async ({
  page,
}) => {
  await page.goto("/records?record=r2");
  const sheet = page.getByRole("dialog");
  await expect(
    sheet.getByRole("img", { name: "Consultation prescription, page 1" }),
  ).toBeVisible();
  await expect(
    sheet.getByRole("button", { name: "Print", exact: true }),
  ).toBeEnabled();
  await expect(sheet.getByText("Loading document…")).toHaveCount(0);
  expect((await sheet.boundingBox()).height).toBeGreaterThan(844 * 0.9);
  expect(await sheet.locator('[class*="sheetGrip"]').count()).toBe(0);
  const canvas = await sheet
    .locator("canvas")
    .evaluate((n) => ({ width: n.width, height: n.height }));
  expect(canvas.width).toBeGreaterThan(250);
  expect(canvas.height).toBeGreaterThan(300);
  await sheet.getByRole("button", { name: "Zoom PDF" }).click();
  await expect(
    sheet.getByRole("button", { name: "Fit PDF to width" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await sheet.getByRole("button", { name: "Download sample record" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await page.evaluate(() => {
    const open = window.open.bind(window);
    window.open = () => {
      const popup = open("", "_blank");
      popup.print = () => {
        window.__printedPages = popup.document.querySelectorAll("img").length;
      };
      return popup;
    };
  });
  await sheet.getByRole("button", { name: "Print", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__printedPages)).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data) => {
        window.__shared = data.files[0].type;
      },
    });
  });
  await sheet.getByRole("button", { name: "Share", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__shared))
    .toBe("application/pdf");
});

test("floating action and compact glass patient selector stay clear of navigation", async ({
  page,
}) => {
  await page.goto("/records");
  const tag = page.getByRole("button", { name: /For Aarav Sharma/ });
  const action = page.getByRole("button", {
    name: "Upload document",
    exact: true,
  });
  const nav = page.getByRole("navigation");
  expect((await tag.boundingBox()).width).toBeLessThan(260);
  expect((await tag.boundingBox()).height).toBeLessThan(45);
  await expect(tag).toHaveCSS("border-top-width", "0px");
  await page.locator("#app-content").evaluate((n) => (n.scrollTop = 250));
  expect((await tag.boundingBox()).y).toBeGreaterThanOrEqual(64);
  expect(
    (await action.boundingBox()).y + (await action.boundingBox()).height,
  ).toBeLessThan((await nav.boundingBox()).y);
  await tag.click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("account deletion is explicit, clears local files and stays signed out after reload", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.evaluate(async () => {
    localStorage.setItem("tatva-demo-credential", "test");
    const { saveFile } = await import("/src/services/files.js");
    await saveFile("delete-me", new Blob(["test"]));
  });
  await page
    .getByRole("button", { name: "Delete account", exact: true })
    .click();
  const sheet = page.getByRole("dialog");
  await expect(
    sheet.getByRole("button", { name: "Delete my demo account" }),
  ).toBeDisabled();
  await sheet.getByRole("button", { name: "Keep my account" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Delete account", exact: true })
    .click();
  await sheet.getByRole("checkbox").check();
  await sheet.getByRole("button", { name: "Delete my demo account" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(() => localStorage.getItem("tatva-patient-demo-v1")),
  ).toBeNull();
  expect(
    await page.evaluate(() => localStorage.getItem("tatva-demo-credential")),
  ).toBeNull();
  expect(
    await page.evaluate(async () => {
      const { getFile } = await import("/src/services/files.js");
      return !!(await getFile("delete-me"));
    }),
  ).toBe(false);
  await page.reload();
  expect(
    await page.evaluate(() => localStorage.getItem("tatva-patient-demo-v1")),
  ).toBeNull();
  await page.goto("/records");
  await expect(page).toHaveURL(/\/login$/);
});

test("five welcome stories animate, stop on interaction and lead to mobile verification", async ({
  page,
}) => {
  await page.goto("/welcome");
  await expect(
    page.getByRole("heading", { name: "Good care. One tap closer." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Get started", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Introduction 2" }),
  ).toHaveAttribute("aria-current", "step", { timeout: 6500 });
  await expect(
    page.getByRole("button", { name: /Introduction [1-5]/ }),
  ).toHaveCount(5);
  await expect(
    page.getByRole("button", { name: /Pause introduction|Sign in/ }),
  ).toHaveCount(0);
  const story = page.getByRole("region", { name: "Discover your patient app" });
  await story.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "Introduction 3" }),
  ).toHaveAttribute("aria-current", "step");
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  await expect(page.getByLabel("Mobile number", { exact: true })).toBeVisible();
  await page.getByLabel("Mobile number", { exact: true }).fill("9000000001");
  await page.getByRole("button", { name: "Send code", exact: true }).click();
  await expect(page.getByLabel("6-digit demo code")).toBeFocused();
  await expect(page.getByRole("button", { name: /Resend in/ })).toBeDisabled();
  await page.getByLabel("6-digit demo code").fill("123456");
  await page.getByRole("button", { name: "Verify & sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Verified", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("welcome and login fit narrow screens and reduced motion disables story cycling", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/welcome");
  await expect(
    page.getByRole("button", { name: "Introduction 1" }),
  ).toHaveAttribute("aria-current", "step");
  expect(
    await page
      .locator('[class*="welcome"][data-paused]')
      .getAttribute("data-paused"),
  ).toBe("true");
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((v) => ["serious", "critical"].includes(v.impact)),
  ).toEqual([]);
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  const loginAudit = await new AxeBuilder({ page }).analyze();
  expect(
    loginAudit.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});

test("mobile verification distinguishes new and returning accounts without sharing care data", async ({
  page,
}) => {
  async function verify(phone) {
    await page.goto("/login");
    await page.getByLabel("Mobile number", { exact: true }).fill(phone);
    await page.getByRole("button", { name: "Send code", exact: true }).click();
    await page.getByLabel("6-digit demo code").fill("123456");
    await page.getByRole("button", { name: "Verify & sign in" }).click();
  }
  await verify("9888877776");
  await expect(page.getByLabel("Full name", { exact: true })).toBeVisible();
  await page.getByLabel("Full name", { exact: true }).fill("Neha Test");
  await page.getByLabel("Date of birth", { exact: true }).fill("1992-04-12");
  await page.getByRole("button", { name: "Create my profile" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("button", { name: "Care for Neha Test. Switch patient" }),
  ).toBeVisible();
  const firstState = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tatva-patient-demo-v1")),
  );
  expect(firstState.members).toHaveLength(1);
  for (const field of ["appointments", "records", "bills", "notifications"])
    expect(firstState[field]).toHaveLength(0);
  await verify("9000000001");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("button", { name: "Care for Aarav Sharma. Switch patient" }),
  ).toBeVisible();
  await verify("9888877776");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("button", { name: "Care for Neha Test. Switch patient" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Care for Neha Test. Switch patient" }),
  ).toBeVisible();
});

test("booked visits collect symptoms, retain the reviewed note and reject another patient's visit", async ({
  page,
}) => {
  await page.goto("/appointments?visit=TP-24091");
  await page
    .getByRole("button", { name: "Share symptoms before your visit" })
    .click();
  await page.getByRole("button", { name: "Start symptom collection" }).click();
  await page.getByLabel("Symptoms", { exact: true }).fill("Headache");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "1-2 Day(s)", exact: true }).click();
  await page.getByRole("button", { name: "Mild", exact: true }).click();
  await page
    .getByLabel("Medical history & allergies", { exact: true })
    .fill("None reported");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByRole("button", { name: "Save to my visit" }).click();
  await expect(page).toHaveURL(/appointments\?visit=TP-24091/);
  await page
    .getByRole("button", { name: "Review symptoms", exact: true })
    .click();
  await expect(page.getByText("Headache", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Headache", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("tatva-patient-demo-v1"));
    state.activeMember = "father";
    localStorage.setItem("tatva-patient-demo-v1", JSON.stringify(state));
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "This visit isn’t available" }),
  ).toBeVisible();
  await expect(page.getByText("Headache", { exact: true })).toHaveCount(0);
});

test("symptom collection leads into location-verified check-in and a queue token", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({
    latitude: 12.9784,
    longitude: 77.6408,
    accuracy: 20,
  });
  await page.goto("/queue");
  await expect(
    page.getByRole("button", { name: "I have arrived · Check in" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Share symptoms", exact: true })
    .click();
  await page.getByRole("button", { name: "Start symptom collection" }).click();
  await page.getByLabel("Symptoms", { exact: true }).fill("Headache");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "1-2 Day(s)", exact: true }).click();
  await page.getByRole("button", { name: "Mild", exact: true }).click();
  await page
    .getByLabel("Medical history & allergies", { exact: true })
    .fill("None reported");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page
    .getByRole("button", { name: "Save and continue to check-in" })
    .click();
  await expect(page).toHaveURL(/queue\?visit=TP-24091/);
  await expect(
    page.getByRole("heading", { name: "You’re ready to check in" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "I have arrived · Check in" }).click();
  await expect(page.getByText("YOUR TOKEN NUMBER")).toBeVisible();
  await page.goto("/");
  await expect(page.locator("[data-category]:not([inert])")).toHaveAttribute(
    "data-state",
    "queue",
  );
});
