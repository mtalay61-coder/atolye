// BİRİM TESTİ — `fisGeriAl`, `fisYaz`ın TERSİ olmalı.
// Tarayıcı gerekmiyor: ikisi de saf fonksiyon. Fiş yazılır, sonra geri alınır; sonuç başlangıç
// durumuyla BİREBİR aynı olmalı (miktarlar, hareket listeleri, siparişin karşılananı ve durumu).
const { fisYaz, fisGeriAl } = require("./erp.cjs");

const kopya = (x) => JSON.parse(JSON.stringify(x));
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b).slice(0, 300), "\n    çıkan   :", JSON.stringify(a).slice(0, 300)); }
};

const stok0 = [
  { id: "u1", ad: "Deri", variants: [{ renk: "Siyah", beden: "", miktar: 10 }], hareketler: [] },
  { id: "u2", ad: "Bot", variants: [{ renk: "Siyah", beden: "41", miktar: 6 }], hareketler: [] },
];
const cariler0 = [{ id: "c1", unvan: "Tedarikçi A", hareketler: [] }];
const siparisler0 = [{
  id: "s1", siparisNo: "AS-1", tip: "Alış", cariId: "c1", durum: "Onaylandı",
  kalemler: [
    { id: "sk1", urunId: "u1", urunAd: "Deri", renk: "Siyah", beden: "", miktar: 6, karsilanan: 0, birim: "metre", birimFiyat: 120, paraBirimi: "TRY" },
    { id: "sk2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 3, karsilanan: 0, birim: "çift", birimFiyat: 25, paraBirimi: "USD" },
  ],
}];

function fisKur(ek = {}) {
  return {
    fisNo: "AS-1-F1", tip: "Alış", cariId: "c1", kaynak: "Satınalma",
    stokTarihi: "2026-08-31T09:00:00.000Z", cariTarihi: "2026-08-31", zaman: "2026-08-31T09:00:00.000Z",
    kayitParaBirimi: null, kurlar: { USD: 48 }, kurZorunlu: false,
    tutarYuvarla: false, birimFiyatBolerek: true,
    yon: "Borç", defter: "Genel", odemeSekli: "Nakit", vade: "",
    siparis: { id: "s1", siparisNo: "AS-1", rezervasyonSiparisId: null },
    kalemler: [
      { urunId: "u1", urunAd: "Deri", renk: "Siyah", beden: "", birim: "metre", miktar: 4, birimFiyat: 120, paraBirimi: "TRY", kalemId: "sk1" },
      { urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", birim: "çift", miktar: 3, birimFiyat: 25, paraBirimi: "USD", kalemId: "sk2" },
    ],
    cariAciklama: () => "test",
    ...ek,
  };
}

// ---- 1) Yaz, sonra tamamını geri al: başlangıca dönmeli ----
{
  const yazildi = fisYaz(kopya(stok0), kopya(cariler0), fisKur());
  // Sipariş karşılananı çağıran tarafta artıyor (fisYaz'ın işi değil); testte elle uyguluyoruz.
  const siparisTeslimli = kopya(siparisler0).map((s) => ({
    ...s, durum: "Kısmi Teslim",
    kalemler: s.kalemler.map((k) => ({ ...k, karsilanan: k.id === "sk1" ? 4 : 3 })),
  }));
  const idler = [...yazildi.kimlikler.values()];
  const geri = fisGeriAl({ stok: yazildi.stok, cariler: yazildi.cariler, siparisler: siparisTeslimli, uretim: [] }, { hareketIdler: idler });

  bekle("stok başlangıca döndü", geri.stok, stok0);
  bekle("cariler başlangıca döndü", geri.cariler, cariler0);
  bekle("siparişin karşılananı ve durumu geri döndü", geri.siparisler, kopya(siparisler0).map((s) => ({ ...s, durum: "Bekliyor" })));
  bekle("silinen kayıt sayısı", [geri.silinenStok, geri.silinenCari], [2, 2]);
}

// ---- 2) Muhasebe defteri: TEK KAYIT ----
//
// Kullanıcı (6 Eylül): "Tek kayda düşsün, çok önemli."
// Eskiden "Muhasebe" seçilince cari hareketi Genel+Resmi diye İKİYE bölünüyor, `esId` ile
// bağlanıyordu. Bedeli her yere yayılmıştı: silerken ikizi bul, toplarken ikizi sayma, denetimde
// çiftin kopmadığını kontrol et. Artık tek kayıt; hangi deftere gireceğine `defterKapsar` karar
// veriyor (kasa/banka tarafı zaten böyleydi).
{
  const yazildi = fisYaz(kopya(stok0), kopya(cariler0), fisKur({ defter: "Muhasebe" }));
  bekle("Muhasebe defterinde KALEM BAŞINA TEK cari hareketi", yazildi.cariHareketleri.length, 2);
  bekle("defteri Muhasebe", yazildi.cariHareketleri.map((h) => h.defter), ["Muhasebe", "Muhasebe"]);
  bekle("ikiz bağı yok", yazildi.cariHareketleri.some((h) => h.esId), false);
  // KİMLİK STOKLA ORTAK: fiş geri alınırken ikisi aynı kimlikten bulunuyor. İkiz tasarımda
  // Resmi yarımın ayrı kimliği vardı ve bu bağ yalnızca Genel yarımda kuruluyordu.
  bekle("kimlikler stok hareketiyle aynı",
    yazildi.cariHareketleri.map((h) => h.id), [...yazildi.kimlikler.values()]);

  const geri = fisGeriAl({ stok: yazildi.stok, cariler: yazildi.cariler, siparisler: kopya(siparisler0), uretim: [] },
    { hareketIdler: [...yazildi.kimlikler.values()] });
  bekle("geri alınca cariler başlangıca döndü", geri.cariler, cariler0);
}

// ---- 2b) ESKİ VERİ: ikiz kayıtlar hâlâ birlikte silinmeli ----
//
// Göç açılışta çalışıyor ama başka bir cihazdan gelen ya da yedekten dönen veride ikiz kalabilir.
// `fisGeriAl`daki `esId` genişletmesi bu yüzden DURUYOR: yalnızca birini silmek diğerini yetim
// bırakır ve o defterin bakiyesini kalıcı olarak bozar.
{
  const eskiCariler = [{
    id: "c1", unvan: "Tedarikçi A",
    hareketler: [
      { id: "g1", tarih: "2026-08-31", yon: "Borç", tutar: 100, paraBirimi: "TRY", fisNo: "X-1", defter: "Genel", esId: "r1" },
      { id: "r1", tarih: "2026-08-31", yon: "Borç", tutar: 100, paraBirimi: "TRY", fisNo: "X-1", defter: "Resmi", esId: "g1" },
    ],
  }];
  const geri = fisGeriAl({ stok: kopya(stok0), cariler: eskiCariler, siparisler: kopya(siparisler0), uretim: [] },
    { hareketIdler: ["g1"] });
  bekle("eski ikizde yalnız biri verilse de ikisi de silindi", geri.cariler[0].hareketler.length, 0);
}

// ---- 2c) PEŞİN TAHSİLAT: kasa hareketi ve cari kapanışı ----
//
// Kullanıcı: "Fiş şu an yalnız borç yazıyor, kasadan para çıkarmıyor."
// Karar: para YALNIZCA fişte hesap seçilirse hareket eder; kısmi olabilir.
{
  // Hesap seçilmezse eski davranış: yalnız cari borcu, para hareketi YOK.
  const pesinsiz = fisYaz(kopya(stok0), kopya(cariler0), fisKur());
  bekle("hesap se\u00e7ilmezse kasa hareketi yok", pesinsiz.pesinHareket, null);

  // Fişin tamamı 480 + 900 = 1380; 500'ü peşin (KISMİ).
  const yazildi = fisYaz(kopya(stok0), kopya(cariler0), fisKur({
    pesin: { hesapTur: "kasa", hesapId: "k1", hesapAd: "TL Kasa", tutar: 500, paraBirimi: "TRY" },
  }));
  bekle("kasa hareketi \u00fcretildi", !!yazildi.pesinHareket, true);
  bekle("hesap do\u011fru", [yazildi.pesinHareket.hesapTur, yazildi.pesinHareket.hesapId], ["kasa", "k1"]);
  // ALIŞ fişinde para kasadan ÇIKAR: borçlanıyoruz, peşin ödüyoruz.
  bekle("al\u0131\u015fta kasadan \u00e7\u0131k\u0131\u015f", yazildi.pesinHareket.hareket.yon, "\u00c7\u0131k\u0131\u015f");
  bekle("tutar pe\u015fin kadar", yazildi.pesinHareket.hareket.tutar, 500);

  // Cari tarafına da KAPATAN kayıt yazılmalı; ikisi aynı `muhasebeBagId` ile bağlı.
  const kapatan = yazildi.cariHareketleri.filter((h) => h.muhasebeBagId);
  bekle("cariye kapatan kay\u0131t yaz\u0131ld\u0131", kapatan.length, 1);
  bekle("ba\u011f ayn\u0131", kapatan[0].muhasebeBagId, yazildi.pesinHareket.bagId);
  bekle("kapatan kayd\u0131n fi\u015f numaras\u0131 var", !!kapatan[0].fisNo, true);
  bekle("kapatan kay\u0131t Tahsilat y\u00f6n\u00fcnde", kapatan[0].yon, "Tahsilat");

  // FİŞ GERİ ALININCA kasa hareketi de gitmeli — `fisGeriAl` bağı topluyor.
  const geri = fisGeriAl({ stok: yazildi.stok, cariler: yazildi.cariler, siparisler: kopya(siparisler0), uretim: [] },
    { hareketIdler: [...yazildi.kimlikler.values()] });
  bekle("geri al\u0131nca kasa ba\u011f\u0131 bildirildi", geri.muhasebeBagIdler, [yazildi.pesinHareket.bagId]);
  bekle("geri al\u0131nca cariler ba\u015flang\u0131ca d\u00f6nd\u00fc", geri.cariler, cariler0);
}

// ---- 3) Tek hareketi geri alma: yalnızca o kalem etkilenmeli ----
{
  const yazildi = fisYaz(kopya(stok0), kopya(cariler0), fisKur());
  const ilkKalem = fisKur().kalemler[0];
  const ilkId = [...yazildi.kimlikler.values()][0];
  const geri = fisGeriAl({ stok: yazildi.stok, cariler: yazildi.cariler, siparisler: kopya(siparisler0), uretim: [] }, { hareketIdler: [ilkId] });
  bekle("Deri miktarı geri düştü", geri.stok[0].variants[0].miktar, 10);
  bekle("Bot miktarı değişmedi", geri.stok[1].variants[0].miktar, 9);
  bekle("diğer kalemin hareketleri duruyor", [geri.silinenStok, geri.silinenCari], [1, 1]);
  void ilkKalem;
}

// ---- 4) Üretim fişi: ailenin tamamı silinmeli ve üretim ilerlemesi geri dönmeli ----
// Kullanıcının bildirdiği hata: işçilik fişi silinince cari düzeliyor ama üretimde proses hâlâ
// "teslim alındı" kalıyordu; üretim çıkış fişi silinince stok geri geliyor ama üretim duruyordu.
{
  const uretim0 = [{
    id: "up1", siparisNo: "1001", urunId: "u2", stogaEklendiMi: true, asama: "Kesim",
    prosesIlerleme: [{
      proses: "Kesim", verildiMi: true, tamamlandiMi: true, tamamlanmaTarihi: "2026-08-31",
      atamalar: [{ id: "at1", personelId: "c1", miktar: 3, tamamlandiMi: true, tamamlanmaTarihi: "2026-08-31" }],
    }],
  }];
  const stokU = [{
    id: "u1", ad: "Deri", variants: [{ renk: "Siyah", beden: "", miktar: 7 }],
    hareketler: [{ id: "h-cikis", renk: "Siyah", beden: "", miktar: -3, kaynak: "Üretim", uretimId: "up1", fisNo: "1001-Kesim" }],
  }, {
    id: "u2", ad: "Bot", variants: [{ renk: "Siyah", beden: "41", miktar: 9 }],
    hareketler: [{ id: "h-giris", renk: "Siyah", beden: "41", miktar: 3, kaynak: "Üretim", uretimId: "up1", fisNo: "1001-Kesim-Giriş" }],
  }];
  const carilerU = [{ id: "c1", unvan: "Personel", hareketler: [
    { id: "h-iscilik", yon: "Alacak", tutar: 30, fisNo: "1001-Kesim-İşçilik", uretimId: "up1" },
  ] }];

  // KİLİT: üretim fişi Fişler/cari ekranından silinemez — izin bayrağı olmadan hiçbir şey değişmez.
  const engellendi = fisGeriAl({ stok: stokU, cariler: carilerU, siparisler: [], uretim: uretim0 },
    { hareketIdler: ["h-iscilik"] });
  bekle("üretim fişi izinsiz silinemez", engellendi.engel && engellendi.engel.sebep, "uretim-fisi");
  bekle("engellenince hiçbir şey değişmedi", [engellendi.stok[0].variants[0].miktar, engellendi.cariler[0].hareketler.length], [7, 1]);

  // YALNIZCA işçilik fişi siliniyor — ailenin diğer iki fişi de gitmeli.
  const geri = fisGeriAl({ stok: stokU, cariler: carilerU, siparisler: [], uretim: uretim0 },
    { hareketIdler: ["h-iscilik"], uretimeIzinVer: true });
  bekle("işçilik fişi silinince hammadde çıkışı da silindi", geri.stok[0].hareketler.length, 0);
  bekle("hammadde stoğa geri döndü", geri.stok[0].variants[0].miktar, 10);
  bekle("mamul girişi de silindi", geri.stok[1].hareketler.length, 0);
  bekle("mamul stoktan düştü", geri.stok[1].variants[0].miktar, 6);
  bekle("işçilik cari kaydı silindi", geri.cariler[0].hareketler.length, 0);
  bekle("atama teslim alınmamışa döndü", geri.uretim[0].prosesIlerleme[0].atamalar[0].tamamlandiMi, false);
  bekle("adım tamamlanmamışa döndü", geri.uretim[0].prosesIlerleme[0].tamamlandiMi, false);
  bekle("atama personelde duruyor (silinmedi)", geri.uretim[0].prosesIlerleme[0].atamalar.length, 1);
  bekle("mamul stoğa eklendi işareti kalktı", geri.uretim[0].stogaEklendiMi, false);
  bekle("aşama o prosese geri alındı", geri.uretim[0].asama, "Kesim");
}

// ---- HAREKETSİZ STOK OLMAZ ---------------------------------------------------------------------
//
// Kullanıcı (9 Eylül): "Yine başladı stok tutarsızlığı. Depodan alış fişine tıklayarak giriş
// yaptım ama sorun bu." İki alış fişi (+8, +8) duruyor, hareket neti 16, kayıtlı stok 0.
//
// SEBEP: varyant eşleşmesi `renk === v.renk && beden === v.beden` ile aranıyor, bulunamazsa
// hareket yazılıp varyant SESSİZCE atlanıyordu. Kalemin rengi boş/null geldiğinde (Depo'dan
// renksiz bir satırla gelinince) fiş kesiliyor ama stok hiç artmıyordu.
{
  const stok0 = [{
    id: "u1", ad: "Bağcık", kategori: "Hammadde", birim: "Çift",
    variants: [{ renk: "Siyah", beden: "", miktar: 0, minStok: 0 }],
    hareketler: [],
  }];
  // RENGİ BOŞ kalem: hiçbir varyanta denk gelmiyor.
  const sonuc = fisYaz(stok0, [{ id: "c1", unvan: "Tedarikçi", hareketler: [] }], {
    tip: "Alış",
    kalemler: [{ urunId: "u1", urunAd: "Bağcık", renk: "", beden: "", miktar: 8, birimFiyat: 230 }],
    fisNo: "AF-TEST-1", tarih: "2026-09-09", cariTarihi: "2026-09-09", yon: "Alacak", cariId: "c1",
  });
  const urun = (sonuc.stok || []).find((p) => p.id === "u1") || {};
  const hareketNeti = (urun.hareketler || []).reduce((t, h) => t + (h.miktar || 0), 0);
  const varyantToplami = (urun.variants || []).reduce((t, v) => t + (v.miktar || 0), 0);
  bekle("hareket yaz\u0131ld\u0131", hareketNeti, 8);
  // ASIL KURAL: hareket varsa karşılığı stokta GÖRÜNMEK ZORUNDA.
  bekle("stok hareketle tutuyor", varyantToplami, hareketNeti);
  bekle("kar\u015f\u0131l\u0131ks\u0131z hareket i\u00e7in varyant a\u00e7\u0131ld\u0131", (urun.variants || []).length, 2);
}

// ---- "STANDART" YER TUTUCUSU -------------------------------------------------------------------
//
// Kullanıcı (10 Eylül, ekran görüntüsüyle): "Stokta renk var ise Standart renk olmaz, burada
// çelişki var. Örnek: Çelikli taban renksiz, renk altında Standart yazıyor — mantık buna göre
// kurulu ise devam edebiliriz."
//
// Mantık gerçekten öyle kurulu: renksiz/ölçüsüz varyant `renk: "Standart", beden: "Standart"`
// olarak tutuluyor (152-stok.jsx, 077-barkod.jsx). Ama v1.213.0'da fiş yazarken açılan varyanta
// BOŞ dize yazılmıştı ve stok kartında ADSIZ bir renk satırı belirdi.
{
  const stok0 = [{
    id: "u1", ad: "Bağcık", kategori: "Hammadde", birim: "Çift",
    variants: [
      { renk: "Standart", beden: "Standart", miktar: 0, minStok: 0 },
      { renk: "Siyah", beden: "Standart", miktar: 0, minStok: 0 },
    ],
    hareketler: [],
  }];
  // Rengi BOŞ kalem, mevcut "Standart" varyantına denk gelmeli — yeni satır AÇILMAMALI.
  const sonuc = fisYaz(stok0, [{ id: "c1", unvan: "Tedarikçi", hareketler: [] }], {
    tip: "Alış",
    kalemler: [{ urunId: "u1", urunAd: "Bağcık", renk: "", beden: "", miktar: 8, birimFiyat: 230 }],
    fisNo: "AF-STD-1", tarih: "2026-09-10", cariTarihi: "2026-09-10", yon: "Alacak", cariId: "c1",
  });
  const urun = (sonuc.stok || []).find((p) => p.id === "u1") || {};
  bekle("yeni varyant A\u00c7ILMADI", (urun.variants || []).length, 2);
  bekle("miktar Standart varyant\u0131na yaz\u0131ld\u0131",
    (urun.variants || []).find((v) => v.renk === "Standart").miktar, 8);
  bekle("ger\u00e7ek renk bozulmad\u0131",
    (urun.variants || []).find((v) => v.renk === "Siyah").miktar, 0);
}

console.log(hata ? "── BİRİM TESTİ BAŞARISIZ ──" : "── birim testi temiz ──");
process.exit(hata);
