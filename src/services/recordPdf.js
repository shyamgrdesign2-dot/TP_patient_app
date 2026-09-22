export async function makeSamplePdf(record, member, brand) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]),
    y = 785;
  const ink = rgb(0.13, 0.15, 0.22),
    muted = rgb(0.4, 0.43, 0.5),
    accent = rgb(0.29, 0.29, 0.75);
  function text(value, size = 12, font = normal, color = ink) {
    const safe = String(value || "")
      .replace(/[–—]/g, "-")
      .replace(/[‘’]/g, "'")
      .replace(/[^\x20-\x7e\n]/g, " ");
    for (const paragraph of safe.split("\n")) {
      let line = "";
      for (const word of paragraph.split(" ")) {
        if (normal.widthOfTextAtSize(`${line} ${word}`, size) > 480 && line) {
          if (y < 60) {
            page = pdf.addPage([595, 842]);
            y = 785;
          }
          page.drawText(line, { x: 48, y, size, font, color });
          y -= size * 1.6;
          line = word;
        } else line = line ? `${line} ${word}` : word;
      }
      if (y < 60) {
        page = pdf.addPage([595, 842]);
        y = 785;
      }
      page.drawText(line, { x: 48, y, size, font, color });
      y -= size * 1.6;
    }
  }
  text(brand.hospitalName, 18, bold, accent);
  text("SAMPLE DOCUMENT - NOT A CLINICAL RECORD", 10, bold, muted);
  y -= 20;
  text(record.title, 22, bold);
  y -= 10;
  text(`Patient: ${member.name}`);
  text(`Hospital ID: ${member.mrn}`);
  text(`Date: ${record.date}`);
  text(`Prepared by: ${record.author}`);
  y -= 20;
  if (record.values) {
    text("Test / Result / Unit", 12, bold);
    for (const values of record.values) text(values.join("    |    "));
    y -= 18;
  }
  text(record.note || "Sample report for the patient app preview.");
  y -= 28;
  text(
    "This document contains fictional demonstration data.",
    10,
    normal,
    muted,
  );
  return new Blob([await pdf.save()], { type: "application/pdf" });
}
