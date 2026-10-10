// BİRİM TESTİ — GENEL DENETİM DÜZELTMELERİ (v1.639.0)
// Ölçülen saf parçalar: (1) güncel listeye yalnız değişenler birleşir; (2) tamire giden çift dağıtılmış sayılmaz;
// (3) açılış farkı "Standart"/"" ayrımı yapmaz; (4) ödeme özeti KDV dahil; (5) fiş adı atamadaki numaradan;
// (6) maliyet gruplama ekleme kimliğine bakar; (7) kur yokken TL bilinmiyor.
const { degisenKayitlariBirlestir, adimBedenDurumu, acilisFarklari, siparisOdemeOzeti, uretimFisAdlari, receteMaliyetGrupla, hammaddeBirimFiyati } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };

// 1. Birleştirme: eski [A,B,C] → bu işlem B'yi değiştirdi; bu arada güncel listede A değişti ve D eklendi.
const A = { id: "a", v: 1 }, B = { id: "b", v: 1 }, C = { id: "c", v: 1 };
const eski = [A, B, C], yeni = [A, { id: "b", v: 2 }, C];
const guncel = [{ id: "a", v: 9 }, B, C, { id: "d", v: 1 }];
bekle("yalnız değişen kayıt işlenir, öteki değişiklikler korunur", degisenKayitlariBirlestir(guncel, eski, yeni).map((k) => `${k.id}:${k.v}`), ["a:9", "b:2", "c:1", "d:1"]);
bekle("bu işlemin sildiği kayıt düşer, eklediği gelir", degisenKayitlariBirlestir(guncel, eski, [A, { id: "e", v: 1 }]).map((k) => k.id), ["a", "d", "e"]);

// 2. Tamir: 32 çift Saya; teslimde 30 sağlam, 2 tamir → Kesim (önceki). Kesim tamiri bitince akış 32; Saya'da kalan 2 olmalı.
const prosesler = [{ proses: "Kesim" }, { proses: "Saya" }, { proses: "Kalfa" }];
const sayaAdim = { proses: "Saya", atamalar: [{ id: "x", tamamlandiMi: true, bedenMiktarlari: { 40: 32 }, miktar: 32,
  sonuc: { saglam: { 40: 30 }, tamir: [{ beden: "40", miktar: 2, hedefProses: "Kesim" }], hurda: [] } }] };
bekle("önceki prosese giden tamir dağıtılmamış sayılır", adimBedenDurumu(sayaAdim, [{ beden: "40", miktar: 32 }], { 40: 32 }, prosesler)[0], { beden: "40", toplam: 32, dagitilan: 30, kalan: 2 });
const ileriAdim = { ...sayaAdim, atamalar: [{ ...sayaAdim.atamalar[0], sonuc: { saglam: { 40: 30 }, tamir: [{ beden: "40", miktar: 2, hedefProses: "Kalfa" }], hurda: [] } }] };
bekle("sonraki prosese giden tamir bu adımdan geçmiş sayılır", adimBedenDurumu(ileriAdim, [{ beden: "40", miktar: 32 }], { 40: 32 }, prosesler)[0].kalan, 0);
bekle("hurda dağıtılmış sayılır", adimBedenDurumu({ proses: "Saya", atamalar: [{ id: "y", tamamlandiMi: true, bedenMiktarlari: { 40: 32 }, sonuc: { saglam: { 40: 30 }, tamir: [], hurda: [{ beden: "40", miktar: 2 }] } }] }, [{ beden: "40", miktar: 32 }], { 40: 32 }, prosesler)[0].kalan, 0);

// 3. Açılış farkı: varyant "Standart", hareket "" → fark yok.
bekle("açılış farkı Standart/boş ayrımı yapmaz", acilisFarklari({ variants: [{ renk: "Standart", beden: "Standart", miktar: 10 }], hareketler: [{ renk: "", beden: "", miktar: 10 }] }), []);

// 4. Ödeme özeti: 1.000 ₺ + %20 KDV, 600 tahsil → kalan 600.
const sip = { id: "s1", tip: "Satış", kalemler: [{ miktar: 10, birimFiyat: 100, kdvOrani: 20 }] };
const cari = { hareketler: [{ siparisId: "s1", islemTipi: "Tahsilat", tutar: 600, paraBirimi: "TRY" }] };
const oz = siparisOdemeOzeti(sip, cari, 1000, "TRY");
bekle("kalan KDV dahil", { kdvDahil: oz.kdvDahilToplam, kalan: oz.kalan, odenen: oz.odenen }, { kdvDahil: 1200, kalan: 600, odenen: 600 });
bekle("KDV yoksa eski davranış", siparisOdemeOzeti({ id: "s1", kalemler: [{ miktar: 10, birimFiyat: 100 }] }, cari, 1000, "TRY").kalan, 400);

// 5. Fiş adı: atamada fisNo varsa konumdan türetilmez.
const u = { siparisNo: "10001", takipKodu: "10001", prosesIlerleme: [{ proses: "Kesim", atamalar: [
  { id: "a1", barkod: "10001", fisNo: "10001-Kesim", tamamlandiMi: true }, { id: "a2", barkod: "10001", tamirMi: true }] }] };
bekle("fiş ailesi atamadaki numaradan", uretimFisAdlari(u, 0, "a1")[0], "10001-Kesim");
bekle("numarasız (eski) atamada konumdan", uretimFisAdlari(u, 0, "a2")[0], "10001-Kesim-2");

// 6. Maliyet gruplama: aynı hammadde+renk+miktar, farklı ekleme → iki grup.
bekle("farklı ekleme ayrı grup", receteMaliyetGrupla([{ hammaddeUrunId: "d", renk: "Siyah", miktar: 2, eklemeId: "e1" }, { hammaddeUrunId: "d", renk: "Siyah", miktar: 2, eklemeId: "e2" }]).length, 2);
bekle("aynı ekleme tek grup", receteMaliyetGrupla([{ hammaddeUrunId: "d", renk: "Siyah", miktar: 2, eklemeId: "e1" }, { hammaddeUrunId: "d", renk: "Siyah", miktar: 2, eklemeId: "e1" }]).length, 1);

// 7. Kur yokken TL 0 + kurEksik.
const bf = hammaddeBirimFiyati({ id: "h", ad: "Deri", alisFiyati: 12, alisParaBirimi: "$", variants: [] }, "Siyah", "Standart", {});
bekle("kur yok: tl 0, kurEksik", { tl: bf.tl, kurEksik: bf.kurEksik, pb: bf.pb }, { tl: 0, kurEksik: true, pb: "USD" });
bekle("kur var: çevrilir", hammaddeBirimFiyati({ id: "h", ad: "Deri", alisFiyati: 12, alisParaBirimi: "$", variants: [] }, "Siyah", "Standart", { USD: 40 }).tl, 480);

process.exit(hata);
