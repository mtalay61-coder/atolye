// BİRİM TESTİ — FİYAT LİSTESİ (v1.550.0)
//
// Kullanıcı: "Toptan TL seçince modellerin Toptan TL fiyatları çıkmalı, yoksa boş; aynı ekrandan düzeltip
// kaydedelim; Toptan TL %14 + ya da 10 TL indirimle farklı kaydedip başka fiyat grubu oluşturalım."
// Ölçülen: kaynaktan okuma (grup kuralı / genel fiyat, boş = null), dönüşüm (yüzde, tutar, yuvarlama),
// yazma (kural ekle/güncelle/sil + geçmiş), fişin okuduğu `fiyatBul` yazılanı görüyor mu, birim çevirme.
const { fiyatListesiTablosu, ozelKodSecenekleri, ozelKodSuzgeceUyar, fiyatListesiKaynaklari, urunKaynakFiyati, fiyatDonustur, fiyatListesiYaz, fiyatlariHedefBirime, fiyatBul } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const gruplar = [{ id: "g1", ad: "Toptan TL", tip: "Satış", paraBirimi: "₺" }, { id: "g2", ad: "Toptan USD", tip: "Satış", paraBirimi: "USD" }];
const K = fiyatListesiKaynaklari(gruplar);
const toptan = K.find((k) => k.key === "g1");
const usd = K.find((k) => k.key === "g2");
const genel = K[0];
bekle("kaynaklar: 2 genel + maliyet + gruplar, grup birimi koda çevrili", K.map((k) => `${k.ad}:${k.paraBirimi}`),
  ["Genel satış fiyatı:null", "Genel alış fiyatı:null", "Maliyet (reçete / alış):TRY", "Toptan TL:TRY", "Toptan USD:USD"]);

const urunler = [
  { id: "a", ad: "Bot", satisFiyati: 500, satisParaBirimi: "₺",
    fiyatKurallari: [{ id: "k1", kapsam: "fiyatGrubu", deger: "g1", tip: "Satış", fiyat: 400, paraBirimi: "TRY" },
      { id: "k2", kapsam: "fiyatGrubu", deger: "g1", tip: "Satış", fiyat: 999, renk: "Siyah", paraBirimi: "TRY" }] },
  { id: "b", ad: "Çizme", satisFiyati: 0, fiyatKurallari: [] },
];

// 1) Okuma
bekle("grup fiyatı (renk kırılımlı kural karışmaz)", urunKaynakFiyati(urunler[0], toptan), { fiyat: 400, paraBirimi: "TRY" });
bekle("grupta fiyat yok → boş (null)", urunKaynakFiyati(urunler[1], toptan).fiyat, null);
bekle("genel satış", urunKaynakFiyati(urunler[0], genel), { fiyat: 500, paraBirimi: "TRY" });
bekle("genel 0 → boş", urunKaynakFiyati(urunler[1], genel).fiyat, null);

// 2) Dönüşüm
bekle("%14 artış", fiyatDonustur(400, { tur: "yuzde", yon: 1, deger: 14 }), 456);
bekle("10 TL indirim", fiyatDonustur(400, { tur: "tutar", yon: -1, deger: 10 }), 390);
bekle("%14 + 5'e yuvarla (456 → 455)", fiyatDonustur(400, { tur: "yuzde", yon: 1, deger: 14, adim: 5 }), 455);
bekle("kuruş artığı yok (0,1 + 0,2)", fiyatDonustur(0.1, { tur: "tutar", yon: 1, deger: 0.2 }), 0.3);
bekle("eksiye düşen → boş", fiyatDonustur(5, { tur: "tutar", yon: -1, deger: 10 }), null);
bekle("boş fiyat dönüşmez", fiyatDonustur(null, { tur: "yuzde", yon: 1, deger: 14 }), null);
bekle("işlem yok → aynı fiyat", fiyatDonustur(123.45, { tur: "yuzde", yon: 1, deger: "" }), 123.45);

// 3) Yazma
const z = "2026-10-03T10:00:00.000Z";
const y1 = fiyatListesiYaz(urunler, toptan, { a: 420, b: 300 }, { zaman: z, kim: "Ali" });
bekle("iki ürün değişti", y1.degisen, 2);
bekle("var olan kural güncellendi (kimlik ve birim korunur)", y1.urunler[0].fiyatKurallari.filter((k) => !k.renk).map((k) => `${k.id}:${k.fiyat}:${k.paraBirimi}`), ["k1:420:TRY"]);
bekle("renkli kural yerinde", y1.urunler[0].fiyatKurallari.some((k) => k.id === "k2" && k.fiyat === 999), true);
bekle("yeni kural grubun biriminde", y1.urunler[1].fiyatKurallari.map((k) => `${k.kapsam}:${k.deger}:${k.fiyat}:${k.paraBirimi}`), ["fiyatGrubu:g1:300:TRY"]);
bekle("geçmişe düştü", y1.urunler[0].fiyatGecmisi[0].eskiFiyat + "→" + y1.urunler[0].fiyatGecmisi[0].yeniFiyat, "400→420");
bekle("fiş (fiyatBul) yazılanı görüyor", fiyatBul(y1.urunler[1], "Siyah", "40", "c1", "Satış", [{ id: "c1", fiyatGrubuId: "g1" }]).fiyat, 300);
bekle("aynı fiyat → değişiklik sayılmaz", fiyatListesiYaz(urunler, toptan, { a: 400 }).degisen, 0);
const y2 = fiyatListesiYaz(urunler, toptan, { a: null });
bekle("boşaltmak grup kuralını siler, renkli kural kalır", y2.urunler[0].fiyatKurallari.map((k) => k.id), ["k2"]);
const y3 = fiyatListesiYaz(urunler, genel, { b: 250 });
bekle("genel satış yazılır", y3.urunler[1].satisFiyati, 250);
bekle("listede olmayan ürüne dokunulmaz", y3.urunler[0] === urunler[0], true);

