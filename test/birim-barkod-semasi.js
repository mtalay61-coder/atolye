// BİRİM TESTİ — KALICI BARKOD ŞEMASI (90 + stok + renk + [beden | asorti])
//
// Kullanıcı (5 Eylül): "Barkod hep 90 ile başlasın. Renk, beden, stok hepsinin arka planda kodu
// olsun — 42 no beden aslında 04 nolu beden gibi. Kullanıcı görsün ama değiştiremesin."
//
// Ölçülen üç şey:
//   1. Kod ATANIYOR, türetilmiyor: ad değişince kod değişmiyor, silinen numara geri verilmiyor.
//   2. Dört seviye yalnızca UZUNLUKLA ayrılıyor (6/10/12/13) — seviye hanesi yok, o yüzden
//      uzunlukların çakışmadığı ayrıca ölçülüyor.
//   3. Çözücü "en yakın"ı tahmin etmiyor: karşılığı olmayan kod null.
const {
  KOD_HANE, BARKOD_UZUNLUK, kodMetni, kodlariAta, barkodEksikleri, cariKodlariAta, cariKodMetni,
  urunBarkoduKur, urunBarkoduCoz, varyantinBarkodu,
} = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

// ---- 1. ŞEMANIN KENDİSİ -----------------------------------------------------------------------
// Seviyeler seviye hanesiyle değil UZUNLUKLA ayrıldığı için, dört uzunluğun farklı olması şemanın
// çalışma şartı. Hane sayısı ileride değişirse bu iddia önce kırılsın.
const uzunluklar = [BARKOD_UZUNLUK.stok, BARKOD_UZUNLUK.renk, BARKOD_UZUNLUK.beden, BARKOD_UZUNLUK.asorti];
bekle("dört seviye uzunluğu", uzunluklar, [6, 10, 12, 13]);
bekle("uzunluklar çakışmıyor", new Set(uzunluklar).size, 4);

bekle("kod sıfırla dolduruluyor", kodMetni(3, 4), "0003");
bekle("hane taşarsa boş", kodMetni(12345, 4), "");
// SIFIR GEÇERLİ BİR KOD: "Standart" yer tutucusu için ayrıldı. Ama kodu ATANMAMIŞ bir kayıt
// (null/undefined) onunla karışmamalı — `Number(null)` sıfır verdiği için bu ayrım elle yapılıyor.
bekle("sıfır geçerli — Standart için ayrılmış", kodMetni(0, 4), "0000");
bekle("null kod → boş", kodMetni(null, 4), "");
bekle("tanımsız kod → boş", kodMetni(undefined, 4), "");

// ---- 2. KOD ATAMA -----------------------------------------------------------------------------
const stok0 = [
  { id: "m1", ad: "125 Model", olcuTipi: "Beden", variants: [
    { renk: "Siyah", renkId: "r-siyah", beden: "36" }, { renk: "Siyah", renkId: "r-siyah", beden: "37" },
    { renk: "Siyah", renkId: "r-siyah", beden: "38" }, { renk: "Siyah", renkId: "r-siyah", beden: "39" },
    { renk: "Siyah", renkId: "r-siyah", beden: "40" }, { renk: "Siyah", renkId: "r-siyah", beden: "42" },
    { renk: "Bej", renkId: "r-bej", beden: "38" },
  ] },
  { id: "m2", ad: "Kutu", olcuTipi: "Boyut", variants: [{ renk: "Beyaz", renkId: "r-beyaz", beden: "40" }] },
];
const tanimlar0 = {
  renkler: [{ id: "r-siyah", ad: "Siyah" }, { id: "r-bej", ad: "Bej" }, { id: "r-beyaz", ad: "Beyaz" }],
  bedenler: [
    { id: "b36", ad: "36", tip: "Beden" }, { id: "b37", ad: "37", tip: "Beden" },
    { id: "b38", ad: "38", tip: "Beden" }, { id: "b39", ad: "39", tip: "Beden" },
    { id: "b40", ad: "40", tip: "Beden" }, { id: "b42", ad: "42", tip: "Beden" },
    // "40" hem beden hem BOYUT olarak tanımlı: ayrı kayıt, ayrı kod. Ürünün ölçü tipi hangisine
    // bakılacağını söylüyor.
    { id: "y40", ad: "40", tip: "Boyut" },
  ],
  asortiler: [{ id: "as1", ad: "Standart 8li", oranlar: [
    { beden: "36", oran: 1 }, { beden: "37", oran: 2 }, { beden: "38", oran: 2 },
    { beden: "39", oran: 2 }, { beden: "40", oran: 1 },
  ] }],
};

