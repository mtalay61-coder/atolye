// CARİ YARDIMCILARI — cari işareti (logo ya da baş harfler + renk) ve otomatik renk. Saf fonksiyonlar.
import type { Cari } from "./tipler";

// Otomatik renk paleti: koyu-orta tonlar, üzerinde beyaz yazı okunur. Renk VERİDİR (kayda hex yazılır), tema token'ı değil.
const PALET = ["#3d5a80", "#7a4b2a", "#2f6b4f", "#8a3b3b", "#5b4b8a", "#2a6f7a", "#7a6a2a", "#4b5563", "#8a4b6b", "#3b6b8a", "#6b4b2a", "#2a5f3f"];
export function otomatikRenk(kod: string): string {
  let h = 0;
  for (const c of kod) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALET[h % PALET.length];
}
export const cariRengi = (c: Pick<Cari, "renk" | "kod">) => c.renk || otomatikRenk(c.kod || "?");

// Baş harfler Türkçe büyük harfle: "işık mağazaları" → "IM" değil "İM".
export function basHarfler(ad: string): string {
  const k = ad.replace(/\b(ltd|şti|san|tic|a\.?ş)\.?/gi, " ").split(/[\s.()]+/).filter((x) => x.length > 1);
  return ((k[0]?.[0] ?? "?") + (k[1]?.[0] ?? "")).toLocaleUpperCase("tr");
}
// Yazı rengi zemine göre: açık renkte koyu yazı (kullanıcı açık bir renk seçebilir).
export function yaziRengi(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((x) => { const v = x / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#1d1d1d" : "#ffffff";
}
export const resmiUnvan = (c: Pick<Cari, "resmiUnvan" | "ad">) => c.resmiUnvan?.trim() || c.ad;
export const vergiTuru = (vn?: string) => { const d = (vn ?? "").replace(/\s/g, ""); return d.length === 11 ? "TC kimlik no (şahıs)" : d.length === 10 ? "Vergi kimlik no" : ""; };
