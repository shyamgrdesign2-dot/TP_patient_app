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
  await page.goto("/records");
  await expect(
    page.getByRole("region", { name: "Your prescription" }).locator("canvas"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Visit with Dr/ })).toHaveCount(
    0,
  );
  await expect(
    page.getByLabel("Prescription date").locator("option"),
  ).toHaveCount(4);
  await page
    .getByRole("button", { name: "Previous prescription", exact: true })
    .click();
  await expect(
    page.getByRole("img", {
      name: "Dermatology prescription, page 1",
      exact: true,
    }),
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
  await page.goto("/records");
  const toolbar = page.getByRole("toolbar", {
    name: "Prescription PDF controls",
  });
  await expect(toolbar).toBeVisible();
  await expect(
    page.locator('[aria-label="Your prescription"] canvas'),
  ).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  const bounds = await toolbar.boundingBox();
  expect(bounds.y + bounds.height).toBeLessThan((await nav.boundingBox()).y);
  await expect(toolbar.getByRole("button")).toHaveCount(3);
  await expect(
    toolbar.getByRole("button", { name: "Print prescription" }),
  ).toBeEnabled();
  await expect(
    toolbar.getByRole("button", { name: "Share prescription" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await toolbar.getByRole("button", { name: "Download prescription" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  const viewer = page.getByRole("region", {
    name: "Prescription document viewer",
  });
  expect(await viewer.evaluate((n) => getComputedStyle(n).overflowY)).toBe(
    "auto",
  );
  await viewer.evaluate((n) => (n.scrollTop = 300));
  expect(await page.locator("#app-content").evaluate((n) => n.scrollTop)).toBe(
    0,
  );
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
  const tabs = page.getByRole("radiogroup", { name: "Appointment status" });
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

test("segmented controls keep selection inside the track and support radio keys", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/appointments");
  const group = page.getByRole("radiogroup", { name: "Appointment status" });
  const options = group.getByRole("radio");
  await options.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(options.nth(1)).toHaveAttribute("aria-checked", "true");
  await expect(options.nth(1)).toBeFocused();
  await page.keyboard.press("End");
  await expect(options.last()).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Home");
  await expect(options.first()).toHaveAttribute("aria-checked", "true");
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
        .evaluate((n) => getComputedStyle(n).backgroundColor),
    ).toBe("rgb(255, 255, 255)");
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
  await sheet.getByRole("tab", { name: "Intelligence", exact: true }).click();
  await expect(tools).toHaveCount(0);
  await sheet.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page).toHaveURL(/\/records\?tab=labs$/);
  await expect(
    page.getByRole("button", { name: /^View Diabetes screening/ }),
  ).toBeVisible();
});
