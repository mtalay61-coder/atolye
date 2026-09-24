// BİRİM TESTİ — RAPOR MOTORU (245-rapor). Kullanıcı (12 Eylül): "raporu kullanıcı kendi yapabilsin,
// hangi bilgileri isteyecek, gruplu vs."
const { raporHesapla, raporSuz, raporGrupla, siparisRaporSatirlari, SIPARIS_RAPOR_ALANLARI, uretimAsamaDagilimi, raporAra, raporKolonAra, raporSayiKosulu, raporMatris } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "\u2713" : "\u2717"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\u00b7 \u00e7\u0131kan:", JSON.stringify(a)); }
};

const cariler = [{ id: "c1", unvan: "Tedarikçi A" }, { id: "c2", unvan: "Müşteri B" }];
const siparisler = [
  { id: "s1", siparisNo: "SAT-1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-09-01", kalemler: [
    { urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 10, karsilanan: 4, birimFiyat: 25, paraBirimi: "USD", birim: "çift" },
    { urunAd: "Bot", renk: "Siyah", beden: "42", miktar: 6, karsilanan: 0, birimFiyat: 25, paraBirimi: "USD", birim: "çift" },
    { urunAd: "Bot", renk: "Taba", beden: "41", miktar: 3, karsilanan: 3, birimFiyat: 27, paraBirimi: "USD", birim: "çift" },
  ] },
  { id: "s2", siparisNo: "SAT-2", tip: "Satış", cariId: "c2", durum: "Tamamlandı", tarih: "2026-08-10", kalemler: [
    { urunAd: "Çizme", renk: "Siyah", beden: "40", miktar: 2, karsilanan: 2, birimFiyat: 900, paraBirimi: "TRY", birim: "çift",
      planlama: { tip: "Üretim", referansNo: "1001" } },
  ] },
  { id: "a1", siparisNo: "AS-1", tip: "Alış", cariId: "c1", durum: "Onaylandı", tarih: "2026-09-05", kalemler: [
    { urunAd: "Deri", renk: "Siyah", beden: "", miktar: 20, karsilanan: 0, birimFiyat: 120, paraBirimi: "TRY", birim: "metre" },
  ] },
];
const alanlar = SIPARIS_RAPOR_ALANLARI;

console.log("1. düz satırlar");
{
  const satis = siparisRaporSatirlari(siparisler, cariler, "Satış");
  // Aşama satırları: k1 (teslim 4 + planlanmadı 6), k2 (planlanmadı 6), k3 (teslim 3), s2 (teslim 2)
  bekle("satış: her kalem aşamalarına bölünür, alış dışarıda", satis.map((r) => [r.siparisNo, r.asama, r.asamaMiktar]),
    [["SAT-1", "Teslim edildi", 4], ["SAT-1", "Planlanmadı", 6], ["SAT-1", "Planlanmadı", 6], ["SAT-1", "Teslim edildi", 3], ["SAT-2", "Teslim edildi", 2]]);
  bekle("cari adı çözüldü", satis[0].cari, "Müşteri B");
  bekle("kalan ve tutar hesaplandı", [satis[0].kalan, satis[0].tutar], [6, 250]);
  bekle("planlama tipi ve referansı", [satis[4].planlamaTipi, satis[4].referans], ["Üretim", "1001"]);
  bekle("alış tarafı ayrı, aşaması 'bekleniyor'", siparisRaporSatirlari(siparisler, cariler, "Alış").map((r) => [r.urun, r.asama, r.asamaMiktar]), [["Deri", "Bekleniyor (yolda)", 20]]);
}

