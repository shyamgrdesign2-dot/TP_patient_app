import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";

async function admin(page) {
  await page.addInitScript(() => {
    const config = JSON.parse(
      localStorage.getItem("tatva-admin-config") || "{}",
    );
    localStorage.setItem(
      "tatva-admin-config",
      JSON.stringify({ ...config, brandConfigured: true }),
    );
  });
  await page.goto("/admin/app");
  await page
    .getByRole("button", { name: "Continue with Tatva Practice" })
    .click();
}
const png = fileURLToPath(new URL("../fixtures/logo.png", import.meta.url));

test("admin sidebar enables only app configuration and doctors and clinics", async ({
  page,
}) => {
  await admin(page);
  const nav = page.getByLabel("Admin sections");
  for (const name of ["Overview", "Packages & vaccines", "Messages"])
    await expect(nav.getByRole("button", { name, exact: true })).toBeDisabled();
  await expect(
    nav.getByRole("button", { name: "App configuration", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav
    .getByRole("button", { name: "Doctors & clinics", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/doctors$/);
  await page.goto("/admin/packages");
  await expect(page).toHaveURL(/\/admin\/app$/);
  await expect(nav).not.toContainText("Ready for development");
});

test("app icon and horizontal SVG upload independently, save and update the patient app", async ({
  page,
  context,
}) => {
  await page.goto("/more");
  const consolePage = await context.newPage();
  await admin(consolePage);
  await consolePage.getByRole("button", { name: "Edit", exact: true }).click();
  await consolePage.getByTestId("logoMark-file").setInputFiles(png);
  const crop = consolePage.getByRole("dialog", {
    name: "Crop app icon",
    exact: true,
  });
  await expect(crop.getByTestId("crop-1:1")).toBeVisible();
  await expect(crop.getByRole("slider", { name: "Zoom" })).toHaveAttribute(
    "max",
    "10",
  );
  await crop.getByRole("button", { name: "Use app icon", exact: true }).click();
  const mark = await consolePage
    .getByRole("img", { name: "App icon", exact: true })
    .getAttribute("src");
  await consolePage.getByTestId("logo-file").setInputFiles({
    name: "brand.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200"><rect x="10" y="10" width="780" height="180" fill="#334499"/><text x="50" y="130" font-size="70" fill="white">Hospital</text></svg>',
    ),
  });
  await consolePage
    .getByRole("dialog", { name: "Crop horizontal logo", exact: true })
    .getByRole("button", { name: "Use horizontal logo", exact: true })
    .click();
  const wide = await consolePage
    .getByRole("img", { name: "Horizontal logo", exact: true })
    .getAttribute("src");
  expect(wide).toMatch(/^data:image\/svg\+xml;base64,/);
  await expect(consolePage.getByRole("dialog")).toHaveCount(0);
  await expect(
    consolePage.getByRole("img", { name: "App icon", exact: true }),
  ).toHaveAttribute("src", mark);
  await expect(
    consolePage.getByText("SVG vector", { exact: true }),
  ).toBeVisible();
  await consolePage
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(
    page.locator('img[data-brand-logo="horizontal"]'),
  ).toHaveAttribute("src", wide);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", mark);
  await consolePage.getByRole("button", { name: "Edit", exact: true }).click();
  await consolePage
    .getByRole("button", { name: "Remove horizontal logo", exact: true })
    .click();
  await expect(
    consolePage.getByRole("img", { name: "App icon", exact: true }),
  ).toHaveAttribute("src", mark);
  await expect(
    consolePage.getByRole("img", { name: "Horizontal logo", exact: true }),
  ).toHaveCount(0);
});

test("JPG cropping can remove a solid background and restore it before applying", async ({
  page,
}) => {
  await admin(page);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const jpeg = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const x = c.getContext("2d");
    x.fillStyle = "white";
    x.fillRect(0, 0, 512, 512);
    x.fillStyle = "#334499";
    x.fillRect(150, 150, 200, 200);
    return c.toDataURL("image/jpeg");
  });
  const upload = () =>
    page.getByTestId("logoMark-file").setInputFiles({
      name: "icon.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(jpeg.split(",")[1], "base64"),
    });
  await upload();
  const crop = page.getByRole("dialog", { name: "Crop app icon", exact: true });
  await crop.getByLabel("Remove solid background").check();
  await crop.getByLabel("Remove solid background").uncheck();
  await crop.getByRole("button", { name: "Use app icon", exact: true }).click();
  const alpha = () =>
    page
      .getByRole("img", { name: "App icon", exact: true })
      .evaluate(async (img) => {
        await img.decode();
        const c = document.createElement("canvas");
        c.width = c.height = 512;
        const x = c.getContext("2d");
        x.drawImage(img, 0, 0);
        return x.getImageData(0, 0, 1, 1).data[3];
      });
  expect(await alpha()).toBe(255);
  await upload();
  await crop.getByLabel("Remove solid background").check();
  await crop.getByRole("button", { name: "Use app icon", exact: true }).click();
  expect(await alpha()).toBe(0);
});

test("configuration edits preview across tabs immediately, cancel restores and save commits", async ({
  page,
  context,
}) => {
  await page.goto("/more");
  const before = await page.evaluate(() =>
    localStorage.getItem("tatva-brand-preview"),
  );
  const editor = await context.newPage();
  await admin(editor);
  await editor.getByRole("button", { name: "Edit", exact: true }).click();
  await editor
    .getByLabel("Hospital name", { exact: true })
    .fill("Preview Hospital");
  await expect(page.locator('[data-brand-logo="name"]')).toContainText(
    "Preview Hospital",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("tatva-brand-preview")),
  ).toBe(before);
  await editor
    .getByRole("navigation", { name: "Sections", exact: true })
    .getByRole("button", { name: "Theme" })
    .click();
  await editor.getByRole("radio", { name: "Gradient", exact: true }).check();
  await expect
    .poll(() =>
      page
        .locator("body")
        .evaluate((node) =>
          getComputedStyle(node).getPropertyValue("--brand-cta-background"),
        ),
    )
    .toContain("linear-gradient");

  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator('[data-brand-logo="name"]')).toContainText(
    "Tatva Care Hospital",
  );
  await editor.getByRole("button", { name: "Edit", exact: true }).click();
  await editor
    .getByLabel("Hospital name", { exact: true })
    .fill("Saved Hospital");
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await page.reload();
  await expect(page.locator('[data-brand-logo="name"]')).toContainText(
    "Saved Hospital",
  );
});

