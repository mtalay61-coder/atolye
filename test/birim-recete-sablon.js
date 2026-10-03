// BİRİM TESTİ — REÇETE ŞABLONU RENK POZİSYONU + İŞÇİLİK (v1.558.0)
// Kullanıcı: "İlk resim şablondan eklenen reçete, ikinci resim şablonun oluşturulduğu reçete. Şablondan ekleme doğru
// çalışmıyor." 27080 D (Kahve Süet) → şablon → 27081 D (4 renk): deri dört renkte de "Kahve Süet" geliyordu.
const { sablonuUruneUygula, recetedenSablonSatirlari, urundenSablonIsciligi, sablonPozisyonu, receteGrupla } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const satir = (mamulRenk, hammaddeUrunId, hammaddeAd, renk, miktar, proses, ek = {}) => ({ id: `${hammaddeUrunId}-${mamulRenk}`, mamulRenk, mamulBeden: "Tüm Bedenler", hammaddeUrunId, hammaddeAd, renk, beden: "Standart", miktar, birim: "Çift", proses, ...ek });
const kaynak = {
  id: "k", ad: "27080 D", variants: [{ renk: "Kahve Süet", beden: "40" }],
  recete: [
    satir("Kahve Süet", "deri", "Deri", "Kahve Süet", 18, "Kesim"),
    satir("Kahve Süet", "astar", "Astar Dana", "Kahve", 18, "Kesim"),
    satir("Kahve Süet", "aks", "Aksesuar", "Nikel", 2, "Saya"),
  ],
  prosesUcretleri: { Kesim: 35, Saya: 0 }, araProsesEklentileri: { Kesim: ["ap1"] }, araProsesUcretleri: { ap1: 3 },
};
const s = recetedenSablonSatirlari(kaynak.recete);
bekle("mamul rengiyle aynı deri pozisyon 1, diğerleri sabit", s.satirlar.map((x) => `${x.hammaddeAd}:${x.pozisyon || x.renk}`), ["Deri:1", "Astar Dana:Kahve", "Aksesuar:Nikel"]);
const sablon = { id: "s", ad: "Atom Şabon", satirlar: s.satirlar, iscilik: urundenSablonIsciligi(kaynak) };
bekle("şablon işçiliği: sıfır ücret girmez", sablon.iscilik.prosesUcretleri, { Kesim: 35 });

const hedef = { id: "h", ad: "27081 D", variants: ["Beee3j Yeni Süet", "Taba Süet", "Kahve Süet", "Pudra Süet"].map((renk) => ({ renk, beden: "40" })),
  recete: [], prosesUcretleri: { Saya: 20 } };
const u = sablonuUruneUygula(sablon, hedef);
const deri = u.eklenecekler.filter((r) => r.hammaddeAd === "Deri").map((r) => `${r.mamulRenk}→${r.renk}`);
bekle("her mamul rengi kendi derisini alır", deri, ["Beee3j Yeni Süet→Beee3j Yeni Süet", "Taba Süet→Taba Süet", "Kahve Süet→Kahve Süet", "Pudra Süet→Pudra Süet"]);
bekle("sabit renk (Nikel) her renkte aynı", [...new Set(u.eklenecekler.filter((r) => r.hammaddeAd === "Aksesuar").map((r) => r.renk))], ["Nikel"]);
bekle("pozisyonlu satır '1. Renk' açıklaması", u.eklenecekler.find((r) => r.hammaddeAd === "Deri").aciklama, "1. Renk");
bekle("miktar taşınır", u.eklenecekler.find((r) => r.hammaddeAd === "Deri").miktar, 18);
bekle("işçilik: boş olan dolar, dolu (Saya 20) ezilmez", u.ekAlanlar.prosesUcretleri, { Saya: 20, Kesim: 35 });
bekle("ara proses ve ücreti gelir", [u.ekAlanlar.araProsesEklentileri, u.ekAlanlar.araProsesUcretleri], [{ Kesim: ["ap1"] }, { ap1: 3 }]);
// v1.559.0 — "yine olmadı": tek eklemeId 3 hammaddeyi tek "Deri" kartına sıkıştırıyordu.
const idler = (ad) => [...new Set(u.eklenecekler.filter((r) => r.hammaddeAd === ad).map((r) => r.eklemeId))];
bekle("her hammaddenin kendi eklemeId'si, renkler arasında ortak", [idler("Deri").length, idler("Astar Dana").length, idler("Aksesuar").length, new Set([...idler("Deri"), ...idler("Astar Dana"), ...idler("Aksesuar")]).size], [1, 1, 1, 3]);
bekle("eklemeId 'sablon-' önekli (geri alma)", u.eklenecekler.every((r) => String(r.eklemeId).startsWith("sablon-")), true);
bekle("reçete görünümü: 3 kart (hammadde başına)", receteGrupla(u.eklenecekler.map((r, i) => ({ ...r, id: `x${i}` }))).map((g) => `${g.hammaddeAd}:${g.satirlar.length}`), ["Deri:4", "Astar Dana:4", "Aksesuar:4"]);
// Kullanıcının v1.558 ile eklenmiş satırları (hepsi TEK eklemeId) da hammadde başına ayrışır.
const eski = u.eklenecekler.map((r, i) => ({ ...r, id: `y${i}`, eklemeId: "sablon-tek" }));
bekle("eski tek-kimlikli şablon satırları da ayrışır", receteGrupla(eski).map((g) => g.hammaddeAd), ["Deri", "Astar Dana", "Aksesuar"]);
const ikinci = sablonuUruneUygula(sablon, { ...hedef, recete: u.eklenecekler, ...u.ekAlanlar });
bekle("ikinci uygulamada hepsi zaten var", [ikinci.eklenecekler.length, ikinci.iscilikSayisi], [0, 0]);

// Model rengi (kombinasyon): "1004 - Kırmızı/Bej" — Bej deri 2. pozisyon → hedef "1005 - Siyah/Taba"da Taba.
bekle("kombinasyonda 2. bileşen", sablonPozisyonu({ mamulRenk: "1004 - Kırmızı/Bej", renk: "Bej" }), 2);
const k = sablonuUruneUygula({ ad: "x", satirlar: [{ hammaddeUrunId: "deri", hammaddeAd: "Deri", renk: "Bej", pozisyon: 2, beden: "Standart", miktar: 1 }] },
  { variants: [{ renk: "1005 - Siyah/Taba" }], recete: [] });
bekle("hedef model renginde 2. bileşen (Taba)", k.eklenecekler[0].renk, "Taba");
// Eski şablon (pozisyonsuz) aynen çalışır.
bekle("pozisyonsuz eski şablon: renk aynen", sablonuUruneUygula({ ad: "eski", satirlar: [{ hammaddeUrunId: "d", hammaddeAd: "Deri", renk: "Kahve Süet", miktar: 1 }] }, { variants: [{ renk: "Taba Süet" }], recete: [] }).eklenecekler[0].renk, "Kahve Süet");

console.log(hata ? "birim-recete-sablon: HATA" : "birim-recete-sablon: tamam");
process.exit(hata);
