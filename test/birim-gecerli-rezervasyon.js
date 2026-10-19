// BİRİM TESTİ — GEÇERLİ REZERVASYONLAR (v1.713.0, 020 gecerliRezervasyonlar)
// Kullanıcı: "üretimi ben sildim bilerek, sorunum hatanın çıkması" — silinmiş üretimin rezervasyonu talebe girmemeli.
const { gecerliRezervasyonlar, rezervasyonFarkiniUygula } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const rez = [
  { id: "r1", uretimNo: "10033", miktar: 136 },
  { id: "r2", uretimNo: 10034, miktar: 5 },
  { id: "r3", miktar: 2 },
  { id: "r4", uretimNo: "10035", miktar: 1 },
];
const uretim = [{ id: "u1", siparisNo: "10034" }, { id: "u2", siparisNo: 10035 }];
bekle("silinmiş üretimin (10033) rezervasyonu düşer; sayı/dize karışık numaralar eşleşir; üretimsiz satır kalır",
  gecerliRezervasyonlar(rez, uretim).map((r) => r.id), ["r2", "r3", "r4"]);
bekle("hepsi geçerliyse AYNI dizi döner (gereksiz çizim yok)", gecerliRezervasyonlar(rez.slice(1), uretim) === rez.slice(1) ? "kopya" : "aynı", "aynı");
const ayni = rez.slice(1); bekle("aynı dizi kimliği", gecerliRezervasyonlar(ayni, uretim) === ayni, true);
bekle("boş girdiler", gecerliRezervasyonlar(null, null), []);
bekle("üretim listesi boşsa üretimli rezervasyonların hepsi düşer", gecerliRezervasyonlar(rez, []).map((r) => r.id), ["r3"]);

// ---- rezervasyonFarkiniUygula (v1.713.1): kapanışta hesaplanan fark güncel listeye uygulanır; silinmiş satır geri gelmez.
const kapanis = [
  { id: "a", uretimNo: "10033", tuketilen: 0, miktar: 10, renk: "Siyah", beden: "41" },   // bu arada silindi
  { id: "b", uretimNo: "10040", tuketilen: 2, miktar: 10, renk: "Siyah", beden: "41" },
  { id: "c", uretimNo: "10040", tuketilen: 0, miktar: 5, renk: "Taba", beden: "42" },
];
const hesaplanan = [
  { ...kapanis[0], tuketilen: 4 },
  { ...kapanis[1], tuketilen: 7 },
  kapanis[2],
];
const guncel = [
  { id: "b", uretimNo: "10040", tuketilen: 3, miktar: 10, renk: "Siyah", beden: "41" },   // başka cihaz 1 düşmüş
  { id: "c", uretimNo: "10040", tuketilen: 0, miktar: 5, renk: "Taba", beden: "42" },
  { id: "d", uretimNo: "10041", tuketilen: 0, miktar: 3, renk: "Siyah", beden: "43" },    // bu arada eklendi
];
const u = rezervasyonFarkiniUygula(guncel, kapanis, hesaplanan);
bekle("silinmiş a geri gelmez; b'ye +5 fark binmiş (3→8); c aynı; yeni d korunur",
  u.map((r) => `${r.id}:${r.tuketilen}`), ["b:8", "c:0", "d:0"]);
bekle("c nesnesi aynı kaldı", u[1] === guncel[1], true);
bekle("fark yoksa aynı dizi", rezervasyonFarkiniUygula(guncel, kapanis, kapanis) === guncel, true);
bekle("ad değişikliği fark olarak uygulanır", rezervasyonFarkiniUygula(guncel, kapanis, kapanis.map((r) => (r.beden === "41" ? { ...r, beden: "41,5" } : r))).map((r) => r.beden), ["41,5", "42", "43"]);
const kimliksiz = [{ siparisId: "s1", urunId: "u1", renk: "Siyah", beden: "41", tarih: "t1", tuketilen: 0, miktar: 5 }];
bekle("kimliksiz kayıt sipariş+ürün+renk+beden+tarih ile eşlenir", rezervasyonFarkiniUygula(kimliksiz, kimliksiz, [{ ...kimliksiz[0], tuketilen: 2 }])[0].tuketilen, 2);
if (hata) { console.log("BİRİM TESTİ HATA: geçerli rezervasyon"); process.exit(1); }
console.log("birim-gecerli-rezervasyon: tamam");
