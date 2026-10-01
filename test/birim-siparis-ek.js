// BİRİM TESTİ — SİPARİŞTE ŞEMA DIŞI ALANLAR BULUTA GİDİP GERİ GELİYOR (v1.545.0)
//
// Sipariş kaleminin KDV oranı ve notları, siparişin iptal zamanı/eden buluta hiç gitmiyordu (şema
// sütunları açıkça sayıyor, sayılmayan düşüyordu). Artık `ek` jsonb'ye yazılıp okumada köke açılıyor.
// Ölçülen: yaz (TABLO_SEMA) → bulut satırı → oku (kayitaCevir + ekiKokeAc) = aynı alanlar.
const { TABLO_SEMA, ekiKokeAc, kayitaCevir, defterdenEksikAlanlariTamamla } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const sema = TABLO_SEMA.siparisler;
const s = { id: "s1", siparisNo: "SAT-1", tip: "Satış", cariId: "c", tarih: "2026-10-01", durum: "İptal",
  iptalZamani: "2026-10-01T10:00:00Z", iptalEden: "Ali", rezervasyonSiparisIdleri: ["x"],
  kalemler: [{ id: "k1", urunId: "u", miktar: 2, birimFiyat: 5, paraBirimi: "TRY", kdvOrani: 10, notlar: ["Kesim: dikkat"] },
    { id: "k2", urunId: "u", miktar: 1, birimFiyat: 5, paraBirimi: "TRY" }] };

const satir = sema.satir(s);
const kalemSatirlari = sema.cocuklar[0].cikar(s);
bekle("sipariş: şema dışı alanlar ek'te", satir.ek, { iptalZamani: "2026-10-01T10:00:00Z", iptalEden: "Ali", rezervasyonSiparisIdleri: ["x"] });
bekle("kalem: KDV ve notlar ek'te", kalemSatirlari[0].ek, { kdvOrani: 10, notlar: ["Kesim: dikkat"] });
bekle("şema dışı alanı olmayan kalemde ek hiç yok (SQL'siz kayıt etkilenmesin)", "ek" in kalemSatirlari[1], false);

const geriS = ekiKokeAc(kayitaCevir(satir));
const geriK = ekiKokeAc(kayitaCevir(kalemSatirlari[0]));
bekle("okuma: sipariş alanları kökte", [geriS.iptalZamani, geriS.iptalEden, geriS.siparisNo, "ek" in geriS], ["2026-10-01T10:00:00Z", "Ali", "SAT-1", false]);
bekle("okuma: kalemin KDV oranı ve notları kökte", [geriK.kdvOrani, geriK.notlar, geriK.birimFiyat], [10, ["Kesim: dikkat"], 5]);
bekle("sütun değeri ek'tekini ezer", ekiKokeAc({ durum: "Bekliyor", ek: { durum: "eski", x: 1 } }), { durum: "Bekliyor", x: 1 });
bekle("ek yoksa / null ise kayıt aynen", [ekiKokeAc({ a: 1 }), ekiKokeAc({ a: 1, ek: null })], [{ a: 1 }, { a: 1 }]);

