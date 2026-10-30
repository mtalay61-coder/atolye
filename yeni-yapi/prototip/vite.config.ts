import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./": derlenen sayfa hangi klasörden açılırsa açılsın dosyalarını yanında bulur
// (GitHub Pages alt klasörü ya da tek dosyalık önizleme).
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: "dist", assetsInlineLimit: 0, modulePreload: false },
});
