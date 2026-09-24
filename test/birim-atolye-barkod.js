// BİRİM TESTİ — BARKODLA ATÖLYE.
//
// Kullanıcı: "Her personelin kendi barkodu... üretim barkodunu okutunca alınmış ise teslim,
// alınmamış ise alınacak... parçalanınca -1, -2 gibi hangi üretimin parçası olduğu bilinen kod."
const { parcaBarkoduUret, barkodCoz, siradakiAdim, dagitilmamis,
  enBuyukUretimNo, uretimAtamaEki, uretimBolunmusMu, uretimParcaKodlari } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

// ---- PARÇA KODU TÜRETME ----
bekle("ilk parça -1", parcaBarkoduUret("1001", []), "1001-1");
bekle("ikinci parça -2", parcaBarkoduUret("1001", ["1001-1"]), "1001-2");
bekle("en büyükten devam eder", parcaBarkoduUret("1001", ["1001-1", "1001-5"]), "1001-6");
// Bir parça silinse bile sıradaki kod GERİ GİTMEZ: basılmış etiket başka işi göstermemeli.
bekle("silinen parçanın kodu tekrar kullanılmaz", parcaBarkoduUret("1001", ["1001-2"]), "1001-3");
bekle("başka üretimin kodları karışmaz", parcaBarkoduUret("1002", ["1001-7"]), "1002-1");

// ---- BARKOD ÇÖZME ----
const cariler = [{ id: "p1", unvan: "Kalfa Ali", barkodKodu: "PRS-1", bagliProsesler: ["Kesim"] }];
const uretim = [{
  id: "u1", takipKodu: "1001", siparisNo: "1001", urunId: "m1",
  bedenMiktarlari: [{ beden: "40", miktar: 32 }],
  prosesIlerleme: [
    { proses: "Kesim", tamamlandiMi: false, atamalar: [
      { id: "a1", personelId: "p1", barkod: "1001-1", bedenMiktarlari: { 40: 12 }, tamamlandiMi: false },
    ] },
    { proses: "Saya", tamamlandiMi: false, atamalar: [] },
  ],
}];

bekle("personel barkodu tanınır", barkodCoz("PRS-1", cariler, uretim).tur, "personel");
bekle("parça barkodu tanınır", barkodCoz("1001-1", cariler, uretim).tur, "parca");
bekle("ana üretim kodu tanınır", barkodCoz("1001", cariler, uretim).tur, "uretim");
bekle("bilinmeyen kod → null", barkodCoz("zzz", cariler, uretim), null);
bekle("boş kod → null", barkodCoz("", cariler, uretim), null);

// ---- SIRADAKİ ADIM ----
bekle("sırası gelen adım Kesim", siradakiAdim(uretim[0]).adim.proses, "Kesim");
{
  // Kesim bitince sıra Saya'ya geçer; ÖNCEKİ bitmeden sonraki iş verilemez.
  const bitmis = { ...uretim[0], prosesIlerleme: [
    { ...uretim[0].prosesIlerleme[0], tamamlandiMi: true },
    uretim[0].prosesIlerleme[1],
  ] };
  bekle("Kesim bitince sıra Saya", siradakiAdim(bitmis).adim.proses, "Saya");
  const hepsiBitmis = { ...bitmis, prosesIlerleme: bitmis.prosesIlerleme.map((p) => ({ ...p, tamamlandiMi: true })) };
  bekle("hepsi bitmişse sıradaki yok", siradakiAdim(hepsiBitmis), null);
}

// ---- DAĞITILMAMIŞ MİKTAR (PARÇALANMA) ----
// 32 çiftin 12'si dağıtılmış; kalan 20 ikinci kalfaya gidebilir.
bekle("kalan dağıtılmamış miktar", dagitilmamis(uretim[0], uretim[0].prosesIlerleme[0]), [{ beden: "40", miktar: 20 }]);
{
  const tamDagitilmis = { ...uretim[0].prosesIlerleme[0], atamalar: [
    { id: "a1", bedenMiktarlari: { 40: 12 } }, { id: "a2", bedenMiktarlari: { 40: 20 } },
  ] };
  bekle("tamamı dağıtılmışsa boş", dagitilmamis(uretim[0], tamDagitilmis), []);
}

