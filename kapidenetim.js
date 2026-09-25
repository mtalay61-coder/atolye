#!/usr/bin/env node
// DENETİM 16 — HAREKET YAZAN YERLERİN SAYIMI ("yeni kopya çıkmasın")
//
// NEDEN VAR
// Bu projede "fiş" diye bir nesne yok: aynı fiş numarasını taşıyan stok + cari hareketlerinden
// SONRADAN çıkarılan bir kavram. Bu yüzden fişi yazan kod birden çok yere dağılmış durumda.
// Aynı hata sınıfı altı kez döndü ve her seferinde sebebi aynıydı: bir kopya güncellendi,
// diğerleri güncellenmedi (kimlik bağı, birim fiyat, sipariş geri alımı, bulut şeması...).
//
// Bu denetleyici hatayı DEĞİL, hatanın sebebini kovalıyor: kopya sayısını. Bilinen yazıcı/silici
// listesi aşağıda. Listede olmayan yeni bir yazıcı çıkarsa BULGU verir.
//
// NASIL DÜZELTİLİR
// Yeni bir yerde hareket yazmak yerine var olan kapıdan geç. Gerçekten yeni bir kapı gerekiyorsa
// listeye EKLE — ama her ekleme, gelecekte güncellenmesi unutulacak bir kopya daha demektir.
// Nihai hedef bu listeyi tek bir `fisYaz`/`fisGeriAl` çiftine indirmek; liste küçüldükçe
// buradaki sayılar da düşmeli, ASLA artmamalı.

const fs = require("fs");
const dosya = process.argv[2] || "atolye-erp.jsx";
const kaynak = fs.readFileSync(dosya, "utf8");
const satirlar = kaynak.split("\n");
const satirNo = (p) => kaynak.slice(0, p).split("\n").length;

