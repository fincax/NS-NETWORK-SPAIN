// pnpm icons · genera los iconos PNG de la app instalable (D-039) a partir de public/icon.svg con Chromium.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const svg = readFileSync(join(root, "icon.svg"), "utf8");
const browser = await chromium.launch();
for (const [file, size, pad] of [["icon-512.png", 512, 0], ["icon-192.png", 192, 0], ["apple-touch-icon.png", 180, 0]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:#0B0D10;width:${size}px;height:${size}px;display:grid;place-items:center">${svg.replace("<svg ", `<svg width="${size - pad * 2}" height="${size - pad * 2}" `)}</body></html>`);
  writeFileSync(join(root, file), await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: size, height: size } }));
  await page.close();
  console.log("ok ·", file);
}
await browser.close();
