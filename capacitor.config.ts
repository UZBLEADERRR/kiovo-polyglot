import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "uz.kiovo.reels",
  appName: "Kiovo Reels",
  webDir: "dist",
  android: {
    // Canvas + WebCodecs eksporti uchun apparat tezlatish shart.
    webContentsDebuggingEnabled: false,
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
