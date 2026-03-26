import sharp from "sharp";
import { join } from "path";

const pub = join(import.meta.dir, "..", "public");
const svg = join(pub, "zentro_icon.svg");

await Promise.all([
  sharp(svg).resize(192, 192).png().toFile(join(pub, "logo192.png")),
  sharp(svg).resize(512, 512).png().toFile(join(pub, "logo512.png")),
  sharp(svg).resize(16, 16).png().toFile(join(pub, "favicon-16x16.png")),
  sharp(svg).resize(32, 32).png().toFile(join(pub, "favicon-32x32.png")),
  sharp(svg).resize(64, 64).png().toFile(join(pub, "favicon-64x64.png")),
]);

console.log("PNGs generated. Building favicon.ico...");

const sizes = [16, 24, 32, 48, 64];
const pngBuffers = await Promise.all(
  sizes.map((s) => sharp(svg).resize(s, s).png().toBuffer())
);

const pngs = sizes.map((size, i) => ({
  size,
  data: pngBuffers[i],
}));

const ico = await pngToIco(pngs);
const fs = await import("fs");
fs.writeFileSync(join(pub, "favicon.ico"), ico);
console.log("favicon.ico generated!");
console.log("All icons generated successfully.");

async function pngToIco(
  pngs: { size: number; data: Buffer }[]
): Promise<Buffer> {
  const headerSize = 6 + pngs.length * 16;
  const buffers: Buffer[] = [];
  let offset = headerSize;

  const dirEntries: Buffer[] = [];
  for (const { size, data } of pngs) {
    const entry = Buffer.alloc(16);
    entry[0] = size < 256 ? size : 0; // Width
    entry[1] = size < 256 ? size : 0; // Height
    entry[2] = 0; // Color count
    entry[3] = 0; // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(data.length, 8); // Image data size
    entry.writeUInt32LE(offset, 12); // Image data offset
    dirEntries.push(entry);
    buffers.push(data);
    offset += data.length;
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Image type (1 = ICO)
  header.writeUInt16LE(pngs.length, 4); // Number of images

  return Buffer.concat([header, ...dirEntries, ...buffers]);
}
