#!/usr/bin/env node
// DENETİM 13 — YAPILDI DEYİP YAPILMAMAK
//
// Bu projedeki en pahalı hata sınıfı: ekrana "silindi / kaydedildi" basılırken bulut yazmasının
// başarısız olması. Kullanıcı yanlış bilgiyle bir sonraki adıma geçiyor ve hata aylar sonra,
// bambaşka bir belirtiyle ortaya çıkıyor.
//
// İki kalıp aranıyor:
//   A) `tabloYaz(...).catch(() => {})` — sonucu yutup görmezden gelmek
//   B) yazma beklenmeden başarı mesajı basmak (aynı fonksiyonda `tabloYaz` var, `await` yok,
//      ama "silindi/kaydedildi/eklendi" diyen bir showToast var)
const fs = require("fs");
const dosya = process.argv[2] || "atolye-erp.jsx";
const kaynak = fs.readFileSync(dosya, "utf8");
const satirlar = kaynak.split("\n");
const bulgular = [];
const borclar = [];

// --- A) sonucu yutan catch ---
// v1.410.0 (22 Eylül): ARTIK HER YERDE HATA, yalnız silmede değil. Kalıp uygulama genelinde 90
// yerdeydi (silmede 14 "borç", geri kalanı kapsam dışı) — üretim teslimi, proses verme, cari fişi
// dahil. YEREL yazma hatası (depo dolu, boyut aşımı) sessizce yutuluyor, değişiklik sayfa
// yenilenince haber vermeden kayboluyordu. Hepsi `yazimiIzle(tabloYaz(...), etiket, veri)`e
// çevrildi (040-esitle): yerel hata bildirim penceresi açar; bulut hatası zaten şeritte.
// Bilinçli bir istisna gerekirse satıra `sonuc-muaf: <gerekçe>` yazılır.
satirlar.forEach((sat, i) => {
  if (/^\s*\/\//.test(sat)) return;
  if (!/(tabloYaz|tekilYaz)\([^;]*\)\s*\.catch\(\s*\(\s*\w*\s*\)\s*=>\s*\{\s*\}\s*\)/.test(sat)) return;
  if (/sonuc-muaf:\s*\S/.test(sat)) return;
  bulgular.push(`${dosya}:${i + 1}  yazma sonucu yutuluyor (yerel hata sessiz kalır): ${sat.trim().slice(0, 60)} — ` +
    "`yazimiIzle(…, etiket, veri)` kullanın");
});

// --- B) beklenmeden verilen başarı sözü ---
// Silme fonksiyonları içinde başarı mesajı varsa, o fonksiyonda `await` de olmalı.
const BASARI = /showToast\(\s*[`"'][^`"']*(silindi|kaydedildi|temizlendi)/i;
let fonkBas = -1, fonkAd = "";
satirlar.forEach((sat, i) => {
  // Fonksiyon olduğundan emin ol: `const silinecekler = [...]` gibi diziler eşleşmesin.
  const m = sat.match(/^\s*(?:const\s+(\w*[Ss]il\w*)\s*=\s*(?:useCallback\()?\s*(?:async\s*)?\([^)]*\)\s*=>|function\s+(\w*[Ss]il\w*)\s*\()/);
  if (m) m[1] = m[1] || m[2];
  if (m) { fonkBas = i; fonkAd = m[1]; }
  if (fonkBas < 0 || i - fonkBas > 200) return;
  if (!BASARI.test(sat)) return;
  const govde = satirlar.slice(fonkBas, i).join("\n");
  // `Promise.all(yazmalar)` da geçerli bir bekleme biçimi — mesaj sözler çözülünce veriliyor.
  const bekliyor = /await /.test(govde) || /Promise\.all\(\s*yazmalar/.test(govde);
  if (/tabloYaz\(/.test(govde) && !bekliyor && !/sonuc-muaf/.test(govde)) {
    bulgular.push(`${dosya}:${i + 1}  \`${fonkAd}\` yazma beklenmeden başarı mesajı basıyor — ` +
      `mesaj bir olgu değil temenni olur`);
    fonkBas = -1;
  }
});

// --- C) katmanın sonucu döndürdüğünden emin ol ---
if (!/return \{ ok: false, bulut: true, hata: mesaj \}|ok: false, bulut: true/.test(kaynak)) {
  bulgular.push("tabloYaz başarısızlıkta sonuç döndürmüyor — çağıran doğru/yanlışı ayırt edemez");
}

bulgular.forEach((b) => console.log("  ✗ [13 silme sonucu] " + b));
if (borclar.length && process.env.BORC) {
  borclar.forEach((b) => console.log("  · [13 borç] " + b));
}
const borcNotu = borclar.length ? ` · ${borclar.length} borç (BORÇ=1 ile listele)` : "";
console.log(bulgular.length
  ? `  13   silme sonucu ............ ${bulgular.length} BULGU${borcNotu}`
  : `  13   silme sonucu ............ TEMİZ${borcNotu}`);
process.exit(bulgular.length ? 1 : 0);