// 4) Farklı kaydet: Toptan TL %14 → yeni TL grubu; TL → USD grubuna kurla, kur yoksa atlanır.
const satirlar = [{ urunId: "a", fiyat: 456, paraBirimi: "TRY" }, { urunId: "b", fiyat: null, paraBirimi: "TRY" }];
bekle("aynı birim: olduğu gibi, boş satır yazılmaz", fiyatlariHedefBirime(satirlar, "TRY", {}).fiyatlar, { a: 456 });
bekle("USD'ye kurla", fiyatlariHedefBirime(satirlar, "USD", { USD: 40 }).fiyatlar, { a: 11.4 });
bekle("kur yoksa atlanır ve sayılır", fiyatlariHedefBirime(satirlar, "USD", {}).cevrilemeyen, 1);
const yeniGrup = fiyatListesiKaynaklari([{ id: "g3", ad: "Toptan TL +14", tip: "Satış", paraBirimi: "TRY" }]).find((k) => k.grupId === "g3");
const y4 = fiyatListesiYaz(urunler, yeniGrup, { a: 456 }, { paraBirimleri: { a: "TRY" } });
bekle("yeni gruba yazıldı, kaynak grup değişmedi", y4.urunler[0].fiyatKurallari.map((k) => `${k.deger}:${k.fiyat}`), ["g1:400", "g1:999", "g3:456"]);
bekle("USD grubunda fiyat yok → boş", urunKaynakFiyati(urunler[0], usd).fiyat, null);

// 5) Özel kod süzgeci (v1.553.0)
const alanlar = [{ id: "s", ad: "Sezon" }, { id: "t", ad: "Taban", kapsamTuru: "mamul", kapsamAd: "Bot" }];
const oku = [
  { id: "1", mamulTipi: "Bot", ozelKodlar: { s: "2026", t: "Kauçuk" } },
  { id: "2", mamulTipi: "Babet", ozelKodlar: { s: "2025", t: "Deri" } },   // Taban alanı Babet'e uymaz → görünmez
  { id: "3", mamulTipi: "Bot", ozelKodlar: { s: "2026" } },
];
bekle("seçenekler: yalnız dolu ve uyan değerler", ozelKodSecenekleri(oku, alanlar), [{ id: "s", ad: "Sezon", degerler: ["2025", "2026"] }, { id: "t", ad: "Taban", degerler: ["Kauçuk"] }]);
bekle("tek alan süzgeci", oku.filter((u) => ozelKodSuzgeceUyar(u, alanlar, { s: "2026" })).map((u) => u.id), ["1", "3"]);
bekle("iki alan (VE)", oku.filter((u) => ozelKodSuzgeceUyar(u, alanlar, { s: "2026", t: "Kauçuk" })).map((u) => u.id), ["1"]);
bekle("boş seçim süzmez", oku.filter((u) => ozelKodSuzgeceUyar(u, alanlar, { s: "" })).length, 3);

// 6) Excel / yazdırma tablosu (v1.554.0): özel kodlar ayrı sütun, boş fiyat boş hücre, önizleme sütunu.
const tSatir = [
  { urun: { id: "1", ad: "Bot", stokNo: 1001, kategori: "Mamul", mamulTipi: "Bot", ozelKodlar: { s: "2026", t: "Kauçuk" }, kapakResmi: "data:x" }, fiyat: 400, paraBirimi: "TRY", yeni: 456 },
  { urun: { id: "2", ad: "Babet", kategori: "Mamul", mamulTipi: "Babet", ozelKodlar: { s: "2025" } }, fiyat: null, paraBirimi: "TRY", yeni: null },
];
const tt = fiyatListesiTablosu(tSatir, { kaynak: toptan, ozelAlanlar: alanlar, islemAktif: true });
bekle("başlıklar", tt.basliklar, ["Stok no", "Model / ürün", "Kategori", "Sezon", "Taban", "Toptan TL", "P.B.", "Yeni fiyat"]);
bekle("satırlar", tt.satirlar, [["1001", "Bot", "Mamul", "2026", "Kauçuk", 400, "TRY", 456], ["", "Babet", "Mamul", "2025", "", "", "TRY", ""]]);
bekle("resimler", tt.resimler, ["data:x", ""]);
bekle("önizleme yokken yeni sütun yok", fiyatListesiTablosu(tSatir, { kaynak: toptan, ozelAlanlar: [], islemAktif: false }).basliklar, ["Stok no", "Model / ürün", "Kategori", "Toptan TL", "P.B."]);

console.log(hata ? "birim-fiyat-listesi: HATA" : "birim-fiyat-listesi: tamam");
process.exit(hata);