const a1 = kodlariAta(stok0, tanimlar0);
bekle("atanan sayıları", a1.atanan, { stok: 2, renk: 3, beden: 7, asorti: 1 });
bekle("hiçbir aile dolmadı", a1.dolan, []);
bekle("stok no 1'den başlıyor", a1.stok.map((u) => u.stokNo), [1, 2]);
bekle("beden kodları sırayla", a1.tanimlar.bedenler.map((b) => b.barkodKodu), [1, 2, 3, 4, 5, 6, 7]);
bekle("sayaçlar kayıtlı", a1.tanimlar.kodSayaclari, { stok: 2, renk: 3, beden: 7, asorti: 1 });

// İkinci çağrı hiçbir kodu DEĞİŞTİRMEMELİ — "bir kez atanır" kuralının tam karşılığı bu.
const a2 = kodlariAta(a1.stok, a1.tanimlar);
bekle("ikinci atama kod değiştirmiyor", a2.atanan, { stok: 0, renk: 0, beden: 0, asorti: 0 });
bekle("kodlar aynı kaldı", a2.stok.map((u) => u.stokNo), [1, 2]);

// KULLANICININ TON KODUNA DOKUNULMAZ. `renk.kod` zaten dolu bir alan: kullanıcı aynı isimli
// tonları ayırt etmek için elle giriyor ve kombinasyon kodu önerisi de oradan okunuyor. Barkod
// kodu ayrı alanda (`barkodKodu`) duruyor; ikisi karışırsa kullanıcının girdiği kodlar ezilir ve
// tersinden, elle yazılmış "101" barkod kodu sanılır.
const tonKodlu = { ...tanimlar0, renkler: [{ id: "r-siyah", ad: "Siyah", kod: "101" }] };
const aTon = kodlariAta([], tonKodlu);
bekle("ton kodu korunuyor", aTon.tanimlar.renkler[0].kod, "101");
bekle("barkod kodu ayrı alanda", aTon.tanimlar.renkler[0].barkodKodu, 1);

// AD DEĞİŞİNCE KOD DEĞİŞMEZ. Türetilen kodun bu projede üç kez yaptığı hata buydu.
const adDegisti = a1.stok.map((u) => (u.id === "m1" ? { ...u, ad: "125 Model (yeni ad)" } : u));
bekle("ad değişse de stok no aynı", kodlariAta(adDegisti, a1.tanimlar).stok[0].stokNo, 1);

// SİLİNEN NUMARA GERİ VERİLMEZ. Sayaç tutulmasaydı silinen rengin numarası bir sonrakine düşer ve
// basılmış etiket başka rengi gösterirdi.
const renkSilindi = { ...a1.tanimlar, renkler: a1.tanimlar.renkler.filter((r) => r.id !== "r-beyaz") };
const a3 = kodlariAta(a1.stok, { ...renkSilindi, renkler: [...renkSilindi.renkler, { id: "r-yesil", ad: "Yeşil" }] });
bekle("silinen renk numarası yeniden kullanılmıyor",
  a3.tanimlar.renkler.find((r) => r.id === "r-yesil").barkodKodu, 4);