console.log("1b. resim: renk resmi varsa o, yoksa kapak");
{
  const stok = [{ id: "u2", ad: "Bot", kapakResmi: "data:kapak", renkResimleri: { Siyah: "data:siyah" } }];
  const sip = [{ id: "sR", siparisNo: "SAT-R", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-09-01", kalemler: [
    { id: "r1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 1, karsilanan: 0, birimFiyat: 1, paraBirimi: "TRY" },
    { id: "r2", urunId: "u2", urunAd: "Bot", renk: "Taba", beden: "41", miktar: 1, karsilanan: 0, birimFiyat: 1, paraBirimi: "TRY" },
    { id: "r3", urunId: "yok", urunAd: "Bilinmeyen", renk: "", beden: "", miktar: 1, karsilanan: 0, birimFiyat: 1, paraBirimi: "TRY" },
  ] }];
  const r = siparisRaporSatirlari(sip, cariler, "Satış", [], stok);
  bekle("renk resmi / kapak / yok", r.map((x) => x.resim), ["data:siyah", "data:kapak", ""]);
  bekle("resimde arama yapılmıyor", raporAra(r, alanlar, "data:").length, 0);
  const g = raporHesapla(r, alanlar, { sutunlar: ["resim", "urun", "asamaMiktar"], suzgecler: [], gruplar: ["urun"], siralama: null, matris: false });
  bekle("gruplamada ilk resim", g.satirlar.map((x) => x.resim), ["data:siyah", ""]);
  const m = raporHesapla(r, alanlar, { sutunlar: ["resim", "urun", "beden", "asamaMiktar"], suzgecler: [], gruplar: [], siralama: null, matris: true });
  bekle("matriste resim anahtar değil, satırda ilk resim", [m.matris.anahtarlar, m.matris.resimSutunlari, m.satirlar.map((x) => x.resim)], [["urun"], ["resim"], ["data:siyah", ""]]);
}

console.log("2. süzgeç");
{
  const satis = siparisRaporSatirlari(siparisler, cariler, "Satış");
  bekle("metin eşit (büyük/küçük harf duyarsız)", raporSuz(satis, alanlar, [{ alan: "renk", islem: "esit", deger: "siyah" }]).length, 4);
  bekle("sayı büyük", raporSuz(satis, alanlar, [{ alan: "kalan", islem: "buyuk", deger: "0" }]).length, 3);
  bekle("tarih sonrası", raporSuz(satis, alanlar, [{ alan: "tarih", islem: "sonra", deger: "2026-09-01" }]).length, 4);
  bekle("iki süzgeç VE", raporSuz(satis, alanlar, [{ alan: "asama", islem: "esit", deger: "Planlanmadı" }, { alan: "beden", islem: "esit", deger: "41" }]).length, 1);
  bekle("boş değerli süzgeç yok sayılır", raporSuz(satis, alanlar, [{ alan: "renk", islem: "esit", deger: "" }]).length, 5);
  bekle("tanınmayan alan yok sayılır", raporSuz(satis, alanlar, [{ alan: "yok", islem: "esit", deger: "x" }]).length, 5);
  bekle("dolu/boş işlemleri", raporSuz(satis, alanlar, [{ alan: "referans", islem: "dolu" }]).map((r) => r.siparisNo), ["SAT-2"]);
}

console.log("2b. serbest arama");
{
  const satis = siparisRaporSatirlari(siparisler, cariler, "Satış");
  bekle("metin sütunlarında arar, harf duyarsız", raporAra(satis, alanlar, "çiz").map((r) => r.urun), ["Çizme"]);
  bekle("aşama ve planlama metninde de arar (planlanmamış üç kalemin dört satırı)", raporAra(satis, alanlar, "planlanmadı").length, 4);
  bekle("sayıda aramaz", raporAra(satis, alanlar, "250").length, 0);
  bekle("boş arama hepsini bırakır", raporAra(satis, alanlar, "  ").length, 5);
  bekle("hesapta arama süzgeçten önce", raporHesapla(satis, alanlar, { sutunlar: ["urun"], suzgecler: [{ alan: "beden", islem: "esit", deger: "41" }], gruplar: [], siralama: null }, "taba").hamSayi, 1);
}