test("an unconfigured hospital opens with blank identity and saves as configured", async ({
  page,
}) => {
  await page.goto("/admin/app");
  await page
    .getByRole("button", { name: "Continue with Tatva Practice" })
    .click();
  await expect(page.getByLabel("Hospital name", { exact: true })).toHaveValue(
    "",
  );
  await expect(page.getByLabel("App name", { exact: true })).toHaveCount(0);
  await expect(
    page.getByLabel("Primary colour hex", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByLabel("Secondary colour hex", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Hospital name", { exact: true }).fill("City Hospital");
  await page
    .getByRole("navigation", { name: "Sections", exact: true })
    .getByRole("button", { name: "Theme" })
    .click();
  await page.getByLabel("Primary colour hex", { exact: true }).fill("#176b55");
  await page
    .getByLabel("Secondary colour hex", { exact: true })
    .fill("#466699");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("tatva-admin-config"))
            .brandConfigured,
      ),
    )
    .toBe(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Hospital name", { exact: true })).toHaveCount(
    0,
  );
});

test("logo editor rotates artwork and exports a chosen background colour", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1510, height: 1100 });
  await admin(page);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const source = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000000";
    ctx.fillRect(180, 20, 152, 472);
    return canvas.toDataURL("image/png");
  });
  await page.getByTestId("logoMark-file").setInputFiles({
    name: "mark.png",
    mimeType: "image/png",
    buffer: Buffer.from(source.split(",")[1], "base64"),
  });
  const dialog = page.getByRole("dialog", {
    name: "Crop app icon",
    exact: true,
  });
  expect(
    await dialog.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return node.contains(
        document.elementFromPoint(rect.right - 24, rect.top + 24),
      );
    }),
  ).toBe(true);
  await dialog.getByRole("button", { name: "Rotate 90°" }).click();
  await dialog.getByLabel("Add background colour").check();
  await dialog.getByLabel("Background colour", { exact: true }).fill("#eeccee");
  await dialog
    .getByRole("button", { name: "Use app icon", exact: true })
    .click();
  const pixels = await page
    .getByRole("img", { name: "App icon", exact: true })
    .evaluate(async (image) => {
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      return [
        [0, 0],
        [30, 256],
        [256, 30],
      ].map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data]);
    });
  expect(pixels).toEqual([
    [238, 204, 238, 255],
    [0, 0, 0, 255],
    [238, 204, 238, 255],
  ]);
});
