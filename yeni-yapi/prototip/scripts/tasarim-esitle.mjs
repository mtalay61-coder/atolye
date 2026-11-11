// Tasarım sistemini ve yapı şemasını prototipe getirir. Prototip bu dosyaları ELLE DEĞİŞTİRMEZ:
// renk, bileşen sınıfı, ikon, araç çubuğu sırası, arama kuralı tasarım sisteminde değişir, burada yeniden üretilir.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const kok = join(dirname(fileURLToPath(import.meta.url)), "..");
const tasarim = join(kok, "..", "tasarim");
const hedef = join(kok, "public", "tasarim");
mkdirSync(hedef, { recursive: true });

// tokens.json → tokens.css: ilk tema :root'ta, diğerleri [data-theme="…"] bloklarında.
const t = JSON.parse(readFileSync(join(tasarim, "tokens.json"), "utf8"));
const temalar = t.color.themes.map((x) => x.id);
const deger = (tok, id) => {
  const v = typeof tok.value === "string" ? tok.value : (tok.value[id] ?? tok.value[temalar[0]]);
  return v.startsWith("{") ? `var(--${v.slice(1, -1)})` : v;
};
let css = `/* Atölye — tokens.json'dan üretildi (npm run esitle); elle düzenlenmez */\n`;
temalar.forEach((id, i) => {
  const secici = i === 0 ? `:root, [data-theme="${id}"]` : `[data-theme="${id}"]`;
  css += `${secici} {\n${t.color.tokens.map((x) => `  --${x.name}: ${deger(x, id)};`).join("\n")}${id === "gece" ? "\n  color-scheme: dark;" : ""}\n}\n`;
});
const duz = ["spacing", "radius", "zIndex"].flatMap((f) => t[f]?.tokens ?? []);
css += `:root {\n${duz.map((x) => `  --${x.name}: ${x.value};`).join("\n")}\n${Object.entries(t.type.families).map(([k, v]) => `  --font-${k}: ${v};`).join("\n")}\n}\n`;
writeFileSync(join(hedef, "tokens.css"), css);
copyFileSync(join(tasarim, "components", "bundle.css"), join(hedef, "bundle.css"));
copyFileSync(join(tasarim, "components", "bundle.js"), join(hedef, "bundle.js"));
copyFileSync(join(kok, "..", "sema.json"), join(kok, "src", "veri", "sema.json"));
console.log(`tasarım eşitlendi: ${temalar.length} tema, ${t.color.tokens.length} renk; şema kopyalandı`);