console.log("2c. sütun aramaları");
{
  const satis = siparisRaporSatirlari(siparisler, cariler, "Satış");
  bekle("metin sütunu içerir", raporKolonAra(satis, alanlar, { renk: "siy" }).length, 4);
  bekle("iki sütun birden (VE)", raporKolonAra(satis, alanlar, { renk: "siyah", beden: "42" }).length, 1);
  bekle("sayı eşit", raporKolonAra(satis, alanlar, { miktar: "6" }).length, 1);
  bekle("sayı büyük", raporKolonAra(satis, alanlar, { miktar: ">5" }).map((r) => r.miktar), [10, 10, 6]);
  bekle("sayı aralık", raporKolonAra(satis, alanlar, { miktar: "3-6" }).map((r) => r.miktar), [6, 3]);
  bekle("küçük eşit, virgüllü", raporKolonAra(satis, alanlar, { birimFiyat: "<=25,5" }).length, 3);
  bekle("boş kutu süzmez", raporKolonAra(satis, alanlar, { renk: "  ", miktar: "" }).length, 5);
  bekle("anlaşılmayan sayı girdisi hiçbir satırı geçirmez", raporKolonAra(satis, alanlar, { miktar: "abc" }).length, 0);
  bekle("bilinmeyen sütun yok sayılır", raporKolonAra(satis, alanlar, { yok: "x" }).length, 5);
  bekle("sayı koşulu: boş → null", raporSayiKosulu(""), null);
  // Seçenek listesinden gelen ekran biçimli tarih kayıttaki ISO tarihle eşleşmeli.
  bekle("tarih kutusu gün.ay.yıl anlıyor", raporKolonAra(satis, alanlar, { tarih: "10.08.2026" }).map((r) => r.siparisNo), ["SAT-2"]);
  bekle("tarih kutusu yıl olmadan ay.gün", raporKolonAra(satis, alanlar, { tarih: "1.9" }).length, 4);
  bekle("tarih kutusu ISO da olur", raporKolonAra(satis, alanlar, { tarih: "2026-09" }).length, 4);
  const s = raporHesapla(satis, alanlar, { sutunlar: ["urun", "asamaMiktar"], suzgecler: [], gruplar: ["urun"], siralama: null, kolonAramalari: { asama: "planlanmadı" } });
  bekle("gruplu raporda sütun araması satırlara uygulanır", s.satirlar.map((r) => [r.urun, r.asamaMiktar]), [["Bot", 12]]);
}

console.log("3. gruplama");
{
  const satis = siparisRaporSatirlari(siparisler, cariler, "Satış");
  const g = raporGrupla(satis, alanlar, ["urun", "renk", "asama"], ["urun", "renk", "asama", "asamaMiktar", "beden"]);
  const botSiyahPlansiz = g.find((r) => r.urun === "Bot" && r.renk === "Siyah" && r.asama === "Planlanmadı");
  bekle("dört grup (ürün·renk·aşama)", g.length, 4);
  bekle("aşama miktarı toplandı", [botSiyahPlansiz.asamaMiktar, botSiyahPlansiz._adet], [12, 2]);
  bekle("metin sütununda farklı değerler sayıldı", botSiyahPlansiz.beden, "(2 farklı)");
  bekle("tek değerli metin olduğu gibi", g.find((r) => r.urun === "Bot" && r.renk === "Taba").beden, "41");
  bekle("gruplama yoksa satırlar aynen", raporGrupla(satis, alanlar, [], ["urun"]).length, 5);
}

console.log("4. hesap: süz + grupla + sırala + toplam");
{
  const satis = siparisRaporSatirlari(siparisler, cariler, "Satış");
  const s = raporHesapla(satis, alanlar, {
    sutunlar: ["renk", "asamaMiktar", "paraBirimi"], suzgecler: [{ alan: "durum", islem: "esit", deger: "Bekliyor" }],
    gruplar: ["urun", "asama"], siralama: { alan: "asamaMiktar", yon: "azalan" },
  });
  bekle("gruplama alanları başa alınır", s.sutunlar, ["urun", "asama", "renk", "asamaMiktar", "paraBirimi"]);
  bekle("süzülüp gruplandı, azalan", s.satirlar.map((r) => [r.asama, r.asamaMiktar]), [["Planlanmadı", 12], ["Teslim edildi", 7]]);
  bekle("toplam satırı", s.toplam.asamaMiktar, 19);
  bekle("ham satır sayısı", s.hamSayi, 4);
  // Para birimi KARIŞIKSA tutar toplanmaz: dolarla lirayı toplamak yanlış bir sayı verir.
  const s2 = raporHesapla(satis, alanlar, { sutunlar: ["urun", "tutar"], suzgecler: [], gruplar: [], siralama: { alan: "urun", yon: "artan" } });
  bekle("karışık para biriminde tutar toplanmıyor", s2.toplam.tutar, "(karışık p.b.)");
  bekle("sıralama artan", s2.satirlar.map((r) => r.urun), ["Bot", "Bot", "Bot", "Bot", "Çizme"]);
  // Eski kayıtta artık var olmayan sütun raporu kilitlemez.
  const s3 = raporHesapla(satis, alanlar, { sutunlar: ["urun", "eskiAlan"], suzgecler: [], gruplar: ["eskiAlan"], siralama: null });
  bekle("bilinmeyen sütun ve grup atlanır", s3.sutunlar, ["urun"]);
}