// AİLE DOLARSA sessizce sarmıyor, söylüyor. Beden 2 hane olduğu için en dar aile bu.
const cokBeden = {
  renkler: [], asortiler: [], kodSayaclari: { beden: 98 },
  bedenler: [{ id: "x1", ad: "x1", tip: "Beden" }, { id: "x2", ad: "x2", tip: "Beden" }],
};
const a4 = kodlariAta([], cokBeden);
bekle("son numara (99) verildi", a4.tanimlar.bedenler[0].barkodKodu, 99);
bekle("sınırı aşan koda kod verilmiyor", a4.tanimlar.bedenler[1].barkodKodu, undefined);
bekle("dolan aile bildiriliyor", a4.dolan, ["beden"]);

// ---- 3. KOD KURMA -----------------------------------------------------------------------------
const stok = a1.stok;
const tanimlar = a1.tanimlar;
const urun = stok[0];
const siyah36 = urun.variants[0];

bekle("sadece stok", urunBarkoduKur("stok", { stokNo: 3 }), "900003");
bekle("stok + renk", urunBarkoduKur("renk", { stokNo: 3, renkKod: 1021 }), "9000031021");
bekle("stok + renk + beden", urunBarkoduKur("beden", { stokNo: 3, renkKod: 1021, bedenKod: 4 }), "900003102104");
bekle("stok + renk + asorti", urunBarkoduKur("asorti", { stokNo: 3, renkKod: 1021, asortiKod: 225 }), "9000031021225");
bekle("eksik parça → boş kod", urunBarkoduKur("beden", { stokNo: 3, renkKod: 1021 }), "");

bekle("varyant barkodu", varyantinBarkodu(urun, siyah36, tanimlar), "900001000101");

// Boyut ölçülü üründe "40" BOYUT kaydına düşmeli (kod 7), beden kaydına (kod 5) değil.
bekle("boyut ölçüsü kendi kodunu kullanıyor",
  varyantinBarkodu(stok[1], stok[1].variants[0], tanimlar), "900002000307");

// ---- 4. KOD ÇÖZME -----------------------------------------------------------------------------
const cStok = urunBarkoduCoz("900001", stok, tanimlar);
bekle("stok seviyesi", [cStok.seviye, cStok.urun.id], ["stok", "m1"]);

const cRenk = urunBarkoduCoz("900001" + "0001", stok, tanimlar);
bekle("renk seviyesi", [cRenk.seviye, cRenk.renk], ["renk", "Siyah"]);

const cBeden = urunBarkoduCoz("900001000101", stok, tanimlar);
bekle("beden seviyesi", [cBeden.seviye, cBeden.renk, cBeden.beden], ["beden", "Siyah", "36"]);

// Kullanıcının örneği: 36:1 37:2 38:2 39:2 40:1 = 8 çift, birebir çözülmeli.
const asortiKod = urunBarkoduKur("asorti", { stokNo: 1, renkKod: 1, asortiKod: 1 });
bekle("asorti kodu 13 hane", asortiKod.length, 13);
const cAsorti = urunBarkoduCoz(asortiKod, stok, tanimlar);
bekle("asorti dağılımı", cAsorti.dagilim,
  [{ beden: "36", adet: 1 }, { beden: "37", adet: 2 }, { beden: "38", adet: 2 },
   { beden: "39", adet: 2 }, { beden: "40", adet: 1 }]);
bekle("asorti toplamı 8 çift", cAsorti.toplam, 8);
bekle("eksik beden yok", cAsorti.eksikBedenler, []);

// Bej renginde yalnızca 38 var: asortinin diğer bedenleri EKSİK olarak bildirilmeli, sessizce
// atlanmamalı — karşılığı üretilemeyecek satır yazmak, hiç yazmamaktan kötü.
const bejAsorti = urunBarkoduCoz(urunBarkoduKur("asorti", { stokNo: 1, renkKod: 2, asortiKod: 1 }), stok, tanimlar);
bekle("eksik bedenler bildiriliyor", bejAsorti.eksikBedenler, ["36", "37", "39", "40"]);
bekle("eksik olmayan beden ekleniyor", bejAsorti.toplam, 2);

