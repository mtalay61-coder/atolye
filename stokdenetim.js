#!/usr/bin/env node
// DENETİM 8 — HAREKETSİZ STOK DEĞİŞİKLİĞİ
//
// Kural: stok miktarı değişiyorsa DEFTERE de yazılmalı. Aksi hâlde miktar ile hareket toplamı
// sessizce ayrışır; bakiye tutmaz ve nerede koptuğu aylar sonra bulunamaz.
// Bu denetim `miktar` alanına yazan blokların yakınında hareket üretimi olup olmadığına bakar.
const fs = require("fs");
const dosya = process.argv[2] || "atolye-erp.jsx";
const satirlar = fs.readFileSync(dosya, "utf8").split("\n");
const bulgular = [];

// Varyant miktarına yazma kalıpları.
const YAZMA = /(\bv\.miktar\s*=|\bmiktar:\s*(?:stokYuvarla\()?\s*(?:v|varyant|eski)\.miktar\s*[+\-]|miktar:\s*yeniMiktar)/;
// Miktar alanı sipariş kaleminde de var. Stok bağlamı olmadan eşleşme yanlış alarm üretir —
// `bekleyenKalemleriBirlestir` tam da bu yüzden hatalı işaretlenmişti.
const STOK_BAGLAMI = /(variants|stokRezervasyonlari|stokDurumu|stokYuvarla)/;
// Yakında hareket üretildiğinin işaretleri.
const HAREKET = /(hareketler\s*:|hareketEkle|hareketler\.concat|\.\.\.\s*(?:u|urun|mevcut)\.hareketler|hareketYaz|hareketSil)/;

const PENCERE = 40; // aynı işlem bloğu sayılan satır aralığı

satirlar.forEach((sat, i) => {
  if (!YAZMA.test(sat)) return;
  if (/^\s*(\/\/|\*)/.test(sat)) return;            // yorum satırı
  const bas = Math.max(0, i - PENCERE);
  const son = Math.min(satirlar.length, i + PENCERE);
  const cevre = satirlar.slice(bas, son).join("\n");
  if (!STOK_BAGLAMI.test(cevre)) return;
  if (!HAREKET.test(cevre)) {
    bulgular.push(`${dosya}:${i + 1}  stok miktarı değişiyor ama ±${PENCERE} satırda hareket yazımı yok — defter ayrışır`);
  }
});

// SIFIR KIRPMASI — `Math.max(0, ...)` ile miktarı sıfırda tutmak defterle stoğu sessizce ayırır.
// Eksi stok bir görüntü sorunu değil, "girişlerin eksik" bilgisidir; kırpmak onu siler.
satirlar.forEach((sat, i) => {
  // Yalnızca VARYANT MİKTARINA YAZILAN kırpma. Genel `Math.max(0, ...)` kullanımı meşru:
  // rezervasyon kalanı, bekleyen adet, hurda düşülmüş ücret negatif olamaz. Sorun, defteri
  // olan bir miktarın kırpılması.
  const KIRPMA = /miktar:\s*stokYuvarla\(\s*Math\.max\(\s*0\s*,|\bv\.miktar\s*=\s*(?:stokYuvarla\()?\s*Math\.max\(\s*0\s*,/;
  if (KIRPMA.test(sat) && !/kirpma-muaf/.test(sat)) {
    bulgular.push(`${dosya}:${i + 1}  stok miktarı sıfırda kırpılıyor — aradaki fark sessizce ` +
      `kaybolur ve defter ayrışır: ${sat.trim().slice(0, 60)}`);
  }
});

if (!bulgular.length) console.log("  8    hareketsiz stok ......... TEMİZ");
else {
  bulgular.forEach((b) => console.log("  ✗ [8 hareketsiz stok] " + b));
  console.log(`  8    hareketsiz stok ......... ${bulgular.length} BULGU`);
}
process.exit(bulgular.length ? 1 : 0);
