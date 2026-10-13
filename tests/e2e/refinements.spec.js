import { test, expect } from "@playwright/test";

test("appointment PDFs stack over details without changing route", async ({
  page,
}) => {
  await page.goto("/appointments?tab=past");
  await page
    .getByRole("button", { name: /View appointment with Dr. Meera/ })
    .click();
  const details = page.getByRole("dialog", { name: "Appointment details" });
  await expect(details).toBeVisible();
  for (const [action, title] of [
    ["View Rx", "Prescription PDF"],
    ["View bill", "Bill PDF"],
  ]) {
    await details.getByRole("button", { name: action, exact: true }).click();
    const pdf = page.getByRole("dialog", { name: title, exact: true });
    await expect(pdf.locator("canvas")).toBeVisible();
    await expect(page).toHaveURL(/\/appointments\?tab=past$/);
    await pdf.getByRole("button", { name: "Close", exact: true }).click();
    await expect(pdf).toHaveCount(0);
    await expect(details).toBeVisible();
  }
});

test("records show prescription documents, limited report summaries and history pointers", async ({
  page,
}) => {
  await page.goto("/records?tab=visits");
  await expect(page.getByRole("article")).toHaveCount(4);
  await page
    .getByRole("button", { name: "View Dermatology prescription", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog", { name: "Dermatology prescription", exact: true })
      .locator("canvas"),
  ).toBeVisible();
  await page.goto("/records?tab=history");
  await expect(
    page
      .getByRole("region", { name: "Medical Condition", exact: true })
      .getByRole("listitem"),
  ).toContainText(["Vitamin D"]);
  for (const heading of ["Lifestyle", "Surgical History", "Additional History"])
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
  await page.goto("/records?tab=records");
  await page.getByRole("button", { name: /Radiology \(/ }).click();
  await expect(page.getByText("AI analysis", { exact: true })).toBeVisible();
});

test("mobile confirmation actions share a sticky row", async ({ page }) => {
  await page.goto("/appointments/confirmed/TP-24091");
  const actions = page.locator("[data-confirmation-actions]");
  await expect(actions).toBeVisible();
  const boxes = await actions.locator("button").evaluateAll((nodes) =>
    nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    }),
  );
  expect(Math.abs(boxes[0].top - boxes[1].top)).toBeLessThan(2);
  expect(boxes[0].right).toBeLessThanOrEqual(boxes[1].left);
  expect(boxes[0].bottom).toBeLessThanOrEqual(844);
  await expect(
    page.getByRole("button", { name: "Directions", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Directions to/ })).toBeVisible();
});