// ---- 5. ÖLÇÜSÜZ / RENKSİZ STOK KARTI ---------------------------------------------------------
//
// Gerçek durumdan: "Deri" hammaddesinin varyantları renk × "Standart". "Standart" bir TANIM değil,
// uygulamanın renksiz/ölçüsüz kartlara yazdığı yer tutucu; tanımlar listesinde karşılığı yok.
// Kod tanımdan geldiği için barkod kurulamıyordu — 0 numarası bunun için ayrıldı.
const deri = {
  id: "deri", ad: "Deri", olcuTipi: "Beden", stokNo: 11,
  variants: [
    { renk: "Siyah", renkId: "r-siyah", beden: "Standart" },
    { renk: "Standart", beden: "Standart" },
  ],
};
const deriTanim = { renkler: [{ id: "r-siyah", ad: "Siyah", barkodKodu: 1 }], bedenler: [], asortiler: [] };

bekle("ölçüsüz varyantın barkodu kuruluyor",
  varyantinBarkodu(deri, deri.variants[0], deriTanim), "900011000100");
bekle("renksiz VE ölçüsüz varyantın barkodu kuruluyor",
  varyantinBarkodu(deri, deri.variants[1], deriTanim), "900011000000");

const cOlcusuz = urunBarkoduCoz("900011000100", [deri], deriTanim);
bekle("ölçüsüz kod çözülüyor", [cOlcusuz.renk, cOlcusuz.beden], ["Siyah", "Standart"]);
const cRenksiz = urunBarkoduCoz("900011000000", [deri], deriTanim);
bekle("renksiz kod çözülüyor", [cRenksiz.renk, cRenksiz.beden], ["Standart", "Standart"]);

// "Standart" EKSİK SAYILMAMALI: kullanıcıdan tanımlaması beklenmiyor, uyarı listesine girmemeli.
bekle("Standart eksik olarak bildirilmiyor", barkodEksikleri([deri], deriTanim).tanimsiz, []);

// Kullanıcı gerçekten "Standart" adında bir beden TANIMLARSA o tanımın kodu kazanır.
const standartTanimli = { ...deriTanim, bedenler: [{ id: "bs", ad: "Standart", tip: "Beden", barkodKodu: 9 }] };
bekle("tanımlanmış Standart kendi kodunu alır",
  varyantinBarkodu(deri, deri.variants[0], standartTanimli), "900011000109");

// ---- 6. TANINMAYAN KODLAR ----------------------------------------------------------------------
bekle("ön eki yanlış → null", urunBarkoduCoz("910001000101", stok, tanimlar), null);
bekle("rakam olmayan → null", urunBarkoduCoz("A-80000101-as1", stok, tanimlar), null);
bekle("tanınmayan stok no → null", urunBarkoduCoz("909999000101", stok, tanimlar), null);
bekle("tanınmayan renk kodu → null", urunBarkoduCoz("900001999901", stok, tanimlar), null);
bekle("üründe olmayan renk → null", urunBarkoduCoz("900002000101", stok, tanimlar), null);
bekle("üründe olmayan beden → null", urunBarkoduCoz("900001000206", stok, tanimlar), null);
bekle("geçersiz uzunluk → null", urunBarkoduCoz("90000100010", stok, tanimlar), null);
bekle("boş kod → null", urunBarkoduCoz("", stok, tanimlar), null);

// ---- 7. CARİ KODU ------------------------------------------------------------------------------
//
// Kullanıcı: "Tüm carilere değişmez kod verilmeli, ekranda görünmeli, değişmez kod id gibi."
// Barkodun parçası değil ama AYNI makine: atanır, sayaç geri gitmez, silinen numara yeniden
// verilmez.
const cariler0 = [{ id: "c1", unvan: "Müşteri B" }, { id: "c2", unvan: "Tedarikçi A" }];
const ck1 = cariKodlariAta(cariler0, {});
bekle("carilere kod atandı", ck1.cariler.map((c) => c.kod), [1, 2]);
bekle("cari sayacı kayıtlı", ck1.tanimlar.kodSayaclari.cari, 2);
bekle("ekranda dört hane", cariKodMetni(ck1.cariler[0]), "0001");
bekle("kodsuz cari boş metin", cariKodMetni({ unvan: "x" }), "");

