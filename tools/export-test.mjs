// Eksport zanjirini brauzerda uchdan-uchgacha sinaydi.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.PREVIEW_URL ?? "http://localhost:5173";
const OUT = process.argv[2] ?? "/tmp/export-test";

const browser = await chromium.launch({
  args: ["--no-sandbox"],
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const page = await browser.newPage({ viewport: { width: 500, height: 900 } });
page.on("pageerror", (e) => console.error("pageerror:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.error("console:", m.text());
});

await page.goto(`${BASE}/tools/preview.html`, { waitUntil: "load" });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });

const probe = await page.evaluate(() => window.__api.probe());
console.log("Kodek qo'llab-quvvatlashi:", JSON.stringify(probe, null, 1));

const engine = process.env.ENGINE || undefined;
const started = Date.now();
const res = await page.evaluate(
  ([id, h, eng]) => window.__api.exportStoryboard(id, h, eng),
  ["three-tips", 480, engine],
);
const wall = Date.now() - started;

const check = await page.evaluate(
  ([b64, mime]) => window.__api.verify(b64, mime),
  [res.base64, res.mime],
);
console.log("Ijro sinovi:", check);

const file = `${OUT}.${res.ext}`;
writeFileSync(file, Buffer.from(res.base64, "base64"));
console.log({
  engine: res.engine,
  mime: res.mime,
  ext: res.ext,
  sizeKB: Math.round(res.size / 1024),
  frameSize: `${res.width}x${res.height}`,
  videoMs: res.durationMs,
  wallMs: wall,
  file,
});
await browser.close();