test("PDF viewer scrolls internally with floating share, download and print actions", async ({
  page,
}) => {
  await page.goto("/records?tab=visits");
  await page
    .getByRole("button", {
      name: "View Consultation prescription",
      exact: true,
    })
    .click();
  const sheet = page.getByRole("dialog", {
    name: "Consultation prescription",
    exact: true,
  });
  await expect(sheet.locator("canvas")).toBeVisible();
  const toolbar = sheet.getByRole("toolbar");
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByRole("button")).toHaveCount(3);
  const download = page.waitForEvent("download");
  await toolbar.getByRole("button", { name: /Download/ }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await sheet.getByRole("button", { name: "Close", exact: true }).click();
  await page.goto("/records?tab=records");
  await expect(toolbar).toHaveCount(0);
  await expect(
    page
      .locator("#page-action")
      .getByRole("button", { name: "Upload medical records" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Prescription (1)", exact: true })
    .click();
  await expect(page.getByText("AI analysis", { exact: true })).toHaveCount(0);
});

test("new booking always offers the mode sheet and visit filters stay pinned", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("tatva-booking-mode", "manual"),
  );
  await page.goto("/book/meera");
  const sheet = page.getByRole("dialog", {
    name: "How would you like to book?",
  });
  await expect(
    sheet.getByRole("button", { name: /Book manually/ }),
  ).toBeVisible();
  await expect(
    sheet.getByRole("button", { name: /Book with AI assistant/ }),
  ).toBeVisible();
  await page.goto("/appointments?tab=past");
  const tabs = page.getByRole("tablist", { name: "Appointment status" });
  const before = await tabs.boundingBox();
  await page.locator("#app-content").evaluate((n) => (n.scrollTop = 400));
  const after = await tabs.boundingBox();
  expect(Math.abs(before.y - after.y)).toBeLessThanOrEqual(2);
  await expect(
    page
      .locator("header")
      .getByRole("button", { name: "Book a new appointment" }),
  ).toHaveCount(0);
});

test("appointment tabs keep selection inside the band and support arrow keys", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/appointments");
  const group = page.getByRole("tablist", { name: "Appointment status" });
  const options = group.getByRole("tab");
  await options.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(options.nth(1)).toBeFocused();
  await page.keyboard.press("End");
  await expect(options.last()).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  for (const enlarged of [false, true]) {
    if (enlarged)
      await group.locator("button > span").evaluateAll((nodes) =>
        nodes.forEach((n) => {
          n.style.fontSize = "24px";
          n.style.lineHeight = "1.4";
        }),
      );
    const bounds = await group.boundingBox();
    for (const option of await options.all()) {
      // Enlarged labels keep their full text and scroll horizontally into view.
      if (enlarged) {
        await option.focus();
        await expect
          .poll(async () => {
            const box = await option.boundingBox();
            return (
              box.x >= bounds.x - 1 &&
              box.x + box.width <= bounds.x + bounds.width + 1
            );
          })
          .toBe(true);
      }
      const box = await option.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(bounds.x);
      expect(box.x + box.width).toBeLessThanOrEqual(
        bounds.x + bounds.width + 1,
      );
      expect(box.y).toBeGreaterThanOrEqual(bounds.y);
      expect(box.y + box.height).toBeLessThanOrEqual(
        bounds.y + bounds.height + 1,
      );
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    expect(
      await options
        .first()
        .evaluate((n) => getComputedStyle(n, "::before").backgroundColor),
    ).toMatch(/^(rgba\(255, 255, 255, 0\.1\)|color\(srgb 1 1 1 \/ 0\.1\))$/);
  }
});

test("reports open a sheet with an internal viewer and floating document actions", async ({
  page,
}) => {
  await page.goto("/records?tab=labs");
  await page.getByRole("button", { name: /^View Diabetes screening/ }).click();
  await expect(page).toHaveURL(/\/records\?tab=labs&record=r12$/);
  const sheet = page.getByRole("dialog", {
    name: "Diabetes screening",
    exact: true,
  });
  await expect(
    sheet.getByRole("tab", { name: "Original Report", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    sheet.getByRole("img", { name: "Diabetes screening, page 1" }),
  ).toBeVisible();
  const tools = sheet.getByRole("toolbar");
  await expect(tools.getByRole("button")).toHaveCount(3);
  await expect(
    tools.getByRole("button", { name: "Print", exact: true }),
  ).toBeEnabled();
  const viewer = sheet.getByRole("region", { name: "Report document viewer" });
  expect(await viewer.evaluate((n) => getComputedStyle(n).overflowY)).toBe(
    "auto",
  );
  const bounds = await tools.boundingBox();
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  const download = page.waitForEvent("download");
  await tools.getByRole("button", { name: "Download file" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await sheet.getByRole("tab", { name: "AI analysis", exact: true }).click();
  await expect(tools).toHaveCount(0);
  await sheet.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page).toHaveURL(/\/records\?tab=labs$/);
  await expect(
    page.getByRole("button", { name: /^View Diabetes screening/ }),
  ).toBeVisible();
});

test("record sections keep their order, icons and keyboard selection on narrow screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/records?tab=records");
  const tabs = page.getByRole("tablist", { name: "Record type" });
  await expect(tabs.getByRole("tab")).toHaveText([
    /Medical records/,
    /Visits/,
    /Lab results/,
    /Medical history/,
    /Discharge summary/,
    /Certificates/,
  ]);
  await expect(tabs.locator("[data-tp-icon]")).toHaveCount(6);
  const medical = tabs.getByRole("tab", { name: /Medical records/ });
  await medical.focus();
  await page.keyboard.press("End");
  await expect(tabs.getByRole("tab", { name: /Certificates/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page).toHaveURL(/tab=certificates/);
  await expect(
    page.getByRole("button", { name: "Choose record section" }),
  ).toHaveCount(0);
});
