import { test, expect } from "@playwright/test";

test("navigation keeps all labels visible and booking starts with an early choice", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const label of ["Home", "Visits", "Records", "More"])
    await expect(nav.getByText(label, { exact: true })).toBeVisible();
  const bounds = await nav.locator("button").evaluateAll((buttons) =>
    buttons.map((button) => {
      const label = button.querySelector('[class*="navLabel"]');
      const icon = button.querySelector('[class*="navIcon"]');
      return {
        width: button.getBoundingClientRect().width,
        stacked:
          label.getBoundingClientRect().top >=
          icon.getBoundingClientRect().bottom,
      };
    }),
  );
  expect(bounds.every((item) => item.stacked)).toBe(true);
  expect(
    Math.max(...bounds.map((item) => item.width)) -
      Math.min(...bounds.map((item) => item.width)),
  ).toBeLessThan(1);
  await page.getByRole("button", { name: "Book visit", exact: true }).click();
  await page.getByRole("button", { name: /Book with AI assistant/ }).click();
  await expect(page).toHaveURL(/\/book\?mode=assistant$/);
  await expect(
    page.getByRole("textbox", { name: "Type your message" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Dr. Meera Iyer/ }).click();
  await expect(
    page.getByText("Who is this visit for?", { exact: false }),
  ).toBeVisible();
  await page.goto("/book");
  await page.getByRole("button", { name: /Book manually/ }).click();
  await expect(
    page.getByRole("button", { name: /Book with AI assistant/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Book a visit", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/book\/meera\?mode=manual$/);
  await expect(
    page.getByRole("button", { name: /Book with assistant/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "How would you like to book?" }),
  ).toHaveCount(0);
});

test("intelligence requires an explicit request and stays generated after reopening", async ({
  page,
}) => {
  await page.goto("/records?tab=labs&record=r12");
  await page.getByRole("tab", { name: "AI analysis", exact: true }).click();
  await expect(page.getByRole("list", { name: "Parameters" })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Generate AI analysis", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Generating AI analysis/ }),
  ).toBeDisabled();
  await expect(page.getByRole("list", { name: "Parameters" })).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "AI analysis", exact: true }).click();
  await expect(page.getByRole("list", { name: "Parameters" })).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Generate AI analysis",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("white auth logo areas and exact primary actions coexist with dark banners", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "tatva-brand-preview",
      JSON.stringify({
        name: "Colour Hospital",
        hospitalName: "Colour Hospital",
        primary: "#df8254",
        accent: "#de8070",
        logo:
          "data:image/svg+xml," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100"><rect width="400" height="100" fill="white"/><text x="10" y="65" font-size="40">Hospital</text></svg>',
          ),
      }),
    ),
  );
  for (const route of ["/welcome", "/login"]) {
    await page.goto(route);
    await expect(page.locator("#app-content > div")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    const logo = page.locator('#app-content [data-brand-logo="horizontal"]');
    expect((await logo.boundingBox()).height).toBe(28);
    await expect(page.locator('#app-content [class*="grid"]')).toHaveCount(0);
  }
  await page.goto("/");
  const bell = page.getByRole("button", { name: "Notifications", exact: true });
  await expect(bell).toHaveCSS("background-image", /linear-gradient/);
  await expect(bell).toHaveCSS("backdrop-filter", /blur\(20px\)/);
  const surface = page.locator('[class*="homeHeroSurface"]');
  await expect(surface).toHaveCSS("background-image", /linear-gradient/);
  const cta = page
    .getByRole("button", { name: "Link ABHA", exact: true })
    .last();
  await expect(cta).toHaveCSS("background-color", "rgb(223, 130, 84)");
  await page.goto("/more");
  await expect(page.getByRole("img", { name: "ABHA", exact: true })).toHaveCSS(
    "background-color",
    "rgb(223, 130, 84)",
  );
});

test("uploaded reports without extracted values cannot invent intelligence", async ({
  page,
}) => {
  await page.goto("/records");
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("tatva-patient-demo-v1"));
    const record = state.records.find((item) => item.id === "r12");
    delete record.params;
    delete record.summary;
    record.uploaded = true;
    record.type = "Pathology";
    localStorage.setItem("tatva-patient-demo-v1", JSON.stringify(state));
  });
  await page.goto("/records?tab=labs&record=r12");
  await page.getByRole("tab", { name: "AI analysis", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate AI analysis", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "couldn’t read the clinical values" }),
  ).toBeVisible();
  await expect(page.getByRole("list", { name: "Parameters" })).toHaveCount(0);
});

test("record thumbnails load with shimmer and fill the preview width", async ({
  page,
}) => {
  let releaseViewer;
  const ready = new Promise((resolve) => {
    releaseViewer = resolve;
  });
  await page.route("**/src/patient/components/PdfViewer.jsx", async (route) => {
    await ready;
    await route.continue();
  });
  await page.goto("/records", { waitUntil: "domcontentloaded" });
  const preview = page.locator('article [class*="preview"]').first();
  const thumbnail = preview.locator('[class*="thumbnail"]');
  await expect(thumbnail).toBeVisible();
  expect(
    await thumbnail.evaluate(
      (node) => getComputedStyle(node, "::after").animationName,
    ),
  ).toContain("thumbnailShimmer");
  releaseViewer();
  await expect(preview.locator('[data-loading="false"]')).toHaveCount(1);
  await expect(preview).toHaveCSS("padding", "0px");
  const frame = await preview.boundingBox();
  const canvas = await preview.locator("canvas").boundingBox();
  expect(Math.abs(frame.width - canvas.width)).toBeLessThan(1);
});
