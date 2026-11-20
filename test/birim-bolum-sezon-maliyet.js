// BİRİM — BÖLÜM ÇİFT BAŞI GERÇEK MALİYET: DÖNEM VE SEZON (v1.744.32, kullanıcı 20 Kasım).
//   "140.000 ₺ fiş kesildi … o ay 1000 çift iş yapılmış ise kesim maliyeti 140 ₺; raporu ne kadar zaman için alırsak ona
//    bölmesi gerekir, 6 ay × 140.000 ₺ ÷ 6 aylık kesimhane adedi … sezon olarak da değerlendirebiliriz; siparişi girerken
//    sezon giriyoruz; aynı anda 2 sezon üretimi de yaptığımız oluyor." · "kesim için fason iş gönderdiğimizde … kesimhanenin
//    işi değil" (adet yalnız bölüm personelinin teslimi = bölüm tahakkuku).
// Ölçülen (015 bolumSezonDokumu, 015 bolumKarZarar, 247 kzDonemAraligi):
//   - aynı ay iki sezon: maaş o ayın adedine göre paylaştırılır (ay çift başı ortak)
//   - farklı aylar: her sezon kendi ayının çift başıyla
//   - teslim girilmeyen ayın maaşı "dağıtılamayan" (sezonlara girmez; dönem çift başına girer)
//   - siparişsiz üretim "(sezonsuz)"; başka bölümün tahakkuku sayılmaz
//   - Son 3 / Son 6 ay dönemleri
const { bolumSezonDokumu, bolumKarZarar, kzDonemAraligi } = require("./erp.cjs");

let gecti = 0, kaldi = 0;
const ok = (ad, kosul) => { if (kosul) { gecti++; console.log("  ✓ " + ad); } else { kaldi++; console.log("  ✗ " + ad, kosul); } };

const bolum = { id: "b1", ad: "KESİMHANE", personel: [{ cariId: "kemal", maas: 80000 }, { cariId: "gaffar", maas: 60000 }] };
const maas = (cariId, ay, tutar) => ({ id: `m-${cariId}-${ay}`, fisNo: `MAŞ-${ay}-${cariId}`, tarih: `${ay}-01`, tutar, bolumId: "b1" });
// Eylül, Ekim, Kasım: her ay 140.000 maaş (80 + 60)
const cariler = [
  { id: "kemal", hareketler: ["2026-09", "2026-10", "2026-11"].map((a) => maas("kemal", a, 80000)) },
  { id: "gaffar", hareketler: ["2026-09", "2026-10", "2026-11"].map((a) => maas("gaffar", a, 60000)) },
];
const siparisler = [
  { id: "s1", siparisNo: "SAT-1", tip: "Satış", sezon: "İlkbahar/Yaz 2027" },
  { id: "s2", siparisNo: "SAT-2", tip: "Satış", sezon: "Sonbahar/Kış 2026" },
];
const tah = (id, tarih, adet, ucret, bolumId = "b1") => ({ id, bolumId, proses: "Kesim", tarih, adet, ucret, tutar: adet * ucret });
const uretim = [
  // EKİM: iki sezon aynı ay — İY 600 çift, SK 400 çift → ay adedi 1000, ay çift başı 140
  { id: "u1", siparisNo: "1001", rezervasyonSiparisId: "s1", bolumTahakkuklari: [tah("t1", "2026-10-10", 600, 30)] },
  { id: "u2", siparisNo: "1002", rezervasyonSiparisId: "s2", bolumTahakkuklari: [tah("t2", "2026-10-20", 400, 35)] },
  // KASIM: yalnız İY 700 çift → ay çift başı 200
  { id: "u3", siparisNo: "1003", rezervasyonSiparisId: "s1", bolumTahakkuklari: [tah("t3", "2026-11-05", 700, 30)] },
  // Siparişsiz (depoya) üretim, Kasım 0 adetlik değil: 300 çift → Kasım ay adedi 1000, çift başı 140 olur (aşağıda yeniden hesap)
  { id: "u4", siparisNo: "1004", bolumTahakkuklari: [tah("t4", "2026-11-25", 300, 30)] },
  // Başka bölümün tahakkuku (fason değil; farklı bölüm) — sayılmaz
  { id: "u5", siparisNo: "1005", rezervasyonSiparisId: "s1", bolumTahakkuklari: [tah("t5", "2026-11-25", 999, 10, "b2")] },
];
// Eylül: maaş var, teslim yok → dağıtılamayan 140.000
const hepsi = () => true;
const d = bolumSezonDokumu(bolum, uretim, cariler, siparisler, hepsi);
const z = (ad) => d.satirlar.find((x) => x.sezon === ad) || {};