// ---- v1.546.0: aynı yöntem ürün, stok hareketi, cari, cari hareketi, üretim ve atamada ----------------
const gidisDonus = (satir) => ekiKokeAc(kayitaCevir(satir));
{
  const u = { id: "u1", ad: "Bot", kategori: "Mamul", renkBasligi: "Deri rengi", variants: [], hareketler: [
    { id: "sh1", renk: "Siyah", beden: "40", miktar: -2, kaynak: "Satış", fisNo: "SF-1", urunAd: "Bot", birimFiyat: 100 }] };
  const us = TABLO_SEMA.urunler;
  bekle("ürün: renk başlığı gidiş-dönüş", gidisDonus(us.satir(u)).renkBasligi, "Deri rengi");
  const sh = us.cocuklar.find((c) => c.tablo === "stok_hareketleri").cikar(u)[0];
  bekle("stok hareketi: şema dışı alanlar gidiş-dönüş", [gidisDonus(sh).urunAd, gidisDonus(sh).birimFiyat], ["Bot", 100]);

  const c = { id: "c1", unvan: "Müşteri", tip: "Müşteri", varsayilanDefter: "Resmi", whatsapp: "905", hareketler: [
    { id: "ch1", tarih: "2026-10-01", yon: "Alacak", tutar: 50, islemTipi: "Tahsilat", cekId: "cek1", miktar: 2 }] };
  const cs = TABLO_SEMA.cariler;
  bekle("cari: şema dışı alan + elle sayılan ek birlikte", [cs.satir(c).ek.varsayilanDefter, cs.satir(c).ek.whatsapp], ["Resmi", "905"]);
  const chEk = cs.cocuklar[0].cikar(c)[0].ek;
  bekle("cari hareketi: İŞLEM TİPİ ve çek kimliği ek'te (önce hiç gitmiyordu)", [chEk.islemTipi, chEk.cekId, chEk.miktar], ["Tahsilat", "cek1", 2]);

  const o = { id: "o1", siparisNo: "1001", model: "Bot", prosesNotlari: { Kesim: "dikkat" }, satisSiparisId: "s1",
    prosesIlerleme: [{ proses: "Kesim", atamalar: [{ id: "a1", personelId: "p1", miktar: 4, verilenHammaddeler: [{ id: "x" }] }] }] };
  const os = TABLO_SEMA.uretim;
  const oGeri = gidisDonus(os.satir(o));
  bekle("üretim: şema dışı alanlar gidiş-dönüş", [oGeri.prosesNotlari, oGeri.satisSiparisId], [{ Kesim: "dikkat" }, "s1"]);
  const aGeri = gidisDonus(os.cocuklar[0].cikar(o)[0]);
  bekle("atama: şema dışı alan gidiş-dönüş", aGeri.verilenHammaddeler, [{ id: "x" }]);
  bekle("üretimin proses dizisi ek'e kopyalanmıyor (zaten sütunda)", "prosesIlerleme" in (os.satir(o).ek || {}), false);
}

// ---- Fiş defterindeki tam kopyadan eksik alan onarımı ----------------------------------------------------
{
  const cariler = [{ id: "c", hareketler: [
    { id: "h1", yon: "Borç", tutar: 100, fisNo: "SF-1" },                       // buluttan gelmiş, alanları düşmüş
    { id: "h2", yon: "Alacak", tutar: 50, islemTipi: "Ödeme", fisNo: "ODM-1" },  // tam
  ] }];
  const stok = [{ id: "u", hareketler: [{ id: "h1", miktar: -2, fisNo: "SF-1" }] }];
  const defter = [
    { fisNo: "SF-1", cariHareketleri: [{ id: "h1", yon: "Borç", tutar: 999, islemTipi: "Satış", matrah: 100, esId: "eski", siparisId: "s9" }],
      stokHareketleri: [{ id: "h1", miktar: -2, birimFiyat: 50, urunId: "u", urunAd: "Bot" }] },
    { fisNo: "ODM-1", iptal: true, cariHareketleri: [{ id: "h2", islemTipi: "Tahsilat", aciklama: "iptal kopya" }] },
  ];
  const r = defterdenEksikAlanlariTamamla(cariler, stok, defter);
  const h1 = r.cariler[0].hareketler[0];
  bekle("eksik alan defterden doldu (işlem tipi, matrah)", [h1.islemTipi, h1.matrah], ["Satış", 100]);
  bekle("var olan değere dokunulmadı (tutar 100 kaldı)", h1.tutar, 100);
  bekle("bağ alanları doldurulmadı (esId, siparisId)", ["esId" in h1, "siparisId" in h1], [false, false]);
  bekle("iptal edilmiş fişin kopyası kullanılmadı; dokunulmayan kayıt aynı nesne", r.cariler[0].hareketler[1] === cariler[0].hareketler[1], true);
  bekle("stok hareketi: birim fiyat ve ürün adı doldu, urunId eklenmedi", [r.stok[0].hareketler[0].birimFiyat, r.stok[0].hareketler[0].urunAd, "urunId" in r.stok[0].hareketler[0]], [50, "Bot", false]);
  bekle("sayılar", [r.cariSayi, r.stokSayi], [1, 1]);
  const r2 = defterdenEksikAlanlariTamamla(r.cariler, r.stok, defter);
  bekle("ikinci çalıştırma hiçbir şey değiştirmiyor (kendini sınırlıyor)", [r2.cariler === r.cariler, r2.stok === r.stok, r2.cariSayi + r2.stokSayi], [true, true, 0]);
}

console.log(hata ? "\n── sipariş ek testinde HATA ──" : "\n── sipariş ek testi temiz ──");
process.exit(hata);
