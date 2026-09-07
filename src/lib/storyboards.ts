import type { Project, Scene, TransitionId } from "../types";
import { makeProject, makeScene } from "./project";
import { themeById } from "./themes";

interface SceneSeed {
  template: string;
  data: Record<string, unknown>;
  durationMs?: number;
  transition?: TransitionId;
}

export interface Storyboard {
  id: string;
  name: string;
  description: string;
  themeId: string;
  scenes: SceneSeed[];
}

export const STORYBOARDS: Storyboard[] = [
  {
    id: "tech-explainer",
    name: "Texnik tushuntirish",
    description: "Reels uslubidagi «muammo → raqam → yechim» ssenariysi.",
    themeId: "terminal",
    scenes: [
      {
        template: "hook",
        data: {
          kicker: "SINOV",
          headline: "MILLIONLAB\nfoydalanuvchi",
          subline: "Bitta ma'lumotlar bazasi.",
          align: "left",
        },
      },
      {
        template: "statement",
        data: {
          text: "Ilovangiz *viral* bo'ldi. Baza esa qiynala boshladi.",
          note: "Muammo shu yerdan boshlanadi",
          boxed: true,
        },
      },
      {
        template: "stat",
        data: {
          kicker: "YUKLAMA",
          title: "Hozirgi holat",
          value: "836964",
          suffix: "",
          label: "faol foydalanuvchi",
          icons: true,
          fill: 25,
        },
      },
      {
        template: "code",
        data: {
          kicker: "YECHIM",
          filename: "db.ts",
          code: 'const read = replica.query(sql);\nconst write = primary.exec(sql);\n// o‘qish va yozishni ajratamiz',
          typewriter: true,
          caption: "O'qishni replikaga uzatamiz",
        },
      },
      {
        template: "steps",
        data: {
          kicker: "REJA",
          title: "Uch bosqich",
          steps: ["Read replica", "Kesh qatlami", "Shardlash"],
        },
      },
      { template: "outro", data: { cta: "Obuna bo'ling", note: "Har hafta yangi post" } },
    ],
  },
  {
    id: "brand-intro",
    name: "Brend tanishtiruvi",
    description: "O'zingizni va xizmatingizni 20 soniyada tanishtiring.",
    themeId: "midnight",
    scenes: [
      {
        template: "hook",
        data: {
          kicker: "TANISHUV",
          headline: "Biz *brendlar* uchun kontent yasaymiz",
          subline: "Tez, arzon va bir xil uslubda.",
          align: "left",
        },
      },
      {
        template: "bullets",
        data: {
          kicker: "XIZMATLAR",
          title: "Nimalar qilamiz",
          items: ["Reels va Shorts", "Brend uslubi", "Oylik kontent rejasi"],
          marker: "check",
        },
      },
      {
        template: "compare",
        data: {
          kicker: "FARQ",
          title: "Biz bilan ishlash",
          leftTitle: "ODATDA",
          leftItems: ["3 soat montaj", "Dizayner kerak", "Har safar boshqacha"],
          rightTitle: "BIZDA",
          rightItems: ["2 daqiqa", "Telefonda", "Doim brend uslubida"],
        },
      },
      {
        template: "quote",
        data: {
          quote: "Bir oyda obunachilarimiz *3 barobar* oshdi.",
          author: "Mijoz",
          role: "Online do'kon egasi",
        },
      },
      { template: "outro", data: { cta: "Yozing", note: "Direct ochiq" } },
    ],
  },
  {
    id: "three-tips",
    name: "3 ta maslahat",
    description: "Eng ko'p saqlanadigan format — qisqa foydali maslahatlar.",
    themeId: "mint",
    scenes: [
      {
        template: "hook",
        data: {
          kicker: "MASLAHAT",
          headline: "3 ta *oddiy* qoida",
          subline: "Ko'pchilik buni e'tiborsiz qoldiradi.",
          align: "left",
        },
      },
      {
        template: "statement",
        data: { text: "Birinchi *3 soniya* hamma narsani hal qiladi.", note: "Qoida 1", boxed: true },
      },
      {
        template: "statement",
        data: { text: "Bitta video — bitta *fikr*.", note: "Qoida 2", boxed: true },
      },
      {
        template: "statement",
        data: { text: "Oxirida albatta *chaqiruv* bo'lsin.", note: "Qoida 3", boxed: true },
      },
      {
        template: "bullets",
        data: {
          kicker: "XULOSA",
          title: "Eslab qoling",
          items: ["Kuchli boshlanish", "Bitta fikr", "Aniq chaqiruv"],
          marker: "number",
        },
      },
      { template: "outro", data: { cta: "Saqlab qo'ying", note: "" } },
    ],
  },
  {
    id: "results",
    name: "Natijalar / hisobot",
    description: "Raqamlar bilan ishonch uyg'otadigan format.",
    themeId: "ink",
    scenes: [
      {
        template: "hook",
        data: {
          kicker: "HISOBOT",
          headline: "Bir oylik *natija*",
          subline: "Faqat raqamlar.",
          align: "left",
        },
      },
      {
        template: "stat",
        data: {
          kicker: "QAMROV",
          title: "Ko'rishlar",
          value: "1240000",
          label: "ko'rish",
          icons: false,
          fill: 60,
        },
      },
      {
        template: "chart",
        data: {
          kicker: "DINAMIKA",
          title: "Haftalik o'sish",
          series: ["1-hafta: 120", "2-hafta: 260", "3-hafta: 410", "4-hafta: 780"],
          unit: "",
        },
      },
      {
        template: "compare",
        data: {
          kicker: "TAQQOSLASH",
          title: "Oldin va keyin",
          leftTitle: "AVVAL",
          leftItems: ["12 000 ko'rish", "40 ta obuna"],
          rightTitle: "HOZIR",
          rightItems: ["1 240 000 ko'rish", "8 900 ta obuna"],
        },
      },
      { template: "outro", data: { cta: "Batafsil", note: "Havola profilda" } },
    ],
  },
  {
    id: "product",
    name: "Mahsulot e'loni",
    description: "Rasm asosidagi e'lon — do'kon va xizmatlar uchun.",
    themeId: "sunrise",
    scenes: [
      {
        template: "hook",
        data: {
          kicker: "YANGILIK",
          headline: "Yangi *to'plam* keldi",
          subline: "Cheklangan miqdorda.",
          align: "center",
        },
      },
      { template: "image", data: { caption: "Har bir detal *qo'lda* ishlangan", effect: "zoom-in", frame: "full" } },
      {
        template: "cutout",
        data: {
          kicker: "DETAL",
          headline: "Har tomondan *mukammal*",
          caption: "Rasm tanlashda «Fonni olib tashlash» tugmasidan foydalaning",
          effect: "float",
          glow: true,
          shadow: true,
        },
      },
      {
        template: "bullets",
        data: {
          kicker: "NIMA UCHUN",
          title: "Afzalliklari",
          items: ["Sifatli material", "1 yil kafolat", "Bepul yetkazish"],
          marker: "check",
        },
      },
      { template: "outro", data: { cta: "Buyurtma berish", note: "Direct orqali" } },
    ],
  },
  {
    id: "story",
    name: "Shaxsiy hikoya",
    description: "Blogerlar uchun — hikoya qilib aytiladigan format.",
    themeId: "neon",
    scenes: [
      {
        template: "hook",
        data: {
          kicker: "HIKOYA",
          headline: "2 yil oldin men *noldan* boshlagandim",
          subline: "",
          align: "left",
        },
      },
      { template: "statement", data: { text: "Hech kim *ishonmadi*.", note: "", boxed: false } },
      {
        template: "steps",
        data: {
          kicker: "YO'L",
          title: "Nima o'zgardi",
          steps: ["Har kuni post", "Kichik jamoa", "Birinchi mijoz"],
        },
      },
      {
        template: "stat",
        data: {
          kicker: "BUGUN",
          title: "Jamoa",
          value: "24",
          label: "kishi",
          icons: true,
          fill: 100,
        },
      },
      { template: "outro", data: { cta: "Kuzatib boring", note: "" } },
    ],
  },
];

export function projectFromStoryboard(sb: Storyboard): Project {
  const scenes: Scene[] = sb.scenes.map((seed, i) =>
    makeScene(seed.template, {
      data: { ...structuredClone(getDefaults(seed.template)), ...seed.data },
      // `durationMs` berilmagan bo'lsa shablon sukut qiymati saqlanadi.
      ...(seed.durationMs ? { durationMs: seed.durationMs } : {}),
      transition: seed.transition ?? (i === 0 ? "fade" : "slide-up"),
    }),
  );
  const project = makeProject(sb.name, scenes);
  const theme = themeById(sb.themeId);
  project.brand = { ...project.brand, ...theme.brand };
  return project;
}

function getDefaults(templateId: string): Record<string, unknown> {
  // makeScene allaqachon defaults qo'yadi; bu yerda faqat qo'shimcha xavfsizlik.
  return makeScene(templateId).data;
}
