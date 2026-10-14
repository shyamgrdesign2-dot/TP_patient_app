import { test, expect } from "@playwright/test";

const image = (name) => ({
  name,
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l8sAAAAASUVORK5CYII=",
    "base64",
  ),
});

test("multiple uploads retain each investigation date, category, notes and original file", async ({
  page,
}) => {
  await page.goto("/records?tab=records");
  await page
    .getByRole("button", { name: "Upload medical records", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Upload medical records" });
  await expect(
    dialog.getByRole("button", { name: /Save|Upload more/ }),
  ).toHaveCount(0);

  await dialog
    .getByLabel("Record file", { exact: true })
    .setInputFiles([image("Knee scan.png"), image("Blood report.png")]);
  const first = dialog.getByRole("group", { name: "Document 1", exact: true });
  const second = dialog.getByRole("group", { name: "Document 2", exact: true });
  await expect(dialog.locator('label[class*="uploadPicker"]')).toBeHidden();
  await expect(
    dialog.getByRole("button", { name: "Upload more", exact: true }),
  ).toBeVisible();
  await expect(first.getByRole("textbox", { name: /Notes/ })).toHaveAttribute(
    "maxlength",
    "300",
  );
  const dateBox = await first
    .getByLabel("Date of Investigation", { exact: true })
    .boundingBox();
  const typeBox = await first
    .getByLabel("Record type", { exact: true })
    .boundingBox();
  expect(Math.abs(dateBox.y - typeBox.y)).toBeLessThanOrEqual(1);
  expect(dateBox.height).toBe(typeBox.height);
  await expect(
    first.locator('[class*="uploadFileHeading"] [class*="uploadPreview"]'),
  ).toHaveCSS("width", "44px");
  await first
    .getByLabel("Record title", { exact: true })
    .fill("Knee scan review");
  await first
    .getByLabel("Date of Investigation", { exact: true })
    .fill("2026-08-12");
  await first
    .getByLabel("Record type", { exact: true })
    .selectOption("Radiology");
  await first
    .getByRole("textbox", { name: /Notes/ })
    .fill("Bring the earlier scan for comparison.");
  await second.getByRole("button", { name: /^Blood report.png/ }).click();
  await second
    .getByLabel("Date of Investigation", { exact: true })
    .fill("2026-08-13");
  await second
    .getByRole("textbox", { name: /Notes/ })
    .fill("Fasting sample from the outside laboratory.");
  await page.screenshot({ path: "/tmp/patient-upload-reviewed.png" });
  await dialog
    .getByRole("button", { name: "Save 2 records", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tatva-patient-demo-v1")).records.filter(
      (r) => r.uploaded,
    ),
  );
  expect(saved).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        title: "Knee scan review",
        type: "Radiology",
        date: "2026-08-12",
        note: "Bring the earlier scan for comparison.",
        category: "Medical records",
        memberId: "self",
      }),
      expect.objectContaining({
        title: "Blood report",
        type: "Pathology",
        date: "2026-08-13",
        note: "Fasting sample from the outside laboratory.",
        category: "Medical records",
        memberId: "self",
      }),
    ]),
  );
  await page
    .getByRole("button", { name: "View Knee scan review", exact: true })
    .click();
  const view = page.getByRole("dialog", {
    name: "Knee scan review",
    exact: true,
  });
  await expect(
    view.getByText("Bring the earlier scan for comparison.", { exact: true }),
  ).toBeVisible();
  await expect(
    view.getByRole("img", { name: "Knee scan review", exact: true }),
  ).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await view
    .getByRole("button", { name: "Download file", exact: true })
    .click();
  expect((await downloaded).suggestedFilename()).toBe("Knee scan.png");
});

test("upload rejects more than five documents and supports removing a selected file", async ({
  page,
}) => {
  await page.goto("/records?tab=records");
  await page
    .getByRole("button", { name: "Upload medical records", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Upload medical records" });
  await dialog
    .getByLabel("Record file", { exact: true })
    .setInputFiles(
      Array.from({ length: 6 }, (_, index) => image(`Report ${index + 1}.png`)),
    );
  await expect(
    dialog.getByText(/Add up to 5 documents at a time/),
  ).toBeVisible();
  await expect(dialog.getByRole("group", { name: /^Document \d/ })).toHaveCount(
    0,
  );
  await dialog
    .getByLabel("Record file", { exact: true })
    .setInputFiles([image("Keep.png"), image("Remove.png")]);
  await dialog
    .getByRole("button", { name: "Remove.png", exact: false })
    .filter({ hasText: "Remove.png" })
    .first()
    .click();
  await dialog
    .getByRole("button", { name: "Remove Remove.png", exact: true })
    .click();
  await expect(dialog.getByRole("group", { name: /^Document \d/ })).toHaveCount(
    1,
  );
  await expect(
    dialog.getByText("1 of 5 selected", { exact: true }),
  ).toBeVisible();
});

test("upload errors preserve drafts and let patients correct invalid metadata", async ({
  page,
}) => {
  await page.goto("/records?tab=records&upload=1");
  const dialog = page.getByRole("dialog", { name: "Upload medical records" });
  const picker = dialog.getByLabel("Record file", { exact: true });
  await picker.setInputFiles({
    name: "Not a report.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("test"),
  });
  await expect(dialog.getByRole("alert")).toContainText(
    "choose a PDF, JPG, PNG or GIF",
  );
  await picker.setInputFiles({
    name: "Empty.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(0),
  });
  await expect(dialog.getByRole("alert")).toContainText(
    "between 1 byte and 10 MB",
  );
  await picker.setInputFiles(image("Report.png"));
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  const title = dialog.getByLabel("Record title", { exact: true });
  await title.fill("");
  await dialog
    .getByRole("button", { name: "Save record", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Give Report.png a title",
  );
  await title.fill("My report");
  await dialog
    .getByLabel("Date of Investigation", { exact: true })
    .fill("2099-01-01");
  await dialog
    .getByRole("button", { name: "Save record", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "today or a past investigation date",
  );
  await expect(title).toHaveValue("My report");
  await dialog
    .getByRole("button", { name: "Remove Report.png", exact: true })
    .click();
  await expect(dialog.locator('label[class*="uploadPicker"]')).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /Save|Upload more/ }),
  ).toHaveCount(0);
});
