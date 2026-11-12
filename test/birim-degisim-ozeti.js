// BİRİM TESTİ — OKUNUR DEĞİŞİKLİK ÖZETİ (v1.744.17, 025 `degisimOzeti` / `degisimMetni`).
// Kullanıcı (12 Kasım): günlükte "urunler: 1 güncellendi" yerine "X modeline Y rengi eklendi, Z modeline 5 beden eklendi".
const { degisimOzeti, degisimMetni } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\n    çıkan:   ", JSON.stringify(a)); }
};
const v = (renk, beden, miktar = 0) => ({ renk, beden, miktar });
const eskiBot = { id: "u1", ad: "Bot", stokNo: 101, variants: [v("Siyah", "40", 5), v("Siyah", "41", 3)], hareketler: [{ id: "h1", miktar: 5 }], satisFiyati: 900, kapakResmi: "" , renkResimleri: {} };
const yeniBot = { ...eskiBot, variants: [v("Siyah", "40", 7), v("Siyah", "41", 3), v("Lacivert", "40"), v("Lacivert", "41"), v("Lacivert", "42"), v("Siyah", "42"), v("Siyah", "43")],
  hareketler: [{ id: "h1", miktar: 5 }, { id: "h2", miktar: 2 }], satisFiyati: 950, kapakResmi: "data:image/jpeg;base64,AAAA", renkResimleri: { Lacivert: "data:image/jpeg;base64,BBBB" } };
const eskiHal = new Map([["u1", JSON.stringify(eskiBot)], ["u3", JSON.stringify({ id: "u3", ad: "Terlik" })]]);
const yeniCizme = { id: "u2", ad: "Çizme", stokNo: 102, variants: [v("Taba", "38"), v("Taba", "39"), v("Taba", "40"), v("Taba", "41"), v("Taba", "42")] };
const o = degisimOzeti("urunler", { eklenen: [yeniCizme], guncellenen: [yeniBot], silinenKayitlar: [{ id: "u3", ad: "Terlik" }] }, eskiHal);
const metin = degisimMetni("urunler", o);
metin.forEach((m) => console.log("    · " + m));
bekle("yeni ürün: renk ve beden sayısıyla", metin[0], "Ürün eklendi — Çizme (No 102): 1 renk: Taba · 5 beden: 38, 39, 40, 41, 42");
bekle("güncellenen ürün: renk / beden / stok / hareket / görsel / fiyat",
  metin[1],
  "Ürün güncellendi — Bot (No 101): 1 renk eklendi: Lacivert · 2 beden eklendi: 42, 43 · stok miktarı değişti (1 renk/beden; toplam 8 → 10) · 1 stok hareketi eklendi · kapak resmi eklendi · renk resmi eklendi: Lacivert · satış fiyatı: 900 → 950");
bekle("silinen ürün", metin[2], "Ürün silindi — Terlik");
bekle("görsel verisi metne girmez", /base64|AAAA|BBBB/.test(metin.join(" ")), false);
// Yalnız görsel değişti (ekran görüntüsündeki durum: "Başka cihazdan güncellendi … kapak_resmi")
const g = degisimMetni("urunler", degisimOzeti("urunler", { guncellenen: [{ ...eskiBot, kapakResmi: "x" }] }, eskiHal));
bekle("yalnız kapak resmi", g, ["Ürün güncellendi — Bot (No 101): kapak resmi eklendi"]);
// Görselsiz okunmuş kayıt (kapakResmi alanı yok) "kaldırıldı" sanılmaz
const g2 = degisimMetni("urunler", degisimOzeti("urunler", { guncellenen: [{ ...eskiBot, kapakResmi: undefined, renkResimleri: undefined, ad: "Bot Deri" }] }, new Map([["u1", JSON.stringify({ ...eskiBot, kapakResmi: "x" })]])));
bekle("görselsiz okunan kayıtta görsel 'kaldırıldı' denmez; ad değişikliği yazılır", g2, ["Ürün güncellendi — Bot Deri (No 101): ad: Bot → Bot Deri"]);
// Cari / sipariş: alt liste ve alanlar
const c = degisimMetni("cariler", degisimOzeti("cariler", { guncellenen: [{ id: "c1", unvan: "Mağaza A", hareketler: [{ id: "a" }, { id: "b" }], telefon: "555" }] },
  new Map([["c1", JSON.stringify({ id: "c1", unvan: "Mağaza A", hareketler: [{ id: "a" }] })]])));
bekle("cari: hareket eklendi + telefon", c, ["Cari güncellendi — Mağaza A: 1 hareket eklendi · telefon: boş → 555"]);
const s = degisimMetni("siparisler", degisimOzeti("siparisler", { guncellenen: [{ id: "s1", siparisNo: "SAT-7", durum: "Tamamlandı", kalemler: [{ id: "k1", miktar: 3 }] }] },
  new Map([["s1", JSON.stringify({ id: "s1", siparisNo: "SAT-7", durum: "Hazırlanıyor", kalemler: [{ id: "k1", miktar: 2 }] })]])));
bekle("sipariş: kalem değişti + durum", s, ["Sipariş güncellendi — SAT-7: 1 kalem değişti · durum: Hazırlanıyor → Tamamlandı"]);
bekle("eski hâl yoksa yalnız başlık", degisimMetni("urunler", degisimOzeti("urunler", { guncellenen: [yeniCizme] }, new Map())), ["Ürün güncellendi — Çizme (No 102)"]);
if (hata) { console.log("BİRİM TESTİ HATA: değişim özeti"); process.exit(1); }
console.log("── değişim özeti testi temiz ──");
