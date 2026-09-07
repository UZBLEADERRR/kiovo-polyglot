// Shablonlarni brauzerda chizib, PNG sifatida saqlaydi (vizual tekshirish uchun).
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = process.argv[2] ?? "/tmp/shots";
const BASE = process.env.PREVIEW_URL ?? "http://localhost:5173";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ["--no-sandbox"],
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const page = await browser.newPage({ viewport: { width: 700, height: 1000 } });
page.on("console", (m) => {
  if (m.type() === "error") console.error("console:", m.text());
});
page.on("pageerror", (e) => console.error("pageerror:", e.message));

await page.goto(`${BASE}/tools/preview.html`, { waitUntil: "load" });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });

const save = (name, dataUrl) => {
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(dataUrl.split(",")[1], "base64"));
};

const templates = await page.evaluate(() => window.__api.listTemplates());
for (const id of templates) {
  const url = await page.evaluate((t) => window.__api.shotTemplate(t, 0.75, 960), id);
  save(`tpl-${id}`, url);
  // Gorizontal formatni ham tekshiramiz — matn o'lchamlari boshqacha chiqadi.
  const wide = await page.evaluate((t) => window.__api.shotTemplate(t, 0.75, 540, "16:9"), id);
  save(`wide-${id}`, wide);
}

const storyboards = await page.evaluate(() => window.__api.listStoryboards());
for (const id of storyboards) {
  for (const i of [0, 1, 2]) {
    const url = await page.evaluate(
      ([s, idx]) => window.__api.shotStoryboard(s, idx, 0.75, 860),
      [id, i],
    );
    save(`sb-${id}-${i}`, url);
  }
}

console.log(`Saqlandi: ${OUT} (${templates.length} shablon, ${storyboards.length} ssenariy)`);
await browser.close();
