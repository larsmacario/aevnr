import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const iconPath = path.resolve(rootDir, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");

export function removePngAlpha(srcPath, destPath = srcPath) {
  if (!fs.existsSync(srcPath)) {
    console.error(`File not found: ${srcPath}`);
    return false;
  }
  const buf = fs.readFileSync(srcPath);
  const signature = buf.subarray(0, 8);

  let offset = 8;
  const chunks = [];
  let ihdr = null;
  let idatBuffers = [];

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buf.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      ihdr = Buffer.from(data);
    } else if (type === "IDAT") {
      idatBuffers.push(data);
    } else {
      chunks.push({ type, data });
    }
  }

  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr.readUInt8(8);
  const colorType = ihdr.readUInt8(9);

  if (colorType === 2) {
    console.log(`✔ AppIcon is already 24-bit RGB (no alpha channel): ${width}x${height}`);
    return true;
  }

  if (colorType !== 6 || bitDepth !== 8) {
    console.warn(`Unsupported PNG format for alpha removal: colorType=${colorType}, depth=${bitDepth}`);
    return false;
  }

  const fullIdat = Buffer.concat(idatBuffers);
  const decompressed = zlib.inflateSync(fullIdat);

  const bytesPerPixelIn = 4;
  const bytesPerPixelOut = 3;
  const rowSizeIn = 1 + width * bytesPerPixelIn;
  const rowSizeOut = 1 + width * bytesPerPixelOut;

  const rawOut = Buffer.alloc(height * rowSizeOut);
  const rawRgba = Buffer.alloc(height * width * 4);

  let prevRow = Buffer.alloc(width * 4);
  for (let y = 0; y < height; y++) {
    const filter = decompressed[y * rowSizeIn];
    const rowIn = decompressed.subarray(y * rowSizeIn + 1, (y + 1) * rowSizeIn);
    const curRow = Buffer.alloc(width * 4);

    for (let x = 0; x < width * 4; x++) {
      const a = x >= 4 ? curRow[x - 4] : 0;
      const b = prevRow[x];
      const c = x >= 4 ? prevRow[x - 4] : 0;
      const xVal = rowIn[x];

      let orig = 0;
      if (filter === 0) orig = xVal;
      else if (filter === 1) orig = (xVal + a) & 0xff;
      else if (filter === 2) orig = (xVal + b) & 0xff;
      else if (filter === 3) orig = (xVal + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        let pr = 0;
        if (pa <= pb && pa <= pc) pr = a;
        else if (pb <= pc) pr = b;
        else pr = c;
        orig = (xVal + pr) & 0xff;
      }
      curRow[x] = orig;
    }
    curRow.copy(rawRgba, y * width * 4);
    prevRow = curRow;
  }

  for (let y = 0; y < height; y++) {
    rawOut[y * rowSizeOut] = 0;
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const destIdx = y * rowSizeOut + 1 + x * 3;
      const alpha = rawRgba[srcIdx + 3] / 255;
      rawOut[destIdx] = Math.round(rawRgba[srcIdx] * alpha);
      rawOut[destIdx + 1] = Math.round(rawRgba[srcIdx + 1] * alpha);
      rawOut[destIdx + 2] = Math.round(rawRgba[srcIdx + 2] * alpha);
    }
  }

  const compressedOut = zlib.deflateSync(rawOut, { level: 9 });
  ihdr.writeUInt8(2, 9);

  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  function calcCrc(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, "ascii");
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([typeBuf, data]);
    const crc = calcCrc(typeAndData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([lenBuf, typeAndData, crcBuf]);
  }

  const outParts = [signature];
  outParts.push(makeChunk("IHDR", ihdr));
  outParts.push(makeChunk("IDAT", compressedOut));
  for (const chunk of chunks) {
    if (chunk.type !== "IEND") {
      outParts.push(makeChunk(chunk.type, chunk.data));
    }
  }
  outParts.push(makeChunk("IEND", Buffer.alloc(0)));

  fs.writeFileSync(destPath, Buffer.concat(outParts));
  console.log(`✔ Successfully stripped alpha channel from ${path.basename(destPath)}`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log("Checking App Store readiness for iOS assets...");
  removePngAlpha(iconPath);
}
