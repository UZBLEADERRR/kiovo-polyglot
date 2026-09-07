# Kiovo Reels

Telefonda ishlaydigan qisqa animatsion video studiyasi. Reels / Shorts / TikTok uchun
brend uslubidagi videolarni matn yozish orqali yasaydi va **MP4** qilib eksport qiladi.

Ilova brauzerda ham, Android'da **APK** sifatida ham ishlaydi. Barcha ish telefonning
o'zida bajariladi — video render qilish uchun server kerak emas.

---

## Nima qila oladi

- **12 ta sahna shabloni** — sarlavha, kuchli gap, ro'yxat, statistika (sanoqchi
  animatsiyasi bilan), diagramma, taqqoslash, bosqichlar, rasm (Ken Burns),
  fonsiz obyekt, kod/terminal, iqtibos, yakuniy CTA.
- **6 ta tayyor ssenariy** — bir bosishda 5–6 sahnali to'liq video: texnik
  tushuntirish, brend tanishtiruvi, 3 ta maslahat, natijalar hisoboti,
  mahsulot e'loni, shaxsiy hikoya.
- **Brend uslubi** — 7 ta tayyor rang sxemasi yoki o'zingizning ranglaringiz,
  logo, username, har sahnadagi brend tagi.
- **AI rasm (Gemini)** — matn orqali rasm yaratish, mavjud rasmni tahrirlash va
  **fonni avtomatik olib tashlash**, so'ng uni "suzuvchi" animatsiyaga qo'yish.
- **Musiqa** — o'z audio faylingizni qo'shish, ovoz balandligi, boshlanish nuqtasi,
  oxirida so'nish.
- **Formatlar** — 9:16, 4:5, 1:1, 16:9. Sifat: 1080p / 720p / 480p, 24/30/60 fps.
- **Eksport** — WebCodecs orqali H.264 MP4 (real vaqtdan tezroq). Qurilma buni
  qo'llab-quvvatlamasa avtomatik ravishda MediaRecorder'ga o'tadi.
- Loyihalar telefon xotirasida saqlanadi (localStorage + IndexedDB), internet
  faqat AI rasm uchun kerak.

---

## APK'ni olish

APK har bir push'da GitHub Actions'da avtomatik yig'iladi.

1. Repozitoriyning **Actions** bo'limiga kiring.
2. **APK yig'ish** ish oqimining oxirgi muvaffaqiyatli ishga tushishini oching.
3. Pastdagi **Artifacts** bo'limidan `kiovo-reels-apk` arxivini yuklab oling.
4. Ichida ikkita fayl bo'ladi:
   - `kiovo-reels-debug.apk` — sinov uchun;
   - `kiovo-reels-release.apk` — kundalik foydalanish uchun (tavsiya etiladi).
5. APK'ni telefonga ko'chiring va o'rnating. Android "noma'lum manbalar"ga
   ruxsat so'raydi — bir marta ruxsat berish kifoya.

Reliz yaratish uchun `v` bilan boshlanadigan teg qo'ying (`git tag v1.0.0 && git push --tags`) —
APK'lar GitHub Release'ga avtomatik biriktiriladi.

### O'z imzo kalitingiz bilan (ixtiyoriy)

Play Market'ga chiqarmoqchi bo'lsangiz repozitoriya **Secrets** bo'limiga qo'shing:

| Secret | Ma'nosi |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `.keystore` faylining base64 ko'rinishi |
| `ANDROID_KEYSTORE_PASSWORD` | keystore paroli |
| `ANDROID_KEY_ALIAS` | kalit alias'i |
| `ANDROID_KEY_PASSWORD` | kalit paroli |

Kalit qo'shilmasa, release APK debug kaliti bilan imzolanadi — telefonga
o'rnatish uchun bu ham yetarli.

---

## AI rasm (Gemini) sozlash

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) sahifasidan
   bepul API kalit oling.