console.log("4b. kalem bazlı sayılar aşama satırlarında BİR kez sayılır");
{
  const sip = [{ id: "s7", siparisNo: "SAT-7", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-09-01", kalemler: [
    { id: "k7", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 10, karsilanan: 4, birimFiyat: 25, paraBirimi: "USD", birim: "çift" },
  ] }];
  const satirlar = siparisRaporSatirlari(sip, cariler, "Satış");
  bekle("kalem iki aşama satırı", satirlar.map((r) => r.asama), ["Teslim edildi", "Planlanmadı"]);
  const s = raporHesapla(satirlar, alanlar, { sutunlar: ["urun", "miktar", "tutar", "asamaMiktar"], suzgecler: [], gruplar: ["urun"], siralama: null });
  bekle("grupta miktar ve tutar bir kez, aşama miktarı toplam", [s.satirlar[0].miktar, s.satirlar[0].tutar, s.satirlar[0].asamaMiktar], [10, 250, 10]);
  const s2 = raporHesapla(satirlar, alanlar, { sutunlar: ["urun", "miktar", "tutar", "asamaMiktar"], suzgecler: [], gruplar: [], siralama: null });
  bekle("gruplamasız toplam satırında da bir kez", [s2.toplam.miktar, s2.toplam.tutar, s2.toplam.asamaMiktar], [10, 250, 10]);
}

console.log("4c. tutarlar ve toplanmayan birim fiyat");
{
  const sip = [{ id: "s8", siparisNo: "SAT-8", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-09-01", kalemler: [
    { id: "k8", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 10, karsilanan: 4, birimFiyat: 222, paraBirimi: "TRY", birim: "çift" },
    { id: "k9", urunAd: "Bot", renk: "Siyah", beden: "42", miktar: 5, karsilanan: 0, birimFiyat: 222, paraBirimi: "TRY", birim: "çift" },
  ] }];
  const satirlar = siparisRaporSatirlari(sip, cariler, "Satış");
  bekle("kalem tutarları", satirlar.map((r) => [r.asama, r.tutar, r.teslimTutar, r.kalanTutar, r.asamaTutar]),
    [["Teslim edildi", 2220, 888, 1332, 888], ["Planlanmadı", 2220, 888, 1332, 1332], ["Planlanmadı", 1110, 0, 1110, 1110]]);
  const s = raporHesapla(satirlar, alanlar, { sutunlar: ["urun", "birimFiyat", "tutar", "teslimTutar", "kalanTutar", "asamaTutar"], suzgecler: [], gruplar: [], siralama: null });
  bekle("toplamda birim fiyat YOK, tutarlar kalem başına bir kez, aşama tutarı her satır",
    [s.toplam.birimFiyat, s.toplam.tutar, s.toplam.teslimTutar, s.toplam.kalanTutar, s.toplam.asamaTutar], [undefined, 3330, 888, 2442, 3330]);
  const g = raporHesapla(satirlar, alanlar, { sutunlar: ["urun", "birimFiyat", "tutar"], suzgecler: [], gruplar: ["urun"], siralama: null });
  bekle("grupta birim fiyat toplanmıyor, tek değer olduğu gibi", [g.satirlar[0].birimFiyat, g.satirlar[0].tutar], ["222", 3330]);
}