// Bir konumun hangi fonksiyonun içinde olduğunu bulur.
//
// SATIR TABANLI, düz metin taraması DEĞİL: `const X = (` deseni serbest metinde aranınca
// sıradan değişken atamalarını da fonksiyon sanıyordu (`const araTanim = (...)`), bulgular
// anlamsız adlarla doluyordu. Girinti seviyesine bakmak bunu eler: gerçek tanımlar ya en üst
// düzeyde (girintisiz) ya da bileşen içinde iki boşluk girintiyle durur.
function kapsayanFonksiyon(index) {
  const hedefSatir = satirNo(index);
  for (let i = hedefSatir - 1; i >= 0; i--) {
    const l = satirlar[i];
    let m;
    if ((m = l.match(/^function\s+([A-Za-z0-9_$]+)\s*\(/))) return m[1];
    if ((m = l.match(/^\s{0,4}(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/))) return m[1];
    if ((m = l.match(/^\s{0,4}const\s+([A-Za-z0-9_$]+)\s*=\s*useCallback\s*\(/))) return m[1];
  }
  return "(bilinmiyor)";
}

// ---- BİLİNEN KAPILAR -------------------------------------------------------------------------
// Her giriş: fonksiyon adı → o fonksiyonun ne yaptığı. Sayı DEĞİL, ad eşleşmesi kullanılıyor:
// sayı tutmak, aynı fonksiyon içinde satır eklendiğinde gereksiz bulgu üretirdi.
const IZINLI_YAZICILAR = new Set(process.env.SAYIM ? [] : [
  // — TEK KAPI —
  // `stokFisiKaydet` (cari kartından kesilen alış/satış fişi) ve `siparisGerceklestir`
  // (sipariş teslim alma) artık hareketi KENDİLERİ yazmıyor; ikisi de buradan geçiyor.
  "fisYaz",                     // fişin bütün stok + cari yan etkileri
  // — ÜRETİM —
  "uretimProsesVer",            // prosese hammadde/yarı mamul çıkışı
  "uretimProsesAtamaTeslimAl",  // prosesten teslim alma
  "numuneUret",                 // Modelhane 3. tur (20 Eylül): numune için reçete × miktar hammadde çıkışı, NUM fişi
  // — ELLE GİRİŞ —
  "bagimsizStokGirisiYap",      // fişsiz/serbest stok girişi
  "hareketEkle",                // stok kartından elle hareket
  "addHareket",                 // cari kartından elle hareket
  // — KÖPRÜ —
  "addCariHareketFromStok",     // stok tarafının cariye yazması (tek geçit, kendisi kapı değil)
  "hesabaHareketEkle",          // kasa/banka defterine hareket yerleştirme — saf geçit; fişin peşin
                                //   ayağı (`muhasebeyePesinIsle`) ve çek tahsili buradan geçiyor
  // — ONARIM —
  "defterTopluOnar",            // eksik defter alanını toplu doldurma
  "eksikHareketOnar",           // Veri Denetimi: siparişte var stokta yok → fişten yeniden yaz (15 Eylül)
  "acilisFarklariniHareketeCevir",  // geçiş: hareketsiz başlangıç miktarını açılış hareketine bağlar (16 Eylül)
  "virmanYap",                  // kasalar/bankalar arası aktarım: kaynaktan çıkış, hedefe giriş (17 Eylül)
  "defterdenYenidenKur",        // Veri Denetimi: fiş defterindeki kaydı stoğa birebir geri yaz (Adım 2)
  "defterDuzeltmeYaz",          // tek kaydın defterini düzeltme
  // — AÇILIŞ —
  // Bu kapı BİR KEREYE mahsus: stok önbelleğinin hareketlerle açıklanamayan kısmını tek satıra
  // döküyor ki "stok hareketten türetilsin" mümkün olsun. Ticari bir fiş değil, defterin
  // başlangıç noktası. `fisYaz`dan geçirilemez: fisYaz cari/sipariş/ambalaj yan etkileri olan
  // bir işlem, açılışın hiçbiri yok.
  "acilisFisleriUret",          // önbellek-defter farkını açılış hareketi olarak yazma
]);

// Geri alan yollar ayrı sayılır: bunlar hareket YAZMAZ, siler. Yazıcı listesiyle karıştırmak,
// "kapı sayısı" ölçüsünü anlamsız yapardı.
const IZINLI_SILICILER = new Set([
  // Üç yol tek kapıda birleşti (v1.44.0):
  //   `removeHareketEverywhere` (tek hareket) ve `yetimFisTemizle` (fişin tamamı) artık gövdeyi
  //   paylaşıyor; ikisi de yalnızca çöp kaydı, yazma ve bildirim yapıyor.
  //   `cariSilCascade` ise ADI dışında artık silici değil: hareketi olan cariyi silmeyi REDDEDEN
  //   korumalı bir yol (adı geriye dönük uyumluluk için duruyor).
  "fisGeriAl",                  // fişin/hareketin bütün stok + cari + sipariş etkilerini geri al
]);

// Boş dizi açan yerler yazıcı sayılmaz: `hareketler: []` yeni bir kayıt kurar, harekete
// dokunmaz. Yalnızca içine bir şey KONAN yerler sayılır.
const YAZMA_DESENI = /hareketler:\s*\[\s*(?!\])/g;

const bulgular = [];
const gorulen = new Map();

let m;
while ((m = YAZMA_DESENI.exec(kaynak)) !== null) {
  const sat = satirNo(m.index);
  const satirMetni = satirlar[sat - 1] || "";
  // Yorum satırları ve tip/şema açıklamaları sayılmaz.
  if (/^\s*(\/\/|\*)/.test(satirMetni)) continue;
  const fn = kapsayanFonksiyon(m.index);
  if (!gorulen.has(fn)) gorulen.set(fn, []);
  gorulen.get(fn).push(sat);
}

gorulen.forEach((satirNolar, fn) => {
  if (IZINLI_YAZICILAR.has(fn)) return;
  bulgular.push(
    `${dosya}:${satirNolar[0]}  \`${fn}\` hareket yazıyor ama bilinen kapılar listesinde yok — ` +
    "var olan bir kapıdan geçir; gerçekten yeni bir kapıysa kapidenetim.js listesine ekle"
  );
});

// Liste büyümesin: izinli olup da artık kodda bulunmayan adlar temizlenmeli, yoksa liste
// zamanla anlamsız bir birikime dönüşür ve koruma değeri kalmaz.
const olulerHaric = new Set([...IZINLI_YAZICILAR, ...IZINLI_SILICILER].filter((ad) => !kaynak.includes(ad)));
olulerHaric.forEach((ad) => {
  bulgular.push(`kapidenetim.js  \`${ad}\` artık kodda yok — izinli kapılar listesinden çıkarın`);
});

if (!bulgular.length) {
  console.log(`  16   hareket kapıları ........ TEMİZ · ${gorulen.size} yazıcı, ${IZINLI_SILICILER.size} silici`);
} else {
  bulgular.forEach((b) => console.log("  ✗ [16 hareket kapıları] " + b));
  console.log(`  16   hareket kapıları ........ ${bulgular.length} BULGU`);
}
process.exit(bulgular.length ? 1 : 0);
