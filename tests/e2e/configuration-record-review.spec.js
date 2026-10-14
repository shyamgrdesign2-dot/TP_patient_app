import { test, expect } from "@playwright/test";

test("name saves settle across tabs without repainting themes, and expanded preview retains its route", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const second = await context.newPage();
  await second.goto("/more");
  const editor = await context.newPage();
  await editor.goto("/admin/app#hospital");
  const preview = editor.frameLocator('iframe[title="Patient app preview"]');
  await preview.getByRole("button", { name: "Records", exact: true }).click();
  await expect(
    preview.getByRole("heading", { name: "Health records", exact: true }),
  ).toBeVisible();
  const frame = await (
    await editor.locator('iframe[title="Patient app preview"]').elementHandle()
  ).contentFrame();
  const monitor = () => {
    window.brandWrites = 0;
    window.themeChanges = 0;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "tatva-brand-preview") window.brandWrites++;
      return original.call(this, key, value);
    };
    new MutationObserver(
      (changes) => (window.themeChanges += changes.length),
    ).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });
  };
  for (const target of [page, second, editor, frame])
    await target.evaluate(monitor);
  await editor
    .getByLabel("Hospital name", { exact: true })
    .fill("Cedar Hospital");
  await expect.poll(() => frame.title()).toContain("Cedar Hospital");
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  for (const target of [page, second, frame])
    await expect.poll(() => target.title()).toContain("Cedar Hospital");
  // Observe for stale storage echoes and theme teardown after the save settles.
  await page.waitForTimeout(600);
  for (const target of [page, second, frame]) {
    expect(await target.evaluate(() => window.brandWrites)).toBe(0);
    expect(await target.evaluate(() => window.themeChanges)).toBe(0);
  }
  expect(await editor.evaluate(() => window.brandWrites)).toBe(1);
  const url = frame.url();
  await editor
    .getByRole("button", { name: "Expand preview", exact: true })
    .click();
  const dialog = editor.getByRole("dialog", {
    name: "Expanded patient app preview",
  });
  await expect(dialog).toBeVisible();
  expect(frame.url()).toBe(url);
  await expect(
    preview.getByRole("heading", { name: "Health records", exact: true }),
  ).toBeVisible();
  await editor.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(frame.url()).toBe(url);
  await expect(
    editor.getByRole("button", { name: "Expand preview", exact: true }),
  ).toBeFocused();
});

test("empty record categories explain hospital updates; only Medical Records offers uploads", async ({
  page,
}) => {
  await page.goto("/records");
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("tatva-patient-demo-v1"));
    state.records = [];
    state.appointments = [];
    state.members.forEach((member) => (member.history = {}));
    localStorage.setItem("tatva-patient-demo-v1", JSON.stringify(state));
  });
  for (const tab of [
    "visits",
    "labs",
    "records",
    "discharge",
    "certificates",
    "history",
  ]) {
    await page.goto(`/records?tab=${tab}`);
    await expect(
      page.getByText(
        tab === "records"
          ? /Your medical records will appear here.*doctor or hospital/
          : /You’ll start seeing.*doctor or hospital/,
      ),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: /^Search/ })).toHaveCount(0);
    const actionName =
      tab === "records" ? "Upload Records" : "Book appointment";
    await expect(
      page.getByRole("button", { name: actionName, exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Upload Records", exact: true }),
    ).toHaveCount(tab === "records" ? 1 : 0);
    await expect(
      page.getByRole("button", { name: "Upload medical records", exact: true }),
    ).toHaveCount(0);
    const empty = page.locator("section").filter({
      has: page.getByRole("button", { name: actionName, exact: true }),
    });
    await expect(empty).toHaveCSS("text-align", "center");
    await expect(empty).toHaveCSS("align-items", "center");
    await expect(
      empty.locator('[data-tone="pending"] [data-tp-icon]'),
    ).toHaveCount(0);
    if (tab === "records") {
      await expect(empty.locator('[data-tone="pending"]')).toHaveCount(0);
      await expect(
        empty.getByText(/You can also upload your own records/),
      ).toBeVisible();
    }
  }
  await page.goto("/records?tab=labs");
  await page
    .getByRole("button", { name: "Book appointment", exact: true })
    .click();
  await expect(page).toHaveURL(/\/book$/);
  await page.goto("/records?tab=records");
  await page
    .getByRole("button", { name: "Upload Records", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: /Medical records/ }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("dialog", { name: /Upload/ })).toBeVisible();
  await page.goto("/appointments");
  await expect(page.getByText(/You’ll start seeing/)).toHaveCount(0);
  await page.goto("/appointments?tab=past");
  await expect(page.getByText(/You’ll start seeing past visits/)).toBeVisible();
});

test("visit documents open from cards in a bottom sheet and search remains usable", async ({
  page,
}) => {
  await page.goto("/records?tab=visits");
  await expect(page.getByRole("article")).toHaveCount(4);
  await expect(page.getByRole("dialog")).toHaveCount(0);
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
  await expect(sheet).toBeVisible();
  await expect(sheet.locator("canvas")).toBeVisible();
  await sheet.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search visits" })
    .fill("no-match-anywhere");
  await expect(page.getByText("Nothing matches your search")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Search visits" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(4);
});