console.log("5. üretim aşama dağılımı — kullanıcının örneği");
{
  // 200 çift, tek beden. Prosesler: Kesim → Saya → Montaj.
  //   Kesim: 160 verildi ve teslim alındı (sağlam), 40 kimseye verilmedi → "Kesim bekliyor 40"
  //   Saya: 160 geldi; 150 verildi, 100'ü teslim alındı; 50 çalışılıyor → "Saya'da 50", "Saya bekliyor 10"
  //   Montaj: 100 geldi, 100 verildi ve teslim alındı → "Üretildi (stokta) 100"
  const u = {
    siparisNo: "1001", bedenMiktarlari: [{ beden: "41", miktar: 200 }],
    prosesIlerleme: [
      { proses: "Kesim", atamalar: [{ id: "a1", bedenMiktarlari: { 41: 160 }, tamamlandiMi: true }] },
      { proses: "Saya", atamalar: [
        { id: "a2", bedenMiktarlari: { 41: 100 }, tamamlandiMi: true },
        { id: "a3", bedenMiktarlari: { 41: 50 }, tamamlandiMi: false },
      ] },
      { proses: "Montaj", atamalar: [{ id: "a4", bedenMiktarlari: { 41: 100 }, tamamlandiMi: true }] },
    ],
  };
  const d = uretimAsamaDagilimi(u).map((x) => `${x.asama}:${x.miktar}`);
  bekle("aşamalar", d, ["Kesim bekliyor:40", "Saya bekliyor:10", "Saya'da:50", "Üretildi (stokta):100"]);

  // Sipariş: 210 çift, 200'ü üretime planlı, 10'u planlanmamış (ayrı kalem), 20'si teslim edilmiş.
  const sip = [{ id: "s5", siparisNo: "SAT-5", tip: "Satış", cariId: "c2", durum: "Hazırlanıyor", tarih: "2026-09-01", kalemler: [
    { urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 200, karsilanan: 20, birimFiyat: 25, paraBirimi: "USD", birim: "çift", planlama: { tip: "Üretim", referansNo: "1001" } },
    { urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 10, karsilanan: 0, birimFiyat: 25, paraBirimi: "USD", birim: "çift", planlama: null },
  ] }];
  const r = siparisRaporSatirlari(sip, cariler, "Satış", [u]).map((x) => `${x.asama}:${x.asamaMiktar}`);
  bekle("sipariş satırları — kullanıcının örneği",
    r, ["Teslim edildi:20", "Kesim bekliyor:40", "Saya bekliyor:10", "Saya'da:50", "Üretildi (stokta):80", "Planlanmadı:10"]);
  bekle("aşama satırları prosesini taşıyor (ikon için)",
    siparisRaporSatirlari(sip, cariler, "Satış", [u]).map((x) => x._proses), ["", "Kesim", "Saya", "Saya", "", ""]);
  bekle("aşama miktarları sipariş toplamını veriyor",
    siparisRaporSatirlari(sip, cariler, "Satış", [u]).reduce((t, x) => t + x.asamaMiktar, 0), 210);

  // HURDA ve TAMİR: Kesim'de 5 hurda; teslim alınan sağlam 155. Hurda ayrı satır.
  const u2 = { ...u, prosesIlerleme: [
    { proses: "Kesim", atamalar: [{ id: "a1", bedenMiktarlari: { 41: 160 }, tamamlandiMi: true, sonuc: { saglam: { 41: 155 }, tamir: [], hurda: [{ beden: "41", miktar: 5 }] } }] },
    { proses: "Saya", atamalar: [] },
  ] };
  bekle("hurda ayrı satır, sağlam akıyor", uretimAsamaDagilimi(u2).map((x) => `${x.asama}:${x.miktar}`),
    ["Kesim bekliyor:40", "Hurda:5", "Saya bekliyor:155"]);

  // Prosessiz eski üretim: stoğa eklendiyse üretildi, değilse bekliyor.
  bekle("prosessiz üretim", uretimAsamaDagilimi({ bedenMiktarlari: [{ beden: "41", miktar: 3 }], prosesIlerleme: [], stogaEklendiMi: true }).map((x) => `${x.asama}:${x.miktar}`), ["Üretildi (stokta):3"]);

  // Satın almaya planlanmış kalem: alış siparişinde 12'si teslim alınmış.
  const sip2 = [
    { id: "s6", siparisNo: "SAT-6", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-09-01", kalemler: [
      { urunId: "u9", urunAd: "Çanta", renk: "Siyah", beden: "", miktar: 30, karsilanan: 0, birimFiyat: 10, paraBirimi: "TRY", planlama: { tip: "Satınalma", referansNo: "AS-9" } }] },
    { id: "a9", siparisNo: "AS-9", tip: "Alış", cariId: "c1", durum: "Kısmi Teslim", tarih: "2026-09-02", kalemler: [
      { urunId: "u9", urunAd: "Çanta", renk: "Siyah", beden: "", miktar: 30, karsilanan: 12, birimFiyat: 6, paraBirimi: "TRY" }] },
  ];
  bekle("satın alma: teslim alınan ve yolda", siparisRaporSatirlari(sip2, cariler, "Satış").map((x) => `${x.asama}:${x.asamaMiktar}`),
    ["Alış fişi kesildi:12", "Alış siparişinde (yolda):18"]);
}