console.log("── sezon paylaştırması (Eylül–Kasım)");
// Ekim çift başı = 140.000 ÷ 1000 = 140; Kasım = 140.000 ÷ (700 + 300) = 140
ok("İlkbahar/Yaz 2027 adet 1300 (Ekim 600 + Kasım 700)", z("İlkbahar/Yaz 2027").adet === 1300);
ok("İlkbahar/Yaz maliyet = 600×140 + 700×140 = 182.000", z("İlkbahar/Yaz 2027").maliyet === 182000);
ok("Sonbahar/Kış 2026 adet 400, maliyet 400×140 = 56.000", z("Sonbahar/Kış 2026").adet === 400 && z("Sonbahar/Kış 2026").maliyet === 56000);
ok("siparişsiz üretim (sezonsuz) 300 × 140 = 42.000", z("(sezonsuz)").adet === 300 && z("(sezonsuz)").maliyet === 42000);
ok("sezonsuz en sonda", d.satirlar[d.satirlar.length - 1].sezon === "(sezonsuz)");
ok("çift başı gerçek 140 (sezonlar)", z("İlkbahar/Yaz 2027").ciftMaliyeti === 140 && z("Sonbahar/Kış 2026").ciftMaliyeti === 140);
ok("reçetedeki ortalama: SK 35, İY 30", z("Sonbahar/Kış 2026").receteOrtalamasi === 35 && z("İlkbahar/Yaz 2027").receteOrtalamasi === 30);
ok("başka bölümün tahakkuku sayılmadı (toplam adet 2000)", d.satirlar.reduce((t, x) => t + x.adet, 0) === 2000);
ok("teslimsiz Eylül maaşı dağıtılamayan = 140.000", d.dagitilamayan === 140000);
ok("dağıtılan + dağıtılamayan = toplam maaş (420.000)", d.satirlar.reduce((t, x) => t + x.maliyet, 0) + d.dagitilamayan === 420000);

console.log("── farklı ay çift başı");
// Kasım'da depo üretimi olmasaydı: Kasım çift başı 200 → İY = 600×140 + 700×200 = 224.000
const d2 = bolumSezonDokumu(bolum, uretim.filter((u) => u.id !== "u4"), cariler, siparisler, hepsi);
ok("İY maliyet her ay kendi çift başıyla (84.000 + 140.000 = 224.000)", (d2.satirlar.find((x) => x.sezon === "İlkbahar/Yaz 2027") || {}).maliyet === 224000);

console.log("── dönem süzgeci");
const kasim = (t) => String(t).slice(0, 7) === "2026-11";
const dk = bolumSezonDokumu(bolum, uretim, cariler, siparisler, kasim);
ok("yalnız Kasım: İY 700, sezonsuz 300; SK yok", (dk.satirlar.find((x) => x.sezon === "İlkbahar/Yaz 2027") || {}).adet === 700 && !dk.satirlar.some((x) => x.sezon === "Sonbahar/Kış 2026"));
ok("Kasım'da dağıtılamayan yok", dk.dagitilamayan === 0);
const kz = bolumKarZarar(bolum, uretim, cariler, hepsi);
ok("dönem çift başı (rapor satırı) = 420.000 ÷ 2000 = 210 (boş Eylül dahil)", kz.adet === 2000 && kz.maas === 420000 && kz.maas / kz.adet === 210);

console.log("── Son 3 / 6 ay");
const a3 = kzDonemAraligi("son3Ay"), a6 = kzDonemAraligi("son6Ay"), b = new Date();
const ayFarki = (x) => (b.getFullYear() - x.getFullYear()) * 12 + (b.getMonth() - x.getMonth());
ok("son 3 ay: 2 ay öncesinin 1'i, bu ayın sonu", ayFarki(a3.bas) === 2 && a3.bas.getDate() === 1 && a3.son.getMonth() === b.getMonth());
ok("son 6 ay: 5 ay öncesinin 1'i", ayFarki(a6.bas) === 5 && a6.bas.getDate() === 1);

console.log("── tarih aralığı");
const ar = kzDonemAraligi("aralik:2026-10-01:2026-11-30");
ok("aralık: iki uç dahil (1 Ekim 00:00 – 30 Kasım 23:59)", ar.bas.getMonth() === 9 && ar.bas.getDate() === 1 && ar.son.getMonth() === 10 && ar.son.getDate() === 30 && ar.son.getHours() === 23);
const icinde = (t) => { const x = new Date(t); return x >= ar.bas && x <= ar.son; };
const da = bolumSezonDokumu(bolum, uretim, cariler, siparisler, icinde);
ok("Ekim–Kasım aralığında Eylül dağıtılamayanı yok, adet 2000", da.dagitilamayan === 0 && da.satirlar.reduce((t, x) => t + x.adet, 0) === 2000);
const ters = kzDonemAraligi("aralik:2026-12-01:2026-10-01"), eksik = kzDonemAraligi("aralik::2026-10-01");
ok("ters / eksik aralık boş (hiçbir tarih uymaz — 'Tümü' sanılmaz)", ters.bas > ters.son && eksik.bas > eksik.son);

console.log(`── bolum-sezon-maliyet: ${gecti} geçti, ${kaldi} kaldı ──`);
process.exit(kaldi ? 1 : 0);