// ---- SİLİNEN NUMARA GERİ VERİLMEZ ----
// Kullanıcı: "üretimden fiş sildiğinde o üretim no başka üretim fişine verilmesin."
{
  // ÜRETİM NUMARALARI 5 HANE (10001'den başlar): personel barkodları 4 haneli proses bantlarından
  // geliyor (Kesim 1000-1999 gibi) ve "1001 üretim / 1001 kesici" çakışması yaşanmıştı.
  bekle("hiç kayıt yoksa taban 10000 → ilk üretim 10001", enBuyukUretimNo([], []), 10000);
  bekle("eski 4 haneli numaralar tabanı düşürmez",
    enBuyukUretimNo([{ siparisNo: "1001" }, { siparisNo: "1002" }], []), 10000);

  const mevcut = [{ siparisNo: "10001" }, { siparisNo: "10002" }];
  bekle("en büyük mevcut numara", enBuyukUretimNo(mevcut, []), 10002);
  // 10002 silinip çöpe düştüyse yeni üretim 10003 olmalı, 10002 DEĞİL.
  const cop = [{ tur: "uretim", veri: { siparisNo: "10002" } }];
  bekle("silinen numara çöpten okunur", enBuyukUretimNo([{ siparisNo: "10001" }], cop), 10002);
  bekle("çöpteki başka tür sayılmaz",
    enBuyukUretimNo([{ siparisNo: "10001" }], [{ tur: "cari", veri: { siparisNo: "99999" } }]), 10001);
}

// ---- FİŞ EKİ KONUMDAN DEĞİL BARKODDAN ----
{
  const u = { siparisNo: "1001", takipKodu: "1001" };
  const a1 = { id: "a1", barkod: "1001-1" };
  const a2 = { id: "a2", barkod: "1001-2" };
  bekle("ek barkoddan gelir", uretimAtamaEki(u, [a1, a2], a2), "-2");
  // a1 SİLİNSE bile a2'nin eki değişmemeli: eski fiş numarası aynı işi göstermeye devam etsin.
  bekle("silmeden sonra ek kaymaz", uretimAtamaEki(u, [a2], a2), "-2");
  // Barkodu olmayan eski kayıtlarda konuma düşülür.
  const eski1 = { id: "e1" }; const eski2 = { id: "e2" };
  bekle("barkodsuz eski kayıtta konum", uretimAtamaEki(u, [eski1, eski2], eski2), "-2");
  bekle("tek atamada ek yok", uretimAtamaEki(u, [eski1], eski1), "");
  bekle("atamasız (ara proses) ek yok", uretimAtamaEki(u, [], null), "");
}

// ---- BÖLÜNMÜŞ ÜRETİMDE ANA KOD KAPANIR ----
// Bildirilen hata: 104 çift Saya'da 64 + 40 bölündü, Kalfa'da yine 104 geldi.
{
  const bolunmemis = { takipKodu: "10006", siparisNo: "10006", prosesIlerleme: [
    { proses: "Saya", atamalar: [{ id: "a1", barkod: "10006", tamamlandiMi: true }] },
  ] };
  bekle("bölünmemiş üretim", uretimBolunmusMu(bolunmemis), false);
  bekle("bölünmemişte parça kodu yok", uretimParcaKodlari(bolunmemis), []);

  const bolunmus = { takipKodu: "10006", siparisNo: "10006", prosesIlerleme: [
    { proses: "Saya", atamalar: [
      { id: "a1", barkod: "10006-1", miktar: 64, tamamlandiMi: true },
      { id: "a2", barkod: "10006-2", miktar: 40, tamamlandiMi: true },
    ] },
    { proses: "Kalfa", atamalar: [] },
  ] };
  bekle("bölünmüş üretim tanınır", uretimBolunmusMu(bolunmus), true);
  bekle("parça kodları sırayla", uretimParcaKodlari(bolunmus), ["10006-1", "10006-2"]);
  // Bölünmüşte yeni atama ANA KODU ALMAZ: bir sonraki parça kodu üretilir.
  bekle("bölünmüşte sıradaki kod 10006-3",
    parcaBarkoduUret("10006", uretimParcaKodlari(bolunmus)), "10006-3");
}

console.log(hata ? "── ATÖLYE BARKOD TESTİ BAŞARISIZ ──" : "── atölye barkod testi temiz ──");
process.exit(hata);
