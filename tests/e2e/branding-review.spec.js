import { test, expect } from "@playwright/test";

test("customise opens hospital directly, with saved-only branding and editable CTA text", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: /Preview Tatva|Preview Coastal|Preview Bloom/,
    }),
  ).toHaveCount(0);
  const opened = context.waitForEvent("page");
  await page.getByRole("button", { name: "Customise" }).click();
  const editor = await opened;
  await editor.waitForLoadState();
  await expect(
    editor.getByRole("heading", { name: "Edit configuration", exact: true }),
  ).toBeVisible();
  await expect(
    editor.getByRole("radiogroup", { name: "Sign in as" }),
  ).toHaveCount(0);
  await expect(
    editor
      .getByRole("navigation", { name: "Sections" })
      .getByRole("button", { name: "Hospital", exact: true }),
  ).toHaveAttribute("aria-current", "location");
  await editor
    .getByRole("navigation", { name: "Sections" })
    .getByRole("button", { name: "Theme", exact: true })
    .click();
  await expect(
    editor.getByLabel("CTA text colour hex", { exact: true }),
  ).toHaveValue("#ffffff");
  await expect(editor.getByRole("combobox", { name: /CTA/ })).toHaveCount(0);
  await expect(
    editor.getByText("Secondary Color Override", { exact: true }),
  ).toHaveCount(0);
  await expect(
    editor.getByLabel("Body text colour hex", { exact: true }),
  ).toBeVisible();
  await editor
    .getByLabel("CTA text colour hex", { exact: true })
    .fill("#ffffff");
  await editor
    .getByLabel("Primary colour hex", { exact: true })
    .fill("#006b68");
  const iframe = editor.frameLocator('iframe[title="Patient app preview"]');
  await expect
    .poll(() =>
      iframe
        .locator("body")
        .evaluate((el) =>
          getComputedStyle(el).getPropertyValue("--brand-cta-foreground"),
        ),
    )
    .toBe("#ffffff");
  await expect
    .poll(() =>
      page
        .locator("body")
        .evaluate((el) =>
          getComputedStyle(el).getPropertyValue("--tesseract-blue-500"),
        ),
    )
    .toBe("#4b4ad5");
  await expect
    .poll(() =>
      editor
        .locator("body")
        .evaluate((el) =>
          getComputedStyle(el).getPropertyValue("--tesseract-blue-500"),
        ),
    )
    .toBe("#4b4ad5");
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .locator("body")
        .evaluate((el) =>
          getComputedStyle(el).getPropertyValue("--tesseract-blue-500"),
        ),
    )
    .toBe("#006b68");
  await page.reload();
  await expect
    .poll(() =>
      page
        .locator("body")
        .evaluate((el) =>
          getComputedStyle(el).getPropertyValue("--brand-cta-foreground"),
        ),
    )
    .toBe("#ffffff");
});

test("website analysis shows a loading state and restores controls on failure", async ({
  page,
}) => {
  let finish;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  await page.route("**/api/brand-import", async (route) => {
    await pending;
    await route.fulfill({
      status: 502,
      json: { error: "This website is temporarily unavailable." },
    });
  });
  await page.goto("/admin/app#hospital");
  await page
    .getByLabel("Hospital website", { exact: true })
    .fill("https://example.com");
  await page
    .getByRole("button", { name: "Analyze website", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Discovering your brand" }),
  ).toBeVisible();
  finish();
  await expect(
    page.getByText("This website is temporarily unavailable.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Analyze website", exact: true }),
  ).toBeEnabled();
});

test("home banners settle after navigation without continuously changing slide or position", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Show banner 2:/ }).click();
  await expect(
    page.getByRole("button", { name: /Show banner 2:/ }),
  ).toHaveAttribute("aria-pressed", "true");
  const track = page.locator('[class*="bannerTrack"]');
  await expect
    .poll(() =>
      track.evaluate((el) =>
        Math.abs(
          el.scrollLeft +
            el.clientWidth / 2 -
            [...el.children].find((c) => !c.inert).offsetLeft -
            [...el.children].find((c) => !c.inert).offsetWidth / 2,
        ),
      ),
    )
    .toBeLessThan(2);
  const samples = [];
  for (let i = 0; i < 6; i++) {
    samples.push(
      await track.evaluate((el) => ({
        left: el.scrollLeft,
        active: [...el.children].findIndex((c) => !c.inert),
      })),
    );
    await page.waitForTimeout(200);
  }
  expect(new Set(samples.map((s) => s.active)).size).toBe(1);
  expect(
    Math.max(...samples.map((s) => s.left)) -
      Math.min(...samples.map((s) => s.left)),
  ).toBeLessThan(1);
});

test("app logo uses supplied artwork with rounded corners while wordmark stays square", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/app");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const mark = page.getByRole("img", { name: "App icon", exact: true });
  await expect(mark).toHaveAttribute(
    "src",
    "/brand/tatvapractice-app-icon.png",
  );
  await expect(mark).toHaveCSS("border-radius", "12px");
  const wordmark = page.getByRole("img", {
    name: "Horizontal logo",
    exact: true,
  });
  await expect(wordmark).toHaveCSS("border-radius", "0px");
  for (const kind of ["app icon", "horizontal logo"]) {
    await page
      .getByRole("button", { name: `Edit or replace ${kind}`, exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    const canvas = await dialog.locator("canvas").boundingBox();
    const replace = await dialog
      .getByRole("button", { name: "Replace image" })
      .boundingBox();
    expect(canvas.y + canvas.height).toBeLessThanOrEqual(replace.y);
    const box = await dialog.boundingBox();
    expect(canvas.width).toBeGreaterThan(box.width * 0.85);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  }
});

test("returning live-app visitors receive the current default icon and favicon", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const brand = JSON.parse(localStorage.getItem("tatva-brand-preview"));
    delete brand.defaultIconVersion;
    Object.assign(brand, {
      hospitalName: "Tatva Care Hospital",
      logo: "",
      logoMark: "",
    });
    localStorage.setItem("tatva-brand-preview", JSON.stringify(brand));
  });
  await page.reload();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    "/brand/tatvapractice-app-icon.png",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/brand/tatvapractice-app-icon.png",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("tatva-brand-preview")).logoMark,
      ),
    )
    .toBe("/brand/tatvapractice-app-icon.png");
  await page.goto("/admin/app#hospital");
  await expect(
    page.getByRole("img", { name: "App icon", exact: true }),
  ).toHaveAttribute("src", "/brand/tatvapractice-app-icon.png");
});
