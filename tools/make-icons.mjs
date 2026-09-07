// Ilova ikonkalari va splash rasmlarini kanvasda chizib, Android res papkasiga yozadi.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const RES = process.env.RES_DIR ?? "android/app/src/main/res";

const browser = await chromium.launch({
  args: ["--no-sandbox"],
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const page = await browser.newPage();
await page.goto("about:blank");

await page.addScriptTag({
  content: `
    const ACCENT = "#7c5cff";
    const ACCENT2 = "#a78bfa";
    const BG = "#0b0d14";

    function roundRect(x, px, py, w, h, r) {
      x.beginPath();
      x.moveTo(px + r, py);
      x.arcTo(px + w, py, px + w, py + h, r);
      x.arcTo(px + w, py + h, px, py + h, r);
      x.arcTo(px, py + h, px, py, r);
      x.arcTo(px, py, px + w, py, r);
      x.closePath();
    }

    /** Ijro uchburchagi — "video" ma'nosini beradi. */
    function play(x, cx, cy, s) {
      x.fillStyle = "#ffffff";
      x.beginPath();
      x.moveTo(cx - s * 0.3, cy - s * 0.42);
      x.lineTo(cx + s * 0.44, cy);
      x.lineTo(cx - s * 0.3, cy + s * 0.42);
      x.closePath();
      x.fill();
    }

    function tile(x, cx, cy, s, rounded) {
      const g = x.createLinearGradient(cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2);
      g.addColorStop(0, ACCENT2);
      g.addColorStop(1, ACCENT);
      if (rounded === "circle") {
        x.beginPath();
        x.arc(cx, cy, s / 2, 0, Math.PI * 2);
      } else {
        roundRect(x, cx - s / 2, cy - s / 2, s, s, s * 0.26);
      }
      x.fillStyle = g;
      x.fill();
      play(x, cx + s * 0.02, cy, s * 0.34);
    }

    window.__icon = (kind, size, w, h) => {
      const c = document.createElement("canvas");
      c.width = w ?? size;
      c.height = h ?? size;
      const x = c.getContext("2d");
      if (kind === "legacy") {
        tile(x, size / 2, size / 2, size * 0.94, "square");
      } else if (kind === "round") {
        tile(x, size / 2, size / 2, size, "circle");
      } else if (kind === "foreground") {
        // Adaptive ikonkada faqat markazdagi ~2/3 qismi doim ko'rinadi.
        tile(x, size / 2, size / 2, size * 0.56, "square");
      } else if (kind === "splash") {
        x.fillStyle = BG;
        x.fillRect(0, 0, c.width, c.height);
        tile(x, c.width / 2, c.height / 2, size, "square");
      }
      return c.toDataURL("image/png");
    };
  `,
});

const save = async (dir, name, kind, size, w, h) => {
  mkdirSync(dir, { recursive: true });
  const url = await page.evaluate(
    ([k, s, ww, hh]) => window.__icon(k, s, ww, hh),
    [kind, size, w, h],
  );
  writeFileSync(`${dir}/${name}`, Buffer.from(url.split(",")[1], "base64"));
};

const densities = [
  ["mdpi", 1],
  ["hdpi", 1.5],
  ["xhdpi", 2],
  ["xxhdpi", 3],
  ["xxxhdpi", 4],
];

for (const [d, k] of densities) {
  await save(`${RES}/mipmap-${d}`, "ic_launcher.png", "legacy", Math.round(48 * k));
  await save(`${RES}/mipmap-${d}`, "ic_launcher_round.png", "round", Math.round(48 * k));
  await save(`${RES}/mipmap-${d}`, "ic_launcher_foreground.png", "foreground", Math.round(108 * k));
}

for (const [orient, bw, bh] of [
  ["port", 320, 480],
  ["land", 480, 320],
]) {
  for (const [d, k] of densities) {
    const w = Math.round(bw * k);
    const h = Math.round(bh * k);
    await save(`${RES}/drawable-${orient}-${d}`, "splash.png", "splash", Math.round(Math.min(w, h) * 0.26), w, h);
  }
}
await save(`${RES}/drawable`, "splash.png", "splash", 190, 720, 1080);

console.log("Ikonkalar va splash rasmlar yangilandi.");
await browser.close();
