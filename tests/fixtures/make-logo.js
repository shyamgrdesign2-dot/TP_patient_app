// Writes tests/fixtures/logo.png: a 1024 × 1024 transparent PNG hospital
// mark (a teal rounded square with a white cross). Run: node tests/fixtures/make-logo.js
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024, H = 1024;
const crc = (buf) => {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, sum]);
};
const raw = Buffer.alloc((W * 4 + 1) * H);
const inRounded = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.max(x0 + r, Math.min(x1 - r, x)), cy = Math.max(y0 + r, Math.min(y1 - r, y));
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0;
  for (let x = 0; x < W; x++) {
    const i = y * (W * 4 + 1) + 1 + x * 4;
    let px = [0, 0, 0, 0];
    if (inRounded(x, y, 112, 112, 912, 912, 200)) px = [0, 107, 104, 255];
    const cross = (Math.abs(x - 512) < 90 && Math.abs(y - 512) < 260) || (Math.abs(y - 512) < 90 && Math.abs(x - 512) < 260);
    if (px[3] && cross) px = [255, 255, 255, 255];
    raw.set(px, i);
  }
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync(new URL("./logo.png", import.meta.url), png);
console.log(`logo.png ${W}×${H}, ${png.length} bytes`);