2. Ilovada: sahnada **Rasm tanlash → ✨ AI bilan rasm yaratish → ⚙** tugmasi
   orqali kalitni kiriting.
3. Kalit **faqat shu telefonda** (localStorage'da) saqlanadi. So'rovlar
   to'g'ridan-to'g'ri Google'ga ketadi — oraliq server yo'q.

Sukut bo'yicha `gemini-2.5-flash-image` modeli ishlatiladi; model nomi topilmasa
ilova avtomatik `gemini-2.5-flash-image-preview` ni sinaydi. Model nomini
sozlamalardan qo'lda ham o'zgartirish mumkin.

**Fonni olib tashlash** ikki xil ishlaydi:

- *AI orqali:* "Fonsiz qilib ber" tugmasi yoqilsa, Gemini'dan obyektni tekis
  fonda chizish so'raladi, so'ng fon telefonning o'zida kesib olinadi.
- *Mavjud rasm uchun:* rasm tanlash oynasida har bir rasm ustidagi **✂** tugmasi.
  Bu butunlay oflayn ishlaydi va tekis fonli rasmlarda yaxshi natija beradi.

Natijani **"Fonsiz obyekt"** sahnasiga qo'ysangiz, rasm brend foni ustida
suzadi, yorug'lik va soya bilan animatsiya qilinadi.

---

## Ishlab chiqish

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/ ga yig'ish
npm run typecheck
```

### Android

```bash
npm run build
npx cap sync android
npx cap open android      # Android Studio kerak
# yoki:
cd android && ./gradlew assembleRelease
```

### Yordamchi vositalar

```bash
npm run dev &                    # avval dev server
npm run shots -- /tmp/shots      # har bir shablonni PNG qilib chizadi
npm run export:test -- /tmp/out  # eksport zanjirini uchdan-uchgacha sinaydi
npm run icons                    # ilova ikonkalarini qayta yasaydi
```

`tools/preview.html` — brauzerda shablonlarni sinash uchun ichki sahifa
(ishlab chiqarish yig'masiga kirmaydi).

---

## Loyiha tuzilishi

```
src/
  types.ts               Loyiha, sahna, brend modeli
  render/
    engine.ts            Vaqt jadvali, kadr chizish, sahnalararo o'tishlar
    anim.ts  draw.ts     Animatsiya va kanvas yordamchilari
    richtext.ts          *urg'uli* so'zli matn joylashuvi
    background.ts        Fon uslublari (to'r, yorug'lik, nuqtalar…)
    chrome.ts            Bo'lim yozuvi, brend tagi, aksent chizig'i
    templates/           Sahna shablonlari
  lib/
    export.ts            WebCodecs (MP4) va MediaRecorder (zaxira) eksporti
    gemini.ts            Gemini rasm API mijozi
    cutout.ts            Fonni olib tashlash (oflayn)
    db.ts  assets.ts     IndexedDB: rasm va audio fayllar
    project.ts           Loyiha modeli va saqlash
    storyboards.ts       Tayyor ssenariylar
    save.ts              Faylni saqlash / ulashish (Android + brauzer)
  components/            React interfeysi
```

Barcha shablonlar 1080×1920 "virtual" koordinatada chiziladi; eksportda
kanvas kerakli o'lchamga masshtablanadi. Shu sababli bir xil loyiha
har qanday nisbat va sifatda bir xil ko'rinadi.

---

## Cheklovlar

- H.264 kodlash qurilmaning WebView'iga bog'liq. Eski qurilmalarda ilova
  MediaRecorder'ga o'tadi — bunda yozuv real vaqtda ketadi va natija WebM
  bo'lishi mumkin. Eksport oynasi qaysi rejim ishlashini oldindan ko'rsatadi.
- Musiqa va rasmlar faqat siz yuklagan fayllardan olinadi. Ijtimoiy tarmoqqa
  joylashdan oldin mualliflik huquqini tekshiring.
- AI rasm uchun internet va Gemini API kaliti kerak; qolgan hamma narsa oflayn.
