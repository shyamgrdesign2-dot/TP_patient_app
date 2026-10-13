import { test, expect } from "@playwright/test";

test.setTimeout(60000);

test("website analysis fills editable fields automatically and Cancel restores saved branding", async ({
  page,
}) => {
  await page.route("**/api/brand-import", (route) =>
    route.fulfill({
      json: {
        url: "https://hospital.example/",
        mode: "rules",
        detectionNote: "Rule-based detection. AI extraction is not configured.",
        candidates: [
          {
            key: "hospitalName",
            label: "Hospital name",
            value: "Example Hospital",
            evidence: "Website metadata",
          },
          {
            key: "primary",
            label: "Primary colour",
            value: "#006b68",
            evidence: "Website theme colour",
          },
          {
            key: "ctaGradient",
            label: "Primary button gradient",
            value: "linear-gradient(90deg, #b45bc5, #1a1994)",
            evidence: "CTA",
          },
          {
            key: "fontBody",
            label: "Body font",
            value: "Poppins",
            evidence: "Body CSS",
          },
          {
            key: "shadowStyle",
            label: "Shadow style",
            value: "soft",
            evidence: "Cards",
          },
          { key: "radius", label: "Corner radius", value: 8, evidence: "Card" },
        ],
        warnings: [],
        detectedFonts: [],
      },
    }),
  );
  await page.goto("/admin/app");
  if (await page.getByRole("button", { name: "Edit", exact: true }).isVisible())
    await page.getByRole("button", { name: "Edit", exact: true }).click();
  const name = page.getByLabel("Hospital name", { exact: true });
  const before = await name.inputValue();
  await page
    .getByLabel("Hospital website", { exact: true })
    .fill("https://hospital.example");
  await page
    .getByRole("button", { name: "Analyze website", exact: true })
    .click();
  await expect(
    page.getByText("Your brand details are ready", { exact: true }),
  ).toBeVisible();
  await expect(name).toHaveValue("Example Hospital");
  await expect(
    page.getByLabel("Primary colour hex", { exact: true }),
  ).toHaveValue("#006b68");
  await expect(
    page.getByRole("group", { name: "Brand details to apply" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Apply selected to draft" }),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.querySelector("main")).getPropertyValue(
          "--tesseract-blue-500",
        ),
      ),
    )
    .toBe("#4b4ad5");
  await page
    .getByRole("button", { name: "Review app details", exact: true })
    .click();
  await expect(name).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  if (await page.getByRole("button", { name: "Edit", exact: true }).isVisible())
    await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Hospital name", { exact: true })).toHaveValue(
    before,
  );
});

test("website import API refuses loopback URLs without fetching", async ({
  request,
}) => {
  const response = await request.post("/api/brand-import", {
    data: { url: "http://127.0.0.1" },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toContain(
    "Only public hospital websites",
  );
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("blank and broken logo suggestions preserve existing branding", async ({
  page,
}) => {
  const white =
    "data:image/svg+xml;base64," +
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50"><rect width="200" height="50" fill="white"/></svg>',
    ).toString("base64");
  await page.route("**/api/brand-import", (route) =>
    route.fulfill({
      json: {
        url: "https://hospital.example/",
        candidates: [
          {
            key: "logo",
            label: "Horizontal logo",
            value: white,
            evidence: "Footer",
          },
          {
            key: "logoMark",
            label: "App icon",
            value: "data:image/png;base64,broken",
            evidence: "Metadata",
          },
          {
            key: "primary",
            label: "Primary colour",
            value: "#123456",
            evidence: "CTA",
          },
        ],
      },
    }),
  );
  await page.goto("/admin/app");
  if (await page.getByRole("button", { name: "Edit", exact: true }).isVisible())
    await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Hospital website", { exact: true })
    .fill("https://hospital.example");
  await page
    .getByRole("button", { name: "Analyze website", exact: true })
    .click();
  await expect(
    page.getByText(/Some logos could not be displayed clearly/),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Horizontal logo", exact: true }),
  ).toHaveAttribute("src", /tatvapractice-wordmark/);
  await expect(
    page.getByRole("img", { name: "App icon", exact: true }),
  ).toHaveAttribute("src", /tatvapractice-app-icon/);
  await expect(
    page.getByLabel("Primary colour hex", { exact: true }),
  ).toHaveValue("#123456");
});

test("no detected branding uses an orange notice without a review CTA", async ({
  page,
}) => {
  await page.route("**/api/brand-import", (route) =>
    route.fulfill({ json: { candidates: [], warnings: [] } }),
  );
  await page.goto("/admin/app#hospital");
  const name = page.getByLabel("Hospital name", { exact: true });
  const original = await name.inputValue();
  await page
    .getByLabel("Hospital website", { exact: true })
    .fill("https://hospital.example");
  await page
    .getByRole("button", { name: "Analyze website", exact: true })
    .click();
  await expect(
    page.getByText("No brand details could be detected", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review app details", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("No brand details could be detected", { exact: true }),
  ).toHaveCSS("color", "rgb(180, 83, 9)");
  await expect(name).toHaveValue(original);
});
