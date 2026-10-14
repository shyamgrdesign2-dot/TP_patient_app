import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Health packages & vaccines are off until the hospital switches them on.
const enablePackages = (page) =>
  page.addInitScript(() =>
    localStorage.setItem(
      "tatva-admin-config",
      JSON.stringify({ configVersion: 2, features: { packages: true } }),
    ),
  );
// Booking opens on a chooser the first time: assistant or manual.
const bookManually = (page) =>
  page.getByRole("button", { name: /Book manually/ }).click();
// Fill the family form's required fields (date of birth mode).
async function fillMember(scope, page, { name, relation, dob, gender, phone }) {
  await scope.getByLabel("Full name", { exact: true }).fill(name);
  await scope.getByRole("button", { name: "Relationship" }).click();
  await page.getByRole("option", { name: relation, exact: true }).click();
  await scope.getByLabel("Date of birth", { exact: true }).fill(dob);
  await scope.getByRole("button", { name: gender, exact: true }).click();
  await scope.getByLabel("Mobile number", { exact: true }).fill(phone);
  await scope.getByRole("checkbox").check();
}

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
    page.getByRole("tab", { name: /Medical records/ }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: /Visits/ }).click();
  await expect(
    page.getByRole("img", { name: "Cardiology consultation, page 1" }),
  ).toBeVisible();
  await expect(
    page.getByText("Vitamin D insufficiency", { exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("img", { name: "Cardiology consultation, page 1" }),
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
  await bookManually(page);
  await page.getByRole("button", { name: "09:00 AM", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: /^Rajesh .*\(Father\)/ }).click();
  await expect(page.getByLabel("Reason for your visit (optional)")).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm appointment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your appointment is confirmed" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/appointments\/confirmed\/TP-/);
  await page.getByRole("button", { name: "Go back" }).click();
  await expect(page).toHaveURL(/\/appointments$/);
  await expect(
    page.getByRole("button", { name: /For Rajesh Sharma/ }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Visits", exact: true })
    .click();
  await page
    .getByRole("button", { name: /View appointment with/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Reschedule visit" }).click();
  await page.getByRole("button", { name: "09:30 AM", exact: true }).click();
  await page.getByRole("button", { name: "Confirm new time" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(/09:30 AM/).first()).toBeVisible();
  await page
    .getByRole("button", { name: /View appointment with/ })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Cancel appointment", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel appointment", exact: true })
    .click();
  await page.getByRole("tab", { name: /^Cancelled(?: \(\d+\))?$/ }).click();
  await expect(page.getByText("Dr. Meera Iyer", { exact: true })).toBeVisible();
});

test("record uploads persist and are attached to the current patient", async ({
  page,
}) => {
  await page.goto("/records?tab=records");
  await page
    .getByRole("button", { name: "Upload medical records", exact: true })
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
    .getByRole("dialog")
    .getByLabel("Record type", { exact: true })
    .selectOption("Radiology");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: /^View My sample scan/ }).click();
  await expect(
    page.getByRole("dialog").getByRole("img", { name: "My sample scan" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download file" }).click();
  expect((await download).suggestedFilename()).toBe("sample.png");
});

test("billing is view-only with invoice and receipt downloads", async ({
  page,
}) => {
  await page.goto("/billing");
  await page.getByRole("button", { name: /INV-1048/ }).click();
  await expect(
    page.getByText(/Please pay at the hospital billing desk/),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /pay/i })).toHaveCount(0);
  const invoice = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download invoice" }).click();
  expect((await invoice).suggestedFilename()).toBe("INV-1048-invoice.txt");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: /INV-1021/ }).click();
  const receipt = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download receipt" }).click();
  expect((await receipt).suggestedFilename()).toBe("INV-1021-receipt.txt");
});

test("branding lives in the admin console, not the patient app", async ({
  page,
  context,
}) => {
  // Theme now sits inside App configuration; the old /admin/theme redirects.
  await page.goto("/more");
  await expect(page.getByText("Hospital branding preview")).toHaveCount(0);
  await page.goto("/branding");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  const admin = await context.newPage();
  await admin.goto("/admin/theme");
  await admin.getByRole("radio", { name: /Admin doctor/ }).click();
  await expect(admin).toHaveURL(/\/admin\/app$/);
  // App configuration opens on the preview and summary; Edit opens the form.
  await expect(admin.getByTitle("Patient app preview")).toBeVisible();
  if (await admin.getByRole("button", { name: "Edit", exact: true }).count())
    await admin.getByRole("button", { name: "Edit", exact: true }).click();
  await admin.getByLabel("Primary colour picker").fill("#205c44");
  await admin
    .getByLabel("Hospital name", { exact: true })
    .fill("Tatva Care Hospital");
  await admin.getByLabel("Heading font").selectOption("Poppins");
  await admin.getByRole("button", { name: "Save changes" }).click();
  await expect(admin.getByRole("button", { name: "Save changes" })).toHaveCount(
    0,
  );
  await page.goto("/");
  expect(
    await page
      .locator("html")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--tesseract-blue-500").trim(),
      ),
  ).toBe("#205c44");
  // The chosen Google font is loaded and applied to headings.
  await expect(
    page.locator('link[href*="fonts.googleapis.com"][href*="Poppins"]'),
  ).toHaveCount(1);
  expect(
    await page
      .locator("html")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--tesseract-font-heading"),
      ),
  ).toContain("Poppins");
});