console.log("6. matris — kullanıcının örneği: 36 kesimde, 37-38 bitmiş");
{
  const u = {
    siparisNo: "3001", bedenMiktarlari: [{ beden: "36", miktar: 10 }, { beden: "37", miktar: 12 }, { beden: "38", miktar: 8 }],
    prosesIlerleme: [
      { proses: "Kesim", atamalar: [{ id: "a1", bedenMiktarlari: { 37: 12, 38: 8 }, tamamlandiMi: true }] },
      { proses: "Montaj", atamalar: [{ id: "a2", bedenMiktarlari: { 37: 12, 38: 8 }, tamamlandiMi: true }] },
    ],
  };
  const sip = [{ id: "s9", siparisNo: "SAT-9", tip: "Satış", cariId: "c2", durum: "Hazırlanıyor", tarih: "2026-09-01", kalemler: [
    { id: "k36", urunAd: "Bot", renk: "Siyah", beden: "36", miktar: 10, karsilanan: 0, birimFiyat: 25, paraBirimi: "USD", planlama: { tip: "Üretim", referansNo: "3001" } },
    { id: "k37", urunAd: "Bot", renk: "Siyah", beden: "37", miktar: 12, karsilanan: 0, birimFiyat: 25, paraBirimi: "USD", planlama: { tip: "Üretim", referansNo: "3001" } },
    { id: "k38", urunAd: "Bot", renk: "Siyah", beden: "38", miktar: 8, karsilanan: 0, birimFiyat: 25, paraBirimi: "USD", planlama: { tip: "Üretim", referansNo: "3001" } },
  ] }];
  const satirlar = siparisRaporSatirlari(sip, cariler, "Satış", [u]);
  const tanim = { sutunlar: ["siparisNo", "urun", "renk", "beden", "asama", "asamaMiktar", "tutar"], suzgecler: [], gruplar: [], siralama: { alan: "asama", yon: "artan" }, matris: true };
  const s = raporHesapla(satirlar, alanlar, tanim);
  bekle("matris açık, bedenler sütun", s.matris && s.matris.bedenler, ["36", "37", "38"]);
  bekle("aşaması farklı beden AYRI satır, aynı olanlar TEK satır",
    s.satirlar.map((r) => [r.asama, r._hucreler["36"] || 0, r._hucreler["37"] || 0, r._hucreler["38"] || 0, r.asamaMiktar]),
    [["Kesim bekliyor", 10, 0, 0, 10], ["Üretildi (stokta)", 0, 12, 8, 20]]);
  bekle("anahtar sütunlar beden dışındaki metinler", s.sutunlar, ["siparisNo", "urun", "renk", "asama", "tutar"]);
  bekle("diğer sayısal sütun kalem başına bir kez", s.satirlar.map((r) => r.tutar), [250, 500]);
  bekle("beden toplamları ve genel toplam", [s.matris.bedenToplam, s.toplam.asamaMiktar, s.toplam.tutar], [{ 36: 10, 37: 12, 38: 8 }, 30, 750]);
  // Gruplama seçiliyse anahtar o: yalnız Aşama → iki satır, sipariş no görünmez.
  const s2 = raporHesapla(satirlar, alanlar, { ...tanim, gruplar: ["asama"] });
  // Diğer metin sütunları gruplamadaki gibi tek değer / "(N farklı)" olarak kalıyor.
  bekle("gruplama varsa anahtar gruplama alanları", [s2.sutunlar, s2.satirlar.length, s2.satirlar[0].urun], [["asama", "siparisNo", "urun", "renk", "tutar"], 2, "Bot"]);
  // Bir kalem iki aşama grubuna dağılınca kalem bazlı toplam yine BİR kez (teslim 4 + Saya'da 6 → 10).
  const sip2 = [{ id: "s10", siparisNo: "SAT-10", tip: "Satış", cariId: "c2", durum: "Hazırlanıyor", tarih: "2026-09-01", kalemler: [
    { id: "k41", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 10, karsilanan: 4, birimFiyat: 25, paraBirimi: "USD", planlama: null },
  ] }];
  const s3 = raporHesapla(siparisRaporSatirlari(sip2, cariler, "Satış"), alanlar, { sutunlar: ["asama", "beden", "asamaMiktar", "miktar", "tutar"], suzgecler: [], gruplar: ["asama"], siralama: null, matris: true });
  bekle("aşama gruplarına dağılan kalemin genel toplamı bir kez", [s3.satirlar.length, s3.toplam.miktar, s3.toplam.tutar, s3.toplam.asamaMiktar], [2, 10, 250, 10]);
  const s4 = raporHesapla(siparisRaporSatirlari(sip2, cariler, "Satış"), alanlar, { sutunlar: ["asama", "asamaMiktar", "miktar"], suzgecler: [], gruplar: ["asama"], siralama: null, matris: false });
  bekle("liste gruplamasında da genel toplam bir kez", s4.toplam.miktar, 10);
  // HÜCREDE AŞAMA (seçenek 1): Aşama sütunu SEÇİLİ DEĞİLSE bedenler tek satırda, hücre aşamaya bölünür.
  const s5 = raporHesapla(satirlar, alanlar, { ...tanim, sutunlar: ["siparisNo", "urun", "renk", "beden", "asamaMiktar"], siralama: null });
  bekle("aşama seçili değilse TEK satır", s5.satirlar.length, 1);
  bekle("hücrede aşama dökümü (prosesiyle)", s5.satirlar[0]._hucreler, {
    36: [{ etiket: "Kesim bekliyor", miktar: 10, proses: "Kesim" }], 37: [{ etiket: "Üretildi (stokta)", miktar: 12, proses: "" }], 38: [{ etiket: "Üretildi (stokta)", miktar: 8, proses: "" }],
  });
  bekle("hücre toplamları ve satır toplamı", [s5.satirlar[0]._hucreToplam, s5.satirlar[0].asamaMiktar], [{ 36: 10, 37: 12, 38: 8 }, 30]);
  // Aynı bedende iki aşama: hücre iki satır.
  const u3 = { ...u, prosesIlerleme: [
    { proses: "Kesim", atamalar: [{ id: "a1", bedenMiktarlari: { 36: 6, 37: 12, 38: 8 }, tamamlandiMi: true }] },
    { proses: "Montaj", atamalar: [{ id: "a2", bedenMiktarlari: { 36: 6, 37: 12, 38: 8 }, tamamlandiMi: true }] },
  ] };
  const s6 = raporHesapla(siparisRaporSatirlari(sip, cariler, "Satış", [u3]), alanlar, { ...tanim, sutunlar: ["urun", "beden", "asamaMiktar"], siralama: null });
  bekle("aynı bedende iki aşama → hücrede iki satır", s6.satirlar[0]._hucreler["36"], [{ etiket: "Kesim bekliyor", miktar: 4, proses: "Kesim" }, { etiket: "Üretildi (stokta)", miktar: 6, proses: "" }]);
  // Matris kapalıyken eski davranış.
  bekle("matris kapalı → satır düzeni", raporHesapla(satirlar, alanlar, { ...tanim, matris: false }).satirlar.length, 3);
}

console.log(hata ? "\n\u2500\u2500 RAPOR TEST\u0130 BA\u015eARISIZ \u2500\u2500" : "\n\u2500\u2500 rapor testi temiz \u2500\u2500");
process.exit(hata);
