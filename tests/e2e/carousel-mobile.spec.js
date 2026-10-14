import { test, expect } from "@playwright/test";

const categories = ["appointments", "records", "abha", "packages"];

// Check actual text ranges as well as element boxes: a card can fit while
// a nested Button label or metadata span silently clips its contents.
async function expectUnclipped(card) {
  const problems = await card.evaluate((node) => {
    const errors = [];
    const bounds = node.getBoundingClientRect();
    const track = node.parentElement;
    const inside = (r, b) =>
      r.left >= b.left - 1 &&
      r.right <= b.right + 1 &&
      r.top >= b.top - 1 &&
      r.bottom <= b.bottom + 1;
    if (!inside(bounds, track.getBoundingClientRect()))
      errors.push("card outside track");
    if (track.scrollHeight > track.clientHeight + 1)
      errors.push("vertical scroll");
    for (const el of node.querySelectorAll("*")) {
      if (el.closest("[data-pattern]")) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) continue;
      if (!inside(rect, bounds)) errors.push(`outside card: ${el.className}`);
      if (el.matches("h2, p")) {
        if (getComputedStyle(el).whiteSpace !== "nowrap")
          errors.push("banner text can wrap");
        if (rect.height > parseFloat(getComputedStyle(el).lineHeight) + 1)
          errors.push("banner text uses multiple lines");
        if (el.title !== el.textContent)
          errors.push("full banner text is unavailable");
        continue;
      }
      if (el.clientWidth && el.scrollWidth > el.clientWidth + 1)
        errors.push(`overflow: ${el.textContent}`);
      if (el.matches("[data-tp-icon]")) {
        if (rect.width < 12 || rect.height < 12) errors.push("shrunk icon");
        if (
          el.closest("button") &&
          !inside(rect, el.closest("button").getBoundingClientRect())
        )
          errors.push("icon outside CTA");
      }
      for (const child of el.childNodes) {
        if (child.nodeType !== Node.TEXT_NODE || !child.textContent.trim())
          continue;
        const range = document.createRange();
        range.selectNodeContents(child);
        for (const r of range.getClientRects()) {
          if (!inside(r, bounds))
            errors.push(`clipped text: ${child.textContent}`);
          if (
            el.closest("button") &&
            !inside(r, el.closest("button").getBoundingClientRect())
          )
            errors.push(`clipped CTA: ${child.textContent}`);
        }
      }
    }
    return errors;
  });
  expect(problems).toEqual([]);
}

for (const scenario of ["current", "first visit", "long content"]) {
  test(`four mobile carousel cards keep all content visible: ${scenario}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() =>
      localStorage.setItem(
        "tatva-admin-config",
        JSON.stringify({
          configVersion: 2,
          features: { packages: true },
        }),
      ),
    );
    await page.goto("/");
    await page.evaluate((scenario) => {
      const key = "tatva-patient-demo-v1";
      const state = JSON.parse(localStorage.getItem(key));
      state.seedVersion = 7;
      if (scenario === "first visit") {
        state.appointments = [];
        state.records = [];
        state.packageRequests = [];
        state.healthLinks = {};
      }
      if (scenario === "long content") {
        state.healthLinks.self = {
          abha: {
            address: "aarav.sharma.longpatientaddress@abdm",
            identifier: "12-3456-7890-1234",
          },
        };
        state.records = [
          {
            ...state.records[0],
            memberId: "self",
            new: true,
            title: "Comprehensive laboratory and radiology assessment report",
            category: "Laboratory investigations and diagnostic imaging",
          },
        ];
        state.packageRequests = [
          {
            id: "mobile-layout",
            memberId: "self",
            status: "Requested",
            date: "2099-12-31",
            itemName: "Comprehensive preventive health and wellness assessment",
            clinicName:
              "Indiranagar advanced diagnostic and preventive care centre",
          },
        ];
      }
      localStorage.setItem(key, JSON.stringify(state));
    }, scenario);
    await page.reload();
    for (const width of [320, 360, 375, 390, 414, 430]) {
      await page.setViewportSize({ width, height: 932 });
      await page.evaluate(() => document.fonts.ready);
      await expect(
        page.getByRole("button", { name: /Show banner/ }),
      ).toHaveCount(4);
      for (let i = 0; i < categories.length; i++) {
        await page
          .getByRole("button", { name: new RegExp(`Show banner ${i + 1}:`) })
          .click();
        const card = page.locator("[data-category]:not([inert])");
        await expect(card).toHaveAttribute("data-category", categories[i]);
        await expect(card.locator("button")).toBeVisible();
        await expectUnclipped(card);
      }
      expect(
        await page
          .locator("main")
          .evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
      ).toBe(true);
    }
    // Verify the fourth card's destination, not just its appearance.
    await page.locator("[data-category]:not([inert]) button").click();
    await expect(page).toHaveURL(
      scenario === "long content" ? /\/packages\?tab=bookings$/ : /\/packages$/,
    );
  });
}