test("admin fees come from the console; doctors without one stay bookable", async ({
  page,
  context,
}) => {
  const admin = await context.newPage();
  await admin.goto("/admin/doctors");
  await expect(admin.getByRole("button", { name: "Add clinic" })).toHaveCount(
    0,
  );
  await expect(admin.getByText("Synced from Tatva Practice")).toBeVisible();
  await expect(
    admin.getByRole("columnheader", { name: "Fees", exact: true }),
  ).toBeVisible();
  const ananya = admin.getByRole("row", { name: /Dr. Ananya Shah/ });
  await expect(ananya).toContainText("Not set");
  await expect(
    admin.getByRole("row", { name: /Dr. Meera Iyer/ }),
  ).toContainText("₹700");
  // Patient app: no price for Dr. Ananya Shah, and booking still works.
  await page.goto("/doctors");
  const card = page.locator("article", { hasText: "Dr. Ananya Shah" });
  await expect(card).toContainText("Fee payable at the clinic");
  await expect(
    card.getByRole("button", { name: "Book a visit" }),
  ).toBeEnabled();
  // Setting a fee in the console shows it to patients.
  await ananya.getByRole("button", { name: /Add fees/ }).click();
  await admin.getByLabel("In-clinic fee (₹)").fill("900");
  await admin.getByRole("button", { name: "Save fees" }).click();
  await expect(ananya).toContainText("₹900");
  await page.reload();
  await expect(card).toContainText("₹900");
});

test("hospital contacts offer call and WhatsApp without callback requests", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const brand = JSON.parse(localStorage.getItem("tatva-brand-preview"));
    Object.assign(brand, {
      bookingPhone: "080 4718 2000",
      whatsappPhone: "98450 12345",
      callbackEnabled: true,
    });
    localStorage.setItem("tatva-brand-preview", JSON.stringify(brand));
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Emergency hospital contacts" })
    .click();
  const sheet = page.getByRole("dialog");
  await expect(
    sheet.getByRole("link", { name: "Call appointments & front desk" }),
  ).toHaveAttribute("href", "tel:08047182000");
  await expect(
    sheet.getByRole("link", { name: "Chat whatsapp" }),
  ).toHaveAttribute("href", "https://wa.me/919845012345");
  await expect(
    sheet.getByRole("button", { name: "Request", exact: true }),
  ).toHaveCount(0);
  await expect(sheet).not.toContainText("Request a callback");
  await page.goto("/admin/overview");
  await expect(page).toHaveURL(/\/admin\/app$/);
  await expect(
    page
      .getByLabel("Admin sections")
      .getByRole("button", { name: "Overview", exact: true }),
  ).toBeDisabled();
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
  await page.getByRole("button", { name: "Sign out" }).click();
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
  const dialog = page.getByRole("dialog");
  await fillMember(dialog, page, {
    name: "Neha Sharma",
    relation: "Sister",
    dob: "1998-02-12",
    gender: "Female",
    phone: "9000000004",
  });
  await dialog
    .getByRole("button", { name: "Add family member", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Neha Sharma" }),
  ).toBeVisible();
});

test("family form takes an age or a custom relationship, requires the essentials and has no allergies", async ({
  page,
}) => {
  await page.goto("/family?add=1");
  const dialog = page.getByRole("dialog");
  const save = dialog.getByRole("button", {
    name: "Add family member",
    exact: true,
  });
  const error = dialog.getByRole("alert");
  // Gone: allergies, the demo-consent notice and "Prefer not to say".
  await expect(dialog.getByLabel(/allerg/i)).toHaveCount(0);
  await expect(dialog).not.toContainText(/allerg|demo consent/i);
  await expect(
    dialog.getByRole("group", { name: "Gender" }).getByRole("button"),
  ).toHaveText(["Male", "Female", "Other"]);
  // Every required field is checked, in order.
  await save.click();
  await expect(error).toContainText("Enter the full name");
  await dialog.getByLabel("Full name", { exact: true }).fill("Kabir Sharma");
  await save.click();
  await expect(error).toContainText("Select the relationship");
  await dialog.getByRole("button", { name: "Relationship" }).click();
  await expect(page.getByRole("option")).toHaveText([
    "Father",
    "Mother",
    "Spouse",
    "Son",
    "Daughter",
    "Brother",
    "Sister",
    "Grandfather",
    "Grandmother",
    "Other",
  ]);
  await page.getByRole("option", { name: "Other", exact: true }).click();
  await save.click();
  await expect(error).toContainText("Enter the relationship");
  await dialog.getByLabel("Relationship (other)").fill("Nephew");
  await save.click();
  await expect(error).toContainText("date of birth or an age");
  // Age instead of a date of birth, with months for an infant.
  await dialog.getByRole("radio", { name: "Age", exact: true }).click();
  await expect(dialog.getByLabel("Date of birth", { exact: true })).toHaveCount(
    0,
  );
  await dialog.getByLabel("Age in years").fill("0");
  await dialog.getByLabel("Age in months").fill("7");
  await save.click();
  await expect(error).toContainText("Select a gender");
  await dialog.getByRole("button", { name: "Male", exact: true }).click();
  await save.click();
  await expect(error).toContainText("valid 10-digit mobile number");
  await dialog.getByLabel("Mobile number", { exact: true }).fill("9000000009");
  await save.click();
  await expect(error).toContainText("permission");
  await dialog.getByRole("checkbox").check();
  await save.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const card = page.locator("article", { hasText: "Kabir Sharma" });
  await expect(card).toContainText("Nephew");
  await expect(card).toContainText("7 months");
  await expect(card).not.toContainText("0 yrs");
  // The age and the custom relationship come back when the profile is edited.
  await page
    .getByRole("button", { name: "Edit Kabir Sharma’s profile" })
    .click();
  await expect(dialog.getByLabel("Age in months")).toHaveValue("7");
  await expect(dialog.getByLabel("Relationship (other)")).toHaveValue("Nephew");
  // A parent can't be saved as a baby (the old "Father, 0 yrs").
  await dialog.getByRole("button", { name: "Relationship" }).click();
  await page.getByRole("option", { name: "Father", exact: true }).click();
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(error).toContainText("too young for a father");
});

