import { formatValue, rangeLabel } from "../../shared/labAnalysis";
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
  y -= 20;
  text(record.title, 22, bold);
  y -= 10;
  text(`Patient: ${member.name}`);
  text(`Hospital ID: ${member.mrn}`);
  text(`Date: ${record.date}`);
  text(`Prepared by: ${record.author}`);
  y -= 20;
  const rows =
    record.values ||
    record.params?.map((p) => [
      p.name,
      formatValue(p),
      p.unit,
      rangeLabel(p),
    ]);
  if (rows) {
    text("Test / Result / Unit / Reference range", 12, bold);
    for (const values of rows) text(values.join("    |    "));
    y -= 18;
  }
  if (record.rx) {
    const rx = record.rx;
    for (const [label, value] of [
      ["Chief complaints", rx.complaints],
      ["Vitals", rx.vitals],
      ["Diagnosis", rx.diagnosis],
    ])
      if (value) {
        text(label, 12, bold);
        text(value);
        y -= 8;
      }
    if (rx.medicines?.length) {
      text("Rx", 14, bold, accent);
      rx.medicines.forEach(([name, dose, when, days], i) => {
        text(`${i + 1}. ${name}`, 12, bold);
        text(`${dose} · ${when} · ${days}`, 11, normal, muted);
      });
      y -= 8;
    }
    for (const [label, value] of [
      ["Investigations", rx.tests],
      ["Advice", rx.advice],
      ["Follow-up", rx.followUp],
    ])
      if (value) {
        text(label, 12, bold);
        text(value);
        y -= 8;
      }
  }
  if (record.discharge) {
    const d = record.discharge;
    for (const [label, value] of [
      ["Admitted", d.admitted],
      ["Discharged", d.discharged],
      ["Ward", d.ward],
      ["Diagnosis", d.diagnosis],
      ["Procedures", d.procedures?.join(", ")],
      ["Hospital course", d.course],
    ])
      if (value) {
        text(label, 12, bold);
        text(value);
        y -= 8;
      }
    if (d.medicines?.length) {
      text("Medicines on discharge", 12, bold);
      d.medicines.forEach(([name, dose, when, days], i) =>
        text(`${i + 1}. ${name} - ${dose}, ${when}, ${days}`),
      );
      y -= 8;
    }
    for (const [label, value] of [
      ["Advice", d.advice],
      ["Follow-up", d.followUp],
    ])
      if (value) {
        text(label, 12, bold);
        text(value);
        y -= 8;
      }
  }
  if (record.certificate) {
    const c = record.certificate;
    text(record.type ? `${record.type} certificate` : "Certificate", 14, bold, accent);
    text(
      `This is to certify that ${member.name} (Hospital ID ${member.mrn}) was examined by ${record.author} on ${record.date}.`,
    );
    for (const [label, value] of [
      ["Purpose", c.purpose],
      ["Valid from", c.from],
      ["Valid to", c.to],
      ["Remarks", c.remarks],
    ])
      if (value) {
        text(label, 12, bold);
        text(value);
        y -= 8;
      }
    y -= 20;
    text(record.author, 12, bold);
    text(brand.hospitalName, 11, normal, muted);
  }
  if (record.note) text(record.note);
  return new Blob([await pdf.save()], { type: "application/pdf" });
}
