import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const faviconDir = join(root, "public/favicon");
const iconSvg = readFileSync(join(faviconDir, "icon.svg"));

const pngSizes = [
  ["favicon-16x16.png", 16],
  ["favicon-32x32.png", 32],
  ["favicon-96x96.png", 96],
  ["android-icon-192x192.png", 192],
  ["apple-touch-icon-57x57.png", 57],
  ["apple-touch-icon-60x60.png", 60],
  ["apple-touch-icon-72x72.png", 72],
  ["apple-touch-icon-76x76.png", 76],
  ["apple-touch-icon-114x114.png", 114],
  ["apple-touch-icon-120x120.png", 120],
  ["apple-touch-icon-144x144.png", 144],
  ["apple-touch-icon-152x152.png", 152],
  ["apple-touch-icon-180x180.png", 180],
  ["mstile-70x70.png", 70],
  ["mstile-150x150.png", 150],
  ["mstile-310x310.png", 310],
];

for (const [filename, size] of pngSizes) {
  const buffer = await sharp(iconSvg).resize(size, size).png().toBuffer();
  writeFileSync(join(faviconDir, filename), buffer);
}

const iosIconPath = join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
writeFileSync(iosIconPath, await sharp(iconSvg).resize(1024, 1024).png().toBuffer());

console.log(`Generated ${pngSizes.length} favicon PNGs + iOS AppIcon.`);