test("patient switcher adds a family member and selects them, with a link to manage family", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/appointments");
  await page.getByRole("button", { name: /Switch patient/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Manage family" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Add a family member" }).click();
  await fillMember(dialog, page, {
    name: "Isha Sharma",
    relation: "Daughter",
    dob: "2019-03-04",
    gender: "Female",
    phone: "9000000010",
  });
  await dialog
    .getByRole("button", { name: "Add family member", exact: true })
    .click();
  // Back on the list, with the new profile selected.
  await expect(dialog).toContainText("Who are we caring for?");
  await expect(
    dialog.getByRole("button", { name: /Isha Sharma/ }),
  ).toHaveAttribute("data-selected", "true");
  const fits = await dialog.evaluate(
    (el) => el.scrollWidth <= el.clientWidth + 1,
  );
  expect(fits).toBe(true);
  await dialog.getByRole("button", { name: "Manage family" }).click();
  await expect(page).toHaveURL(/\/family$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.locator("article", { hasText: "Isha Sharma" }),
  ).toContainText("Active");
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
    "/billing",
    "/hospital",
    "/more",
    "/notifications",
    "/settings",
    "/emergency",
    "/abha",
    "/link-records",
    "/packages",
    "/packages/essential",
    "/packages?tab=bookings",
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
  await dialog.getByRole("radio", { name: /Whitefield/ }).click();
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

test("patients link ABHA with verification, persist and unlink without UHID linking", async ({
  page,
}) => {
  await page.goto("/records?tab=records");
  await page.getByRole("button", { name: /Link your health records/ }).click();
  await expect(
    page.getByRole("button", { name: "Link UHID", exact: true }),
  ).toHaveCount(0);
  // ABHA links through the full ABHA flow (link existing by ABHA number).
  await expect(page).toHaveURL(/\/abha$/);
  await page.getByRole("button", { name: "Link using ABHA number" }).click();
  await page.getByLabel("ABHA number").fill("12345678901234");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Digit 1").fill("123456");
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await page.getByRole("button", { name: "Link ABHA", exact: true }).click();
  await page.getByLabel("Digit 1").fill("123456");
  await page.getByRole("button", { name: "Link ABHA", exact: true }).click();
  await expect(page).toHaveURL(/\/records/, { timeout: 8000 });
  await page.goto("/link-records");
  await page.reload();
  await expect(page.getByText("Linked", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: /For Aarav Sharma/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Rajesh Sharma/ })
    .click();
  // Rajesh has his own sample ABHA linked, and none of Aarav's links.
  await expect(page.getByText("Linked", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: /For Rajesh Sharma/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Aarav Sharma/ })
    .click();
  await page.getByRole("button", { name: "Unlink", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Unlink identity", exact: true })
    .click();
  await expect(page.getByText("Linked", { exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/abha$/);
  await expect(
    page.getByRole("button", { name: "Link using ABHA number" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Link UHID", exact: true }),
  ).toHaveCount(0);
});

test("direct ABHA entry and reduced-motion sheets remain accessible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/abha");
  await expect(
    page.getByRole("heading", { name: "Create your ABHA" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact),
    ),
  ).toEqual([]);
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
    page
      .getByRole("region", { name: "ABHA and hospital identity" })
      .getByRole("button", { name: "Link ABHA", exact: true }),
  ).toHaveCSS("border-radius", "12px");
  await expect(
    page.getByRole("group", { name: /1 of .*Upcoming appointment/ }),
  ).toContainText("Dr. Meera Iyer");
  await page.getByRole("button", { name: /Show banner 2:/ }).click();
  await expect(
    page.getByRole("button", { name: "Show banner 2: New health record" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("group", { name: "2 of 3: New health record" }),
  ).toContainText("Complete blood count");
  await page.getByRole("button", { name: /Show banner 3:/ }).click();
  await expect(
    page.getByRole("button", { name: "Show banner 3: Link your ABHA" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("group", { name: "3 of 3: Link your ABHA" }),
  ).toContainText("Link ABHA");
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
  await page
    .getByRole("region", { name: "ABHA and hospital identity" })
    .getByRole("button", { name: "Link ABHA", exact: true })
    .click();
  await expect(page).toHaveURL(/\/abha/);
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
    await expect(cards).toHaveCount(9);
    expect(
      await cards.evaluateAll((ns) => [
        ...new Set(ns.map((n) => n.dataset.category)),
      ]),
    ).toEqual(["appointments", "records", "abha"]);
    for (let i = 0; i < 3; i++) {
      await page
        .getByRole("button", { name: new RegExp(`Show banner ${i + 1}:`) })
        .click();
      const current = page.locator("[data-category]:not([inert])");
      await expect(current).toHaveAttribute(
        "data-category",
        ["appointments", "records", "abha"][i],
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
      await expect(current.locator("[data-pattern]")).toHaveAttribute(
        "data-pattern",
        "lattice",
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
  ]) {
    await page.goto(path);
    const header = page.locator('header[class*="pageHeader"]');
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

test("carousel loops in both directions with stable neighbours and no arrow buttons", async ({
  page,
}) => {
  await page.goto("/");
  const track = page.locator('[class*="bannerTrack"]');
  const current = page.locator("[data-category]:not([inert])");
  await expect(
    page.getByRole("button", { name: /Next care update|Previous care update/ }),
  ).toHaveCount(0);
  await expect(current).toHaveAttribute("data-category", "appointments");
  // Four steps back from slide 1 of 3 wraps to slide 3; one forward returns.
  for (let n = 0; n < 4; n++) {
    await track.evaluate((node) =>
      node.scrollBy({
        left: -(node.children[0].offsetWidth + 10),
        behavior: "instant",
      }),
    );
    await page.waitForTimeout(230);
  }
  await expect(current).toHaveAttribute("data-category", "abha");
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
  expect(geometry.angle).toBe("none");
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
  await bookManually(page);
  await page.getByRole("button", { name: "09:00 AM", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Reason for your visit (optional)")).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Add a new family member" }),
  ).toBeVisible();
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
  await page.goto("/records?tab=records");
  await expect(
    page
      .getByRole("button", { name: /Link your health records/ })
      .getByRole("img", { name: "ABHA", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Upload medical records", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Close", exact: true }),
  ).toHaveCSS("border-width", "0px");
  await dialog.getByLabel("Record file", { exact: true }).setInputFiles({
    name: "layout-check.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l8sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
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
    "none",
  );
});

test("three Home promotions include empty reports and ABHA linking", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("tatva-patient-demo-v1"));
    state.appointments = [];
    state.records = [];
    state.bills = [];
    // Mark the save as current so the app does not re-seed hospital data.
    state.seedVersion = 7;
    localStorage.setItem("tatva-patient-demo-v1", JSON.stringify(state));
  });
  await page.reload();
  await expect(
    page.getByRole("group", { name: "1 of 3: Book your first visit" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Show banner/ })).toHaveCount(
    3,
  );
  await page.getByRole("button", { name: /Show banner 2:/ }).click();
  await page.getByRole("button", { name: "Add a record", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Upload medical records" }),
  ).toBeVisible();
  await page.goto("/");
  await page.getByRole("button", { name: /Show banner 3:/ }).click();
  const current = page.locator("[data-category]:not([inert])");
  await expect(
    current.getByRole("img", { name: "ABHA", exact: true }),
  ).toBeVisible();
  await current.getByRole("button", { name: "Link ABHA", exact: true }).click();
  await expect(page).toHaveURL(/\/abha$/);
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

test("PDF records render in a tall sheet with share, download, print and no grip", async ({
  page,
}) => {
  await page.goto("/records?record=r2");
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("tablist", { name: "Report view" })).toHaveCount(
    0,
  );
  await expect(
    sheet.getByRole("region", { name: "Original Report", exact: true }),
  ).toBeVisible();
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
  await expect(sheet.getByRole("button", { name: "Zoom PDF" })).toHaveCount(0);
  const download = page.waitForEvent("download");
  await sheet.getByRole("button", { name: "Download file" }).click();
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
  await page.goto("/records?tab=records");
  const tag = page.getByRole("button", { name: /For Aarav Sharma/ });
  const action = page.getByRole("button", {
    name: "Upload medical records",
    exact: true,
  });
  const nav = page.getByRole("navigation");
  expect((await tag.boundingBox()).width).toBeLessThan(260);
  expect((await tag.boundingBox()).height).toBeLessThan(45);
  await expect(tag).toHaveCSS("border-top-width", "1px");
  await page.locator("#app-content").evaluate((n) => (n.scrollTop = 250));
  const headerBox = await page
    .locator("header")
    .filter({ has: tag })
    .boundingBox();
  const patientBox = await tag.boundingBox();
  expect(patientBox.y).toBeGreaterThanOrEqual(headerBox.y);
  expect(patientBox.y + patientBox.height).toBeLessThanOrEqual(
    headerBox.y + headerBox.height,
  );
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
    const { saveFile } = await import("/src/patient/services/files.js");
    await saveFile("delete-me", new Blob(["test"]));
  });
  await page
    .getByRole("button", { name: "Delete account", exact: true })
    .click();
  const sheet = page.getByRole("dialog");
  await expect(
    sheet.getByRole("button", { name: "Delete my account" }),
  ).toBeDisabled();
  await sheet.getByRole("button", { name: "Keep my account" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Delete account", exact: true })
    .click();
  await sheet.getByRole("checkbox").check();
  await sheet.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(() => localStorage.getItem("tatva-patient-demo-v1")),
  ).toBeNull();
  expect(
    await page.evaluate(() => localStorage.getItem("tatva-demo-credential")),
  ).toBeNull();
  expect(
    await page.evaluate(async () => {
      const { getFile } = await import("/src/patient/services/files.js");
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

test("four welcome stories animate, stop on interaction and lead to mobile verification", async ({
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
    page.getByRole("button", { name: /Introduction [1-9]/ }),
  ).toHaveCount(4);
  await expect(page.getByText("Know your turn.")).toHaveCount(0);
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
  const gender = page.getByRole("group", { name: "Gender" });
  await expect(gender.getByRole("button")).toHaveText([
    "Male",
    "Female",
    "Other",
  ]);
  await page.getByRole("button", { name: "Create my profile" }).click();
  await expect(page.getByRole("alert")).toContainText("Please select gender");
  await expect(page).toHaveURL(/\/login$/);
  await gender.getByRole("button", { name: "Female", exact: true }).click();
  await expect(
    gender.getByRole("button", { name: "Female", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Create my profile" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("button", { name: "Care for Neha Test. Switch patient" }),
  ).toBeVisible();
  const firstState = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tatva-patient-demo-v1")),
  );
  expect(firstState.members).toHaveLength(1);
  expect(firstState.members[0]).toMatchObject({
    name: "Neha Test",
    dob: "1992-04-12",
    gender: "Female",
  });
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
    .getByRole("region", { name: "Symptoms not shared" })
    .getByRole("button", { name: "Add symptoms" })
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

test("queue and check-in are gone: Book visit opens doctors and symptoms return to the visit", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Queue", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Appointments", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Book visit", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "How would you like to book?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Book manually/ }).click();
  await expect(page).toHaveURL(/\/doctors\?mode=manual$/);
  await expect(page.getByRole("button", { name: "View queue" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Book a visit" }).first(),
  ).toBeVisible();
  await page.goto("/queue");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await page.goto("/assistant?appointment=TP-24091&return=queue");
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
  await expect(
    page.getByRole("button", { name: /continue to check-in/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Save to my visit" }).click();
  await expect(page).toHaveURL(/\/appointments\?visit=TP-24091/);
  await expect(page.locator("main")).not.toContainText(/check.?in|token/i);
});

test("booking adds and selects a family member without losing the chosen slot", async ({
  page,
}) => {
  await page.goto("/book/meera");
  await expect(page.getByText("Book with voice")).toHaveCount(0);
  await bookManually(page);
  await page.getByRole("button", { name: "09:00 AM", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Add a new family member" }).click();
  const dialog = page.getByRole("dialog");
  await fillMember(dialog, page, {
    name: "Nisha Sharma",
    relation: "Sister",
    dob: "1990-06-15",
    gender: "Female",
    phone: "9876543210",
  });
  await dialog
    .getByRole("button", { name: "Add family member", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText("Nisha Sharma", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("09:00 AM IST", { exact: true })).toBeVisible();
  // The review card is the whole visit: patient, when, type, clinic, fee.
  const review = page.getByRole("region", { name: "Appointment summary" });
  await expect(review.getByTestId("summary-patient")).toContainText(
    /Nisha Sharma.*Sister.*36 yrs.*Female/,
  );
  await expect(review).toContainText(/Date and time.*09:00 AM/);
  await expect(review).toContainText(/Visit type\s*In clinic/);
  await expect(review).toContainText(/Hospital\s*Indiranagar/);
  await expect(review).toContainText(/Consultation fee.*Pay at hospital.*₹700/);
  await page
    .getByRole("button", { name: "Confirm appointment", exact: true })
    .click();
  await page.getByRole("button", { name: "Add symptoms" }).click();
  await expect(
    page.getByRole("heading", { name: "Tell us how you’re feeling." }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("today's visit banner keeps appointment context and symptoms without redundant Home reminders", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("tatva-patient-demo-v1"));
    // Keep the in-clinic visit first regardless of the video slot's time.
    state.appointments.find((v) => v.id === "TP-24095").status = "Cancelled";
    localStorage.setItem("tatva-patient-demo-v1", JSON.stringify(state));
  });
  await page.reload();
  const hero = page.locator('[data-category="appointments"]:not([inert])');
  await expect(hero).toContainText("10:30 AM");
  await expect(hero).not.toContainText(/min wait|Token|Checked in/);
  await expect(hero).toContainText("Indiranagar");
  await expect(
    hero.getByRole("button", { name: "Add symptoms", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Pending symptom reminders" }),
  ).toHaveCount(0);
  await expect(page.locator('[class*="agentStrip"]')).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 720 });
  const symptomButton = hero.getByRole("button", {
    name: "Add symptoms",
    exact: true,
  });
  // The symptom action uses the brand (link) colour for icon and label.
  const buttonColor = await symptomButton.evaluate(
    (n) => getComputedStyle(n).color,
  );
  await expect(symptomButton.locator("[data-tp-icon]")).toHaveCSS(
    "color",
    buttonColor,
  );
  const labelFits = await symptomButton.evaluate((node) => {
    const label = node.querySelector('[class*="_content_"] > span:last-child');
    return label.scrollWidth <= label.clientWidth + 1;
  });
  expect(labelFits).toBe(true);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Visits", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Add symptoms", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add symptoms", exact: true }).click();
  await expect(page).toHaveURL(/assistant\?appointment=TP-24091/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("health packages and vaccines stay hidden until the hospital switches them on", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('[class*="quickIcon"]')).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Packages", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Health packages")).toHaveCount(0);
  await page.goto("/more");
  await expect(
    page.getByRole("button", { name: "Manage family" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Health packages & vaccines" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "My bookings" })).toHaveCount(
    0,
  );
  for (const route of [
    "/packages",
    "/packages/essential",
    "/packages?tab=bookings",
  ]) {
    await page.goto(route);
    await expect(page.locator("main")).toContainText(
      "hasn’t opened health packages and vaccines",
    );
  }
  // A config saved while packages were on by default is switched off once,
  // and stays on after the hospital turns it back on in the console.
  await page.evaluate(() =>
    localStorage.setItem(
      "tatva-admin-config",
      JSON.stringify({ features: { packages: true } }),
    ),
  );
  await page.goto("/");
  await expect(page.locator('[class*="quickIcon"]')).toHaveCount(3);
  await page.goto("/admin/packages");
  await expect(page).toHaveURL(/\/admin\/app$/);
  await expect(
    page
      .getByLabel("Admin sections")
      .getByRole("button", { name: "Packages & vaccines", exact: true }),
  ).toBeDisabled();
  await enablePackages(page);
  await page.goto("/");
  await expect(page.locator('[class*="quickIcon"]')).toHaveCount(4);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Packages", exact: true }),
  ).toBeVisible();
});

test("book a health package, see it under My bookings and cancel it", async ({
  page,
}) => {
  await enablePackages(page);
  await page.goto("/packages");
  await expect(
    page.getByRole("heading", { name: "Health packages & vaccines" }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: /Bookings/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /My requests/ })).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /^Essential health check/ }).click();
  await expect(page).toHaveURL(/\/packages\/essential$/);
  await expect(page.getByText("Lipid profile")).toBeVisible();
  await expect(
    page.getByText("Pay at the hospital. Online payment coming soon."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Book now" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("radio", { name: /Whitefield/ }).click();
  await sheet
    .getByLabel("Note for the hospital (optional)")
    .fill("Morning please");
  await sheet.getByRole("button", { name: "Send booking request" }).click();
  await expect(
    page.getByText("Booking request sent. The hospital will call to confirm."),
  ).toBeVisible();
  await sheet.getByRole("button", { name: "View my bookings" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/packages\?tab=bookings$/);
  const card = page.locator("article", { hasText: "Essential health check" });
  await expect(card.getByText("Requested", { exact: true })).toBeVisible();
  await expect(card).toContainText("Whitefield");
  await page.reload();
  await card.getByRole("button", { name: "Cancel booking" }).click();
  await expect(card.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Cancel booking" }),
  ).toHaveCount(0);
  // Older notification links still land on My bookings.
  await page.goto("/packages?tab=requests");
  await expect(page).toHaveURL(/\/packages\?tab=bookings$/);
  await page.goto("/packages/bookings");
  await expect(page).toHaveURL(/\/packages\?tab=bookings$/);
  await page.goto("/more");
  await page.getByRole("button", { name: "My bookings" }).click();
  await expect(page.getByRole("radio", { name: /Bookings/ })).toBeChecked();
});

test("home shows four quick actions and the past visit card from My visits", async ({
  page,
}) => {
  await enablePackages(page);
  await page.goto("/");
  await expect(page.locator('[class*="quickIcon"]')).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Packages", exact: true }),
  ).toBeVisible();
  const past = page.getByLabel("Past consultations");
  const card = past.locator("article").first();
  await expect(card.getByText("Completed", { exact: true })).toBeVisible();
  await expect(card).not.toContainText("Rx");
  await card.getByRole("button", { name: "View details" }).click();
  await expect(page).toHaveURL(/\/appointments\?visit=/);
  await expect(page.getByRole("dialog")).toContainText("Appointment details");
});

test("My visits has one bottom booking action and no header booking CTA", async ({
  page,
}) => {
  await page.goto("/appointments");
  const header = page.getByRole("button", { name: "Book a new appointment" });
  const floating = page.getByRole("button", {
    name: "Book new appointment",
    exact: true,
  });
  await expect(header).toHaveCount(0);
  await expect(floating).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  // Measured at rest, after the one-time entry animation.
  await floating.evaluate((el) =>
    Promise.all(el.parentElement.getAnimations().map((a) => a.finished)),
  );
  const box = await floating.boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(
    (await nav.boundingBox()).y - 12,
  );
  await floating.click();
  await expect(
    page.getByRole("dialog", { name: "How would you like to book?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Book manually/ }).click();
  await expect(page).toHaveURL(/\/doctors\?mode=manual$/);
  // No upcoming visits: the empty state is the only call to action.
  await page.goto("/appointments");
  await page.getByRole("button", { name: /Switch patient/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Sunita Sharma/ })
    .click();
  await expect(header).toHaveCount(0);
  await expect(page.locator("#page-action button")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Book new appointment", exact: true }),
  ).toBeVisible();
});

test("booking assistant books a visit end to end from free text and quick replies", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/doctors");
  await page
    .getByRole("button", { name: /Book a visit/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "How would you like to book?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Book with (AI )?assistant/ }).click();
  await expect(page).toHaveURL(/\/book\/meera\?mode=assistant$/);
  const feed = page.locator('[aria-live="polite"]');
  // Greets, confirms the doctor and asks who the visit is for.
  await expect(feed).toContainText("book a visit with Dr. Meera Iyer");
  await expect(feed).toContainText("Who is this visit for?");
  const replies = page.getByRole("group", { name: "Quick replies" });
  await expect(replies.getByRole("button")).toHaveText([
    "Myself (Aarav)",
    "Rajesh (Father)",
    "Sunita (Mother)",
    "Add family member",
  ]);
  const say = async (text) => {
    await page.getByLabel("Type your message").fill(text);
    await page.getByRole("button", { name: "Send" }).click();
  };
  // Unknown input is asked again, politely.
  await say("purple elephants");
  await expect(feed).toContainText("Sorry, I didn’t catch who this is for.");
  await say("for my father");
  await expect(feed).toContainText("in clinic or on a video consultation?");
  await replies.getByRole("button", { name: "Video consultation" }).click();
  await expect(feed).toContainText("Which day works for you?");
  await expect(replies.getByRole("button").first()).toHaveText("Tomorrow");
  await say("tomorrow evening");
  await expect(feed).toContainText("open evening times tomorrow");
  await expect(replies.getByRole("button")).toHaveText([
    "05:30 PM",
    "06:00 PM",
    "06:30 PM",
  ]);
  await replies.getByRole("button", { name: "06:00 PM" }).click();
  const summary = page.getByRole("region", { name: "Appointment summary" });
  await expect(summary).toContainText("Dr. Meera Iyer");
  await expect(summary.getByTestId("summary-patient")).toContainText(
    /Rajesh Sharma.*Father.*yrs.*Male/,
  );
  await expect(summary).toContainText("06:00 PM");
  await expect(summary).toContainText("Video consultation");
  await expect(summary).toContainText("₹600");
  // Change one thing from the summary, then confirm.
  await page.getByRole("button", { name: "Change something" }).click();
  await replies.getByRole("button", { name: "Visit type" }).click();
  await say("actually in person");
  await expect(summary).toContainText("In clinic");
  await expect(summary).toContainText("₹700");
  await page.getByRole("button", { name: "Confirm appointment" }).click();
  // Same booking, same confirmation screen as the manual flow.
  await expect(page).toHaveURL(/\/appointments\/confirmed\/TP-/);
  await expect(
    page.getByRole("heading", { name: "Your appointment is confirmed" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Appointment summary" }),
  ).toContainText(/Rajesh Sharma.*06:00 PM.*In clinic.*Indiranagar/s);
  const visits = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("tatva-patient-demo-v1")).appointments,
  );
  expect(visits[0]).toMatchObject({
    doctorId: "meera",
    memberId: "father",
    time: "06:00 PM",
    type: "In-person",
    status: "Confirmed",
    source: "Patient",
  });
  // The choice is remembered for the session, and manual is one tap away
  // with the answers given so far.
  await page.goto("/book/arjun");
  await page.getByRole("button", { name: /Book with AI assistant/ }).click();
  await expect(page).toHaveURL(/\/book\/arjun\?mode=assistant$/);
  await page
    .getByRole("group", { name: "Quick replies" })
    .getByRole("button", { name: "Sunita (Mother)" })
    .click();
  await page.getByRole("button", { name: "Switch to manual" }).click();
  await expect(page).toHaveURL(/\/book\/arjun\?mode=manual$/);
  await page.getByRole("button", { name: "09:00 AM", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("radio", { name: /^Sunita/ })).toBeChecked();
});

test("booking assistant voice mode plays a sample patient and still waits for confirmation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/book/meera?mode=assistant");
  await expect(page.locator('[aria-live="polite"]')).toContainText(
    "Who is this visit for?",
  );
  await page.getByRole("button", { name: "Speak instead" }).click();
  const summary = page.getByRole("region", { name: "Appointment summary" });
  await expect(summary).toContainText("Aarav Sharma");
  await expect(summary).toContainText("In clinic");
  await expect(page).toHaveURL(/mode=assistant$/);
  await expect(
    page.getByRole("button", { name: "Confirm appointment" }),
  ).toBeVisible();
});

test("confirmation screen has no ID, a full card, two actions and survives symptoms, back and refresh", async ({
  page,
}) => {
  await page.goto("/book/meera");
  await bookManually(page);
  await page.getByRole("button", { name: "04:00 PM", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // Browser Back walks the steps instead of leaving the booking.
  await expect(page).toHaveURL(/mode=manual&step=1$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/book\/meera\?mode=manual$/);
  await expect(
    page.getByRole("button", { name: "04:00 PM", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: /^Rajesh/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm appointment", exact: true })
    .click();
  await expect(page).toHaveURL(/\/appointments\/confirmed\/TP-/);
  const main = page.locator("main");
  await expect(
    page.getByRole("heading", { name: "Your appointment is confirmed" }),
  ).toBeVisible();
  await expect(main).not.toContainText(/TP-[0-9A-F]{8}/);
  await expect(main).not.toContainText("A little closer");
  const card = page.getByRole("region", { name: "Appointment summary" });
  await expect(card).toContainText("Dr. Meera Iyer");
  await expect(card.getByTestId("summary-patient")).toContainText(
    /Rajesh Sharma.*Father.*yrs.*Male/,
  );
  await expect(card).toContainText("04:00 PM");
  await expect(card).toContainText("In clinic");
  await expect(card).toContainText("100 Feet Road, Indiranagar, Bengaluru");
  await expect(card).toContainText(/Pay at hospital.*₹700/);
  await expect(
    card.getByRole("link", { name: /Call Indiranagar clinic/ }),
  ).toHaveAttribute("href", "tel:+918047182000");
  await expect(
    card.getByRole("link", { name: "Directions to Indiranagar clinic" }),
  ).toHaveAttribute("href", /maps\.google\.com/);
  await expect(main).toContainText("Please arrive 15 minutes before");
  // Exactly two actions.
  await expect(
    page.getByRole("button", { name: "View my appointments" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add to calendar" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Go home" })).toBeVisible();
  const confirmed = page.url();
  // Add symptoms, then Back: the confirmation again, not the booking steps.
  await page.getByRole("button", { name: "Add symptoms" }).click();
  await expect(page).toHaveURL(/\/assistant\?appointment=TP-/);
  await page.getByRole("button", { name: "Go back" }).click();
  await expect(page).toHaveURL(confirmed);
  await expect(
    page.getByRole("heading", { name: "Your appointment is confirmed" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm appointment" }),
  ).toHaveCount(0);
  // It survives a refresh, and browser Back never returns to the steps.
  await page.reload();
  await expect(card).toContainText("Rajesh Sharma");
  await page.goBack();
  await expect(page).not.toHaveURL(/\/book\//);
  await page.goto(confirmed);
  await page.getByRole("button", { name: "Go home" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("lab reports open on original documents with analysis and nested explanations in the same sheet", async ({
  page,
}) => {
  await page.goto("/records?tab=labs");
  const card = page.getByRole("button", { name: /^View Diabetes screening/ });
  await expect(card).toContainText("AI analysis");
  await card.click();
  await expect(page).toHaveURL(/\/records\?tab=labs&record=r12$/);
  const report = page.getByRole("dialog", {
    name: "Diabetes screening",
    exact: true,
  });
  await expect(
    report.getByRole("tab", { name: "Original Report" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(report.locator("canvas")).toBeVisible();
  await report.getByRole("tab", { name: "AI analysis" }).click();
  await report
    .getByRole("button", { name: "Generate AI analysis", exact: true })
    .click();
  const summary = page.getByRole("button", {
    name: /3 parameters are concerning/,
  });
  await expect(summary).toBeVisible();
  const list = page.getByRole("list", { name: "Parameters" });
  await expect(list.getByRole("listitem")).toHaveCount(4);
  await expect(list.getByRole("listitem").first()).toContainText(
    "Out of ideal range",
  );
  // Filters narrow the list; search narrows it further.
  await page.getByRole("button", { name: "Out of range (1)" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list).toContainText("Glucose, fasting");
  await page.getByRole("button", { name: "Borderline (2)" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await page.getByLabel("Search by parameter").fill("hba");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list).toContainText("HbA1c");
  await page.getByLabel("Search by parameter").fill("zzz");
  await expect(page.getByText("No matching parameters")).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("button", { name: "All parameters" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(4);
  // Each card explains itself in a sheet.
  await page.getByRole("button", { name: "Explain HbA1c" }).click();
  const sheet = page.getByRole("dialog", { name: "HbA1c" });
  await expect(sheet).toContainText("Potential impact");
  await expect(sheet).toContainText("Recommended actions");
  await expect(sheet).toContainText("Borderline");
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);
  // The original document is one tab away.
  await page.getByRole("tab", { name: "Original Report", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Diabetes screening, page 1" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "AI analysis" }).click();
  // The summary narrows the analysis in place; the report sheet stays open.
  await summary.click();
  await expect(page).toHaveURL(/\/records\?tab=labs&record=r12$/);
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(list.getByRole("listitem").first()).toContainText(/112.*mg\/dL/);
  await report
    .getByRole("button", { name: "Show all parameters", exact: true })
    .click();
  await expect(list.getByRole("listitem")).toHaveCount(4);
  await expect(page.getByText(/not a diagnosis/)).toBeVisible();
  await report.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page).toHaveURL(/\/records\?tab=labs$/);
  // Another patient's report is not shown.
  await page.goto("/records/r13");
  await expect(page.getByText("This report isn’t available")).toBeVisible();
});

test("health records are grouped into visits, lab results, medical records, discharge summaries, certificates and history", async ({
  page,
}) => {
  await page.goto("/records");
  await expect(
    page.getByRole("tab", { name: /Medical records/ }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: /Visits/ }).click();
  await expect(page.getByRole("article")).toHaveCount(4);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "View Consultation prescription",
      exact: true,
    })
    .click();
  const prescription = page.getByRole("dialog", {
    name: "Consultation prescription",
    exact: true,
  });
  await expect(prescription.locator("canvas")).toBeVisible();
  await prescription
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Upload medical records" }),
  ).toHaveCount(0);
  await page.goto("/records?tab=labs");
  await expect(page.getByText("3 records")).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Complete blood count" }),
  ).not.toContainText("1 parameter is concerning");
  // Medical records: report summaries are limited to supported lab reports.
  await page.goto("/records?tab=records");
  await expect(page.getByText("4 records")).toBeVisible();
  await page.getByRole("button", { name: "Radiology (1)" }).click();
  await expect(
    page.getByRole("button", { name: /^View Chest X-ray/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^View Urine routine/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "All (4)" }).click();
  await page
    .getByRole("button", {
      name: "View Urine routine & microscopy",
      exact: true,
    })
    .click();
  await expect(page.getByRole("tab", { name: "AI analysis" })).toBeVisible();
  await page.getByRole("tab", { name: "AI analysis" }).click();
  await page
    .getByRole("button", { name: "Generate AI analysis", exact: true })
    .click();
  await expect(
    page.getByRole("tabpanel", { name: "AI analysis" }),
  ).toContainText("A normal urine test");
  await expect(
    page.getByRole("tabpanel", { name: "AI analysis" }),
  ).toContainText("Next steps");
  await page.getByRole("tab", { name: "Original Report", exact: true }).click();
  await expect(page.getByRole("dialog").locator("canvas")).toBeVisible();
  // Certificates and medical history for the current patient.
  await page.goto("/records?tab=certificates");
  await expect(page.getByText("2 records")).toBeVisible();
  await expect(
    page.getByRole("article", {
      name: "Medical leave certificate",
      exact: true,
    }),
  ).toContainText("Valid");
  await page.goto("/records?tab=history");
  await expect(page.getByRole("region", { name: "Allergies" })).toContainText(
    "Dust mites",
  );
  await expect(
    page.getByRole("region", { name: "Additional History" }),
  ).toBeVisible();
  // Discharge summaries belong to the patient who was admitted.
  await page.getByRole("button", { name: /For Aarav Sharma/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Sunita Sharma/ })
    .click();
  await page.goto("/records?tab=discharge");
  await page
    .getByRole("button", { name: "View Discharge summary", exact: true })
    .click();
  const stay = page.getByRole("dialog", { name: "Discharge summary" });
  await expect(stay).toContainText("Orthopaedics, Jayanagar");
  await expect(stay).toContainText("Knee joint aspiration");
  await expect(stay).toContainText("Medicines on discharge");
});