// UNVAN DEĞİŞSE DE KOD DEĞİŞMEZ — kodun tek işi bu.
const unvanDegisti = ck1.cariler.map((c) => (c.id === "c1" ? { ...c, unvan: "Müşteri B Ltd." } : c));
bekle("unvan değişince kod aynı", cariKodlariAta(unvanDegisti, ck1.tanimlar).cariler[0].kod, 1);
bekle("ikinci atama kod vermiyor", cariKodlariAta(ck1.cariler, ck1.tanimlar).atanan, 0);

// SİLİNEN NUMARA GERİ VERİLMEZ: eski bir evrakta yazan kod başka cariyi göstermemeli.
const biriSilindi = ck1.cariler.filter((c) => c.id !== "c2");
const ck2 = cariKodlariAta([...biriSilindi, { id: "c3", unvan: "Yeni" }], ck1.tanimlar);
bekle("silinen numara yeniden kullanılmıyor", ck2.cariler.find((c) => c.id === "c3").kod, 3);

// Aralık dolarsa sessizce sarmıyor.
const ckDolu = cariKodlariAta([{ id: "x", unvan: "x" }], { kodSayaclari: { cari: 9999 } });
bekle("cari aralığı dolunca bildiriliyor", ckDolu.doldu, true);

// ---- MODEL RENGİ (kombinasyon) BARKODU ------------------------------------------------------------
// Kullanıcı (12 Eylül): "model rengi eşleşmeyen herhalde, orada kod tanımsızlığı var" — mamul varyant
// rengi "1001 - KAHVE SÜET/Bej" kombinasyon etiketi; renk listesinde olmadığı için "tanımsız"
// çıkıyordu. Kombinasyon kodu barkoda renk kodu olarak giriyor.
{
  const t = {
    renkler: [{ id: "r1", ad: "KAHVE SÜET", barkodKodu: 3 }, { id: "r2", ad: "Bej", barkodKodu: 4 }],
    bedenler: [{ id: "b41", ad: "41", tip: "Beden", barkodKodu: 41 }],
    renkKombinasyonlari: [{ id: "k1", kod: "1001", renkIdler: ["r1", "r2"] }],
    asortiler: [],
  };
  const urun = { id: "u9", ad: "Bot", stokNo: 7, olcuTipi: "Beden", variants: [{ renk: "1001 - KAHVE SÜET/Bej", beden: "41", miktar: 1 }] };
  const eksik = barkodEksikleri([urun], t);
  bekle("model rengi tanımsız SAYILMIYOR", eksik.tanimsiz, []);
  const kod = varyantinBarkodu(urun, urun.variants[0], t);
  bekle("barkod kombinasyon koduyla kuruluyor (renk kodu 1001)", kod.slice(-KOD_HANE.beden - KOD_HANE.renk, -KOD_HANE.beden), "1001");
  const cozum = urunBarkoduCoz(kod, [urun], t);
  bekle("okutulunca model rengine çözülüyor", cozum && [cozum.seviye, cozum.renk, cozum.renkTanim.modelRengiMi], ["beden", "1001 - KAHVE SÜET/Bej", true]);
  // Renkler yeniden adlandırılsa da kod başı eşleşir.
  bekle("etiket adı değişse kod başından eşleşir", barkodEksikleri([{ ...urun, variants: [{ renk: "1001 - Kahve/Bej", beden: "41" }] }], t).tanimsiz, []);
  // Renk sayacı kombinasyon kodlarını atlıyor: renk kodu 1001 verilmez.
  const atama = kodlariAta([], { ...t, kodSayaclari: { renk: 1000 }, renkler: [{ id: "r3", ad: "Yeni" }] });
  bekle("renk sayacı kombinasyon kodunu (1001) atlıyor", atama.tanimlar.renkler[0].barkodKodu, 1002);
}

console.log(hata ? "\nBARKOD ŞEMASI: HATA" : "\nBarkod şeması: tamam");
process.exit(hata);
