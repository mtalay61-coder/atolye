// TEST TOHUMU — küçük ama gerçekçi bir veri kümesi.
// Ürünler beden taşıyor (asorti/matris kuralları devreye girsin), bir tedarikçi, bir müşteri, bir
// personel; teslim alınmayı bekleyen bir alış siparişi ve TESLİM ALINMIŞ bir üretim var.
const TOHUM = {
  "tanimlar:data": JSON.stringify({
    renkler: [{ id: "r1", ad: "Siyah" }, { id: "r2", ad: "Taba" }],
    bedenler: [{ id: "b1", ad: "40" }, { id: "b2", ad: "41" }, { id: "b3", ad: "42" }],
    birimler: [{ id: "birim-adet", ad: "adet" }, { id: "birim-çift", ad: "çift" }, { id: "birim-metre", ad: "metre" }],
    prosesler: [{ id: "p1", ad: "Kesim", sira: 1 }],
    asortiler: [], ozelKodEtiketleri: ["Özel Kod 1"], renkKombinasyonlari: [],
    hammaddeTipleri: [], araProsesler: [], mamulTipleri: [], fiyatGruplari: [], fireSebepleri: [],
    kullanicilar: [{ id: "k1", ad: "Test", sifre: "", yetkiler: {} }],
    firmaBilgileri: { logo: "", unvan: "Test Atölye", telefon: "", adres: "", email: "", website: "", vergiNo: "" },
    girisAktifMi: false,
  }),
  "stok:items": JSON.stringify([
    {
      id: "u1", ad: "Deri", kategori: "Hammadde", birim: "metre", olcuTipi: "Serbest",
      // 10'du, üretimin hammadde çıkışı 3 düştü.
      variants: [{ renk: "Siyah", beden: "", miktar: 7 }, { renk: "Taba", beden: "", miktar: 4 }],
      hareketler: [
        { id: "h-uretim-cikis", tarih: "2026-08-30T09:00:00.000Z", renk: "Siyah", beden: "", miktar: -3,
          kaynak: "Üretim", cariId: null, siparisNo: "1001", uretimId: "up1", fisNo: "1001-Kesim" },
      ],
      recete: [], birimFiyat: 100,
    },
    {
      id: "u2", ad: "Bot", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
      variants: [
        { renk: "Siyah", beden: "40", miktar: 5 },
        // 6'ydı, üretimin mamul girişi 3 ekledi.
        { renk: "Siyah", beden: "41", miktar: 9 },
        { renk: "Siyah", beden: "42", miktar: 7 },
      ],
      hareketler: [
        { id: "h-uretim-giris", tarih: "2026-08-30T09:00:00.000Z", renk: "Siyah", beden: "41", miktar: 3,
          kaynak: "Üretim", cariId: null, siparisNo: "1001", uretimId: "up1", fisNo: "1001-Kesim-Giriş" },
      ],
      // Reçete: iş emrindeki PROSES BAZLI hammadde tablosu buradan doğuyor.
      recete: [
        { proses: "Kesim", hammaddeUrunId: "u1", hammaddeAd: "Deri", renk: "Siyah", beden: "",
          mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 2, birim: "metre" },
        // Yalnızca 42 bedene giren bir malzeme: matriste tek sütunda görünmeli.
        { proses: "Kesim", hammaddeUrunId: "u1", hammaddeAd: "Deri", renk: "Taba", beden: "",
          mamulRenk: "Siyah", mamulBeden: "42", miktar: 1, birim: "metre" },
        // BEDEN-BEDEN EŞLEŞMESİ: mamul 41 → taban 41, mamul 42 → taban 42.
        // İş emrinde bu İKİ SATIR DEĞİL, tek satır olmalı; hammaddenin bedeni hücrede yazmalı.
        { proses: "Kesim", hammaddeUrunId: "u3", hammaddeAd: "Taban", renk: "Siyah", beden: "41",
          mamulRenk: "Siyah", mamulBeden: "41", miktar: 1, birim: "adet" },
        { proses: "Kesim", hammaddeUrunId: "u3", hammaddeAd: "Taban", renk: "Siyah", beden: "42",
          mamulRenk: "Siyah", mamulBeden: "42", miktar: 1, birim: "adet" },
      ],
      birimFiyat: 900,
    },
  ]),
  "cari:data": JSON.stringify([
    { id: "c1", unvan: "Tedarikçi A", tip: "Tedarikçi", hareketler: [], paraBirimi: "TRY" },
    { id: "c2", unvan: "Müşteri B", tip: "Müşteri", hareketler: [], paraBirimi: "TRY" },
    { id: "c3", unvan: "Personel C", tip: "Personel", paraBirimi: "TRY", hareketler: [
      { id: "h-iscilik", tarih: "2026-08-30", zaman: "2026-08-30T09:00:00.000Z", yon: "Alacak",
        tutar: 30, paraBirimi: "TRY", odemeSekli: "Nakit", vade: "", fisNo: "1001-Kesim-İşçilik",
        uretimId: "up1", siparisNo: "1001", defter: "Genel", aciklama: "Kesim işçiliği · 3 çift" },
    ] },
  ]),
  "siparis:data": JSON.stringify([
    {
      id: "s1", siparisNo: "AS-1", tip: "Alış", cariId: "c1", durum: "Onaylandı",
      tarih: "2026-08-20", teslimTarihi: "2026-09-01", teslimSayaci: 0,
      kalemler: [
        { id: "sk1", urunId: "u1", urunAd: "Deri", renk: "Siyah", beden: "", miktar: 6, karsilanan: 0, birim: "metre", birimFiyat: 120, paraBirimi: "TRY" },
        { id: "sk2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 3, karsilanan: 0, birim: "çift", birimFiyat: 25, paraBirimi: "USD" },
      ],
    },
  ]),
  // TESLİM ALINMIŞ bir üretim: geri alma yolunu test etmek için. Alanlar, teslim almanın gerçekte
  // ürettiği hâli taklit ediyor — atama tamamlanmış, mamul stoğa eklenmiş, hammadde çıkışı ve
  // işçilik fişleri yazılmış (bkz. stok/cari tohumundaki `1001-Kesim*` fişleri).
  "uretim:siparisler": JSON.stringify([{
    id: "up1", siparisNo: "1001", takipKodu: "1001", model: "Bot", urunId: "u2", renk: "Siyah",
    adet: 3, bedenMiktarlari: [{ beden: "41", miktar: 3 }], beden: "Siyah · 41:3",
    stogaEklendiMi: true, asama: "Kesim", durum: "Devam", olusturuldu: "2026-08-25T08:00:00.000Z",
    prosesIlerleme: [{
      proses: "Kesim", sira: 1, verildiMi: true, tamamlandiMi: true,
      tamamlanmaTarihi: "2026-08-30", personelId: "c3",
      atamalar: [{
        id: "at1", personelId: "c3", miktar: 3, bedenMiktarlari: { "41": 3 },
        tamamlandiMi: true, verilmeTarihi: "2026-08-29", tamamlanmaTarihi: "2026-08-30",
      }],
    }],
  }]),
  "stokrez:data": JSON.stringify([]),
  "onaylar:data": JSON.stringify([]),
  "cop:data": JSON.stringify([]),
  "muhasebe:data": JSON.stringify({ hesaplar: [], kasalar: [], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48, EUR: 56 } }),
};

module.exports = { TOHUM };
