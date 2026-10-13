import { test, expect } from "@playwright/test";

test("website branding is reviewed before selected fields enter the draft", async ({
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
  await page
    .getByRole("button", { name: "Continue with Tatva Practice" })
    .click();
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
    page.getByRole("heading", { name: "Review detected branding" }),
  ).toBeVisible();
  await expect(name).toHaveValue(before);
  await expect(
    page.getByLabel("Primary colour hex", { exact: true }),
  ).toHaveValue("#006b68");
  // Analyzed colours preview before applying identity or saving configuration.
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.querySelector("main")).getPropertyValue(
          "--tesseract-blue-500",
        ),
      ),
    )
    .toBe("#006b68");
  await expect(
    page
      .getByRole("group", { name: "Brand details to apply" })
      .getByRole("checkbox", { name: /Primary colour/ }),
  ).toHaveCount(1);
  await expect(
    page
      .getByRole("group", { name: "Brand details to apply" })
      .getByText("Corner radius", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Rule-based detection. AI extraction is not configured."),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "App icon: Couldn't detect" }),
  ).toBeDisabled();
  await expect(
    page
      .getByRole("group", { name: "Brand details to apply" })
      .getByRole("checkbox", { name: /Body font/ }),
  ).toBeChecked();
  await expect(
    page
      .getByRole("group", { name: "Brand details to apply" })
      .getByText("Shadow style", { exact: true }),
  ).toHaveCount(0);
  const fileChooser = page.waitForEvent("filechooser");
  await page
    .getByRole("group", { name: "Brand details to apply" })
    .getByRole("button", { name: "Upload app icon", exact: true })
    .click();
  await fileChooser;

  await page
    .getByRole("group", { name: "Brand details to apply" })
    .getByRole("checkbox", { name: /Primary colour/ })
    .uncheck();
  await page.getByRole("button", { name: "Apply selected to draft" }).click();
  await expect(name).toHaveValue("Example Hospital");
  await expect(
    page.getByText(
      "Selected branding added to your draft. Review the preview before saving.",
    ),
  ).toBeVisible();
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

test("blank and broken logo suggestions become Missing and cannot overwrite branding", async ({
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
  await page
    .getByRole("button", { name: "Continue with Tatva Practice" })
    .click();
  if (await page.getByRole("button", { name: "Edit", exact: true }).isVisible())
    await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Hospital website", { exact: true })
    .fill("https://hospital.example");
  await page
    .getByRole("button", { name: "Analyze website", exact: true })
    .click();
  const group = page.getByRole("group", { name: "Brand details to apply" });
  await expect(
    group.getByRole("checkbox", { name: "Horizontal logo: Couldn't detect" }),
  ).toBeDisabled();
  await expect(
    group.getByRole("checkbox", { name: "App icon: Couldn't detect" }),
  ).toBeDisabled();
  await expect(group.getByRole("img")).toHaveCount(0);
  await expect(
    group.getByRole("checkbox", { name: /Primary colour/ }),
  ).toBeChecked();
  await expect(
    group.getByRole("button", { name: "Upload horizontal logo" }),
  ).toBeVisible();
});
