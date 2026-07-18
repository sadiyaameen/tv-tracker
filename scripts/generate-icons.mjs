// Generates PNG app icons with no external dependencies (uses built-in zlib).
// Usage: node scripts/generate-icons.mjs
// Writes icon-192.png, icon-512.png and apple-touch-icon.png (180px) into ../icons

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "icons");
mkdirSync(outDir, { recursive: true });

// colours
const BG = [99, 102, 241];     // indigo
const BG2 = [79, 70, 229];     // darker indigo (gradient bottom)
const FG = [255, 255, 255];    // white play triangle

function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function makeIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const radius = size * 0.22; // rounded corners
  // play triangle geometry (centered, pointing right)
  const cx = size * 0.54;
  const cy = size * 0.5;
  const tri = size * 0.22;

  const inRoundedRect = (x, y) => {
    const r = radius;
    const minx = r, miny = r, maxx = size - r, maxy = size - r;
    let dx = 0, dy = 0;
    if (x < minx) dx = minx - x; else if (x > maxx) dx = x - maxx;
    if (y < miny) dy = miny - y; else if (y > maxy) dy = y - maxy;
    return dx * dx + dy * dy <= r * r;
  };

  // triangle vertices
  const ax = cx - tri, ay = cy - tri;
  const bx = cx - tri, by = cy + tri;
  const dx2 = cx + tri, dy2 = cy;
  const sign = (px1, py1, px2, py2, px3, py3) =>
    (px1 - px3) * (py2 - py3) - (px2 - px3) * (py1 - py3);
  const inTriangle = (x, y) => {
    const d1 = sign(x, y, ax, ay, bx, by);
    const d2 = sign(x, y, bx, by, dx2, dy2);
    const d3 = sign(x, y, dx2, dy2, ax, ay);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const inside = inRoundedRect(x + 0.5, y + 0.5);
      if (!inside) {
        px[i] = 0; px[i + 1] = 0; px[i + 2] = 0; px[i + 3] = 0; // transparent corner
        continue;
      }
      let col = lerp(BG, BG2, y / size);
      if (inTriangle(x + 0.5, y + 0.5)) col = FG;
      px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = 255;
    }
  }
  return encodePNG(size, size, px);
}

// --- minimal PNG encoder (RGBA, filter type 0) ---
function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw);

  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

writeFileSync(join(outDir, "icon-192.png"), makeIcon(192));
writeFileSync(join(outDir, "icon-512.png"), makeIcon(512));
writeFileSync(join(outDir, "apple-touch-icon.png"), makeIcon(180));
console.log("Wrote icons to icons/ (192, 512, apple-touch 180)");
