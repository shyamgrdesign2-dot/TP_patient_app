// A "written prescription": the scanned, handwritten sheet a doctor issues
// on paper (Tatva Practice's Smart Rx / Tab Rx / Snap Rx). The demo has no
// scans, so this draws one on a canvas from the same structured data the
// digital PDF uses: printed letterhead, ruled paper, blue-ink handwriting,
// a signature and a slight scan tilt. In production the scan comes from the
// hospital's document store as an image or PDF.
const HAND = "'Bradley Hand', 'Segoe Script', 'Noteworthy', 'Comic Sans MS', cursive";
const PRINT = "'Inter', 'Helvetica Neue', Arial, sans-serif";

export async function makeWrittenRxImage(record, member, brand, doctor) {
  const W = 1240;
  const H = 1754;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const rx = record.rx || {};

  // Paper with a faint warm tone and scanner grain.
  ctx.fillStyle = "#fbfaf5";
  ctx.fillRect(0, 0, W, H);
  let seed = 7;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  ctx.fillStyle = "rgba(90, 80, 60, 0.05)";
  for (let i = 0; i < 2200; i++) {
    ctx.fillRect(rand() * W, rand() * H, 1 + rand() * 2, 1 + rand() * 2);
  }

  // Printed letterhead.
  ctx.fillStyle = "#4b4ad5";
  ctx.font = `700 40px ${PRINT}`;
  ctx.fillText(brand?.hospitalName || "Hospital", 90, 120);
  ctx.fillStyle = "#454551";
  ctx.font = `600 28px ${PRINT}`;
  ctx.fillText(doctor?.name || record.author || "Doctor", 90, 170);
  ctx.font = `400 24px ${PRINT}`;
  ctx.fillText(
    [doctor?.specialty, doctor?.qualification].filter(Boolean).join(" · "),
    90,
    206,
  );
  ctx.textAlign = "right";
  ctx.fillText("Reg. no. KMC 48213", W - 90, 170);
  ctx.fillText("OPD 09:00 – 13:00 · 16:00 – 20:00", W - 90, 206);
  ctx.textAlign = "left";
  ctx.strokeStyle = "#4b4ad5";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(90, 236);
  ctx.lineTo(W - 90, 236);
  ctx.stroke();

  // Printed field labels on the first ruled block.
  ctx.fillStyle = "#6b6b78";
  ctx.font = `500 22px ${PRINT}`;
  ctx.fillText("Patient", 90, 300);
  ctx.fillText("Age / Sex", 640, 300);
  ctx.fillText("Date", 920, 300);
  ctx.fillText("Hospital ID", 90, 370);

  // Ruled lines.
  ctx.strokeStyle = "rgba(75, 74, 213, 0.12)";
  ctx.lineWidth = 2;
  for (let y = 330; y < H - 240; y += 70) {
    ctx.beginPath();
    ctx.moveTo(90, y);
    ctx.lineTo(W - 90, y);
    ctx.stroke();
  }

  // Handwriting, tilted a touch like a real scan.
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.012);
  ctx.translate(-W / 2, -H / 2);
  const ink = "#1f2d7a";
  ctx.fillStyle = ink;
  const hand = (text, x, y, size = 38, weight = 400) => {
    ctx.font = `${weight} ${size}px ${HAND}`;
    ctx.fillText(text, x, y);
  };
  const wrap = (text, x, y, size, maxWidth, lineHeight = 60) => {
    ctx.font = `400 ${size}px ${HAND}`;
    const words = String(text || "").split(" ");
    let line = "";
    let yy = y;
    for (const word of words) {
      const probe = line ? `${line} ${word}` : word;
      if (ctx.measureText(probe).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        yy += lineHeight;
        line = word;
      } else line = probe;
    }
    if (line) ctx.fillText(line, x, yy);
    return yy + lineHeight;
  };
  const age = ageText(member);
  hand(member?.name || "", 200, 322, 40);
  hand(age, 760, 322, 40);
  hand(record.date || "", 990, 322, 40);
  hand(member?.mrn || "", 240, 392, 40);

  let y = 470;
  if (rx.complaints) {
    hand("C/o:", 90, y, 40, 700);
    y = wrap(rx.complaints, 190, y, 40, 920, 70);
  }
  if (rx.vitals) {
    hand("O/e:", 90, y, 40, 700);
    y = wrap(rx.vitals.replace(/\s·\s/g, ", "), 190, y, 40, 920, 70);
  }
  if (rx.diagnosis) {
    hand("Dx:", 90, y, 40, 700);
    y = wrap(rx.diagnosis, 190, y, 40, 920, 70);
  }
  y += 20;
  hand("Rx", 90, y + 10, 72, 700);
  y += 80;
  const medicines = rx.medicines || [];
  if (medicines.length) {
    medicines.forEach(([name, dose, when, days], i) => {
      hand(`${i + 1})`, 110, y, 40);
      y = wrap(`${name}   ${dose || ""}`, 170, y, 42, 940, 70);
      y = wrap(`${when || ""}${days ? `  ×  ${days}` : ""}`, 230, y - 10, 34, 900, 60);
    });
  } else {
    y = wrap("No medicines prescribed.", 170, y, 40, 940, 70);
  }
  if (rx.tests) {
    hand("Inv:", 90, y, 40, 700);
    y = wrap(rx.tests, 190, y, 40, 920, 70);
  }
  if (rx.advice) {
    hand("Adv:", 90, y, 40, 700);
    y = wrap(rx.advice, 190, y, 40, 920, 70);
  }
  if (rx.followUp) {
    hand("F/u:", 90, y, 40, 700);
    y = wrap(rx.followUp, 190, y, 40, 920, 70);
  }

  // Signature: a loose scribble and the doctor's name underneath.
  const sx = W - 420;
  const sy = H - 260;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.bezierCurveTo(sx + 40, sy - 90, sx + 90, sy + 40, sx + 130, sy - 50);
  ctx.bezierCurveTo(sx + 170, sy - 130, sx + 190, sy + 30, sx + 240, sy - 20);
  ctx.bezierCurveTo(sx + 270, sy - 50, sx + 290, sy + 10, sx + 320, sy - 10);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx - 10, sy + 24);
  ctx.lineTo(sx + 330, sy + 24);
  ctx.stroke();
  hand(doctor?.name || record.author || "", sx, sy + 64, 30);
  ctx.restore();

  // Scanner vignette on the edges.
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.78);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(60,50,30,0.16)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not render the written prescription."))),
      "image/png",
    ),
  );
}

function ageText(member) {
  if (!member?.dob) return member?.gender ? member.gender[0] : "";
  const born = new Date(`${member.dob}T00:00:00`);
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  if (now < new Date(now.getFullYear(), born.getMonth(), born.getDate())) years -= 1;
  const sex = member.gender ? ` / ${member.gender[0]}` : "";
  return `${years} y${sex}`;
}
