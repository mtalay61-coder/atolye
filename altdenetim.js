#!/usr/bin/env node
// DENETİM 14 — ALT TABLO FARK BELLEĞİ KURULMUYOR
//
// Fark katmanı "eski hâl" ile karşılaştırarak silinenleri buluyor. Bir tablonun belleği
// kurulmazsa `silinen` HER ZAMAN boş çıkar: kayıt yerelden gider, ekrandan kaybolur, ama
// BULUTTAN HİÇ SİLİNMEZ. Yenileyince geri gelir.
//
// Yaşandı: açılışta yalnızca ana tablolar kuruluyordu. "Fiş temizlendi ama temizlenmiyor"
// şikâyetinin sebebi buydu. Aralıklı davranması (aynı oturumda ikinci deneme çalışıyordu)
// hatayı aylarca gizleyebilirdi.
const fs = require("fs");
const dosya = process.argv[2] || "atolye-erp.jsx";
const kaynak = fs.readFileSync(dosya, "utf8");
const satirNo = (p) => kaynak.slice(0, p).split("\n").length;
const bulgular = [];

// Alt tabloları OLAN her ana tablo, açılışta tam sürümle kurulmalı.
const semaBas = kaynak.indexOf("const TABLO_SEMA = {");
if (semaBas >= 0) {
  let d = 0, son = semaBas;
  for (let i = kaynak.indexOf("{", semaBas); i < kaynak.length; i++) {
    if (kaynak[i] === "{") d++;
    else if (kaynak[i] === "}") { d--; if (!d) { son = i; break; } }
  }
  const sema = kaynak.slice(semaBas, son + 1);
  const tablolar = [...sema.matchAll(/^\s{2}(\w+):\s*\{/gm)].map((m) => m[1]);
  const cocukluOlanlar = tablolar.filter((t) => {
    const bas = sema.indexOf(`\n  ${t}:`);
    const kesit = sema.slice(bas, bas + 2000);
    return /cocuklar:\s*\[\s*\{/.test(kesit);
  });
  cocukluOlanlar.forEach((t) => {
    const yalin = new RegExp(`tabloBaslangic\\("${t}"`).test(kaynak);
    const tam = new RegExp(`tabloBaslangicTam\\("${t}"`).test(kaynak);
    if (yalin && !tam) {
      bulgular.push(`\`${t}\` alt tablolara sahip ama açılışta tabloBaslangic (yalın) ile kuruluyor — ` +
        `alt kayıtların silinmesi buluta HİÇ gitmez`);
    }
  });
}

// ---- BİLEŞİK ANAHTARLI ALT TABLO SİLMEDEN MUAF MI? ----
//
// Kimliği tek bir `id` sütunu olmayan tablolarda (varyantlar: urun_id+renk+beden) uygulamanın
// ürettiği `a|b|c` dizesi veritabanında YOKTUR; `id=in.(...)` hiçbir satıra denk gelmez.
// Eskiden bu tablolar silmeden büsbütün muaf tutuluyordu (`!cocuk.cakisma`) ve silinen
// renk/beden buluttan hiç kalkmıyordu — yerelde gidiyor, yenileyince geri geliyordu.
if (/cakisma:\s*"/.test(kaynak)) {
  if (!/supabaseSilBilesik\s*\(/.test(kaynak)) {
    bulgular.push("şemada `cakisma` anahtarı var ama supabaseSilBilesik() yok — " +
      "bileşik anahtarlı alt tablolarda silme buluta HİÇ gitmez");
  }
  // Silme dalını tamamen atlayan eski koruma geri gelmiş mi?
  const muaf = /cFark\.silinen\.length\s*>\s*0\s*&&\s*!cocuk\.cakisma/.test(kaynak);
  if (muaf) {
    bulgular.push("`!cocuk.cakisma` koşulu silme dalını atlıyor — " +
      "bileşik anahtarlı alt kayıtlar buluttan silinmez");
  }
  // Silme sorgusunun kurulabilmesi için fark hesabının silinen KAYITLARI da döndürmesi şart;
  // yalnızca kimlik dönerse sütun değerleri kayıptır.
  if (!/silinenKayitlar/.test(kaynak)) {
    bulgular.push("tabloFarki() silinen kayıtları döndürmüyor — bileşik silme sorgusu kurulamaz");
  }
}

// `eq.` koşulunda TIRNAK: PostgREST tırnağı değerin parçası sayar, hiçbir satır eşleşmez.
// (Bu proje v1.11–v1.18 arası tam bu yüzden buluta hiç yazamadı.)
[...kaynak.matchAll(/=eq\.\$\{[^}]*\}|=eq\.\\?"/g)].forEach((m) => {
  if (!m[0].includes('"')) return;
  bulgular.push(`${dosya}:${satirNo(m.index)}  \`eq.\` değeri tırnaklı — hiçbir satıra denk gelmez`);
});

// Tam sürümün kendisi duruyor mu?
if (!/function tabloBaslangicTam\(/.test(kaynak)) {
  bulgular.push("tabloBaslangicTam() bulunamadı — alt tablo fark belleği kurulamaz");
}

// Yalın çağrı, tam sürümün İÇİ dışında açılış yolunda kalmış mı?
[...kaynak.matchAll(/\n\s+tabloBaslangic\("(\w+)"/g)].forEach((m) => {
  const oncesi = kaynak.slice(Math.max(0, m.index - 400), m.index);
  if (/function tabloBaslangicTam\(/.test(oncesi)) return; // tam sürümün gövdesi
  if (/adim\.tablo/.test(kaynak.slice(m.index - 200, m.index))) return;
  bulgular.push(`${dosya}:${satirNo(m.index)}  yalın tabloBaslangic("${m[1]}") — tabloBaslangicTam kullanılmalı`);
});

if (!bulgular.length) console.log("  14   alt tablo belleği ....... TEMİZ");
else {
  bulgular.forEach((b) => console.log("  ✗ [14 alt tablo belleği] " + b));
  console.log(`  14   alt tablo belleği ....... ${bulgular.length} BULGU`);
}
process.exit(bulgular.length ? 1 : 0);
