// BİRİM TESTİ — E-FATURA ALTYAPISI (27 Eylül, v1.500.0 — Aşama 2; hiçbir yere bağlanmaz)
//
// Kullanıcı: "E-fatura altyapısı hazır olsun. Sonra bağlanacağız." İddialar:
//   • Taslak GERÇEK fiş yazımından kuruluyor (fisYaz → tumFisleriTopla): satır matrahı/KDV'si ve toplam
//     cariye yazılanla kuruşu kuruşuna aynı; peşin tahsilat satırı faturaya girmiyor.
//   • Eksikler: KDV'siz fiş, bilinmeyen senaryo, seri, satıcı/alıcı vergi ve adres bilgisi, %0 KDV istisna kodu,
//     döviz kuru, 7 gün kuralı. Hepsi dolunca engel yok.
//   • Numara: 16 karakter, seri+yıl içinde boşluksuz sıra; taslak numara tüketmez.
//   • UBL-TR XML: zorunlu alanlar, oran bazında KDV, döviz kuru, TCKN'li alıcıda ad/soyad, özel karakter kaçışı.
//   • Birim kodları ve tutarın yazıyla gösterimi.
const { fisYaz, tumFisleriTopla, faturaKur, faturaDogrula, faturaEngelVarMi, ublTrXml, efaturaBirimKodu, faturaNoBicimi,
  sonrakiFaturaSirasi, faturaSeriGecerliMi, ettnUret, efaturaVarsayilanSenaryo, faturaTutarYaziyla } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const var_ = (ad, xml, parca) => bekle(ad, xml.includes(parca), true);

const firma = { unvan: "Test Atölye Ltd. Şti.", vergiNo: "3230512384", vergiDairesi: "Kadıköy", adres: "Atölye Sk. 1", il: "İstanbul", ilce: "Kadıköy",
  telefon: "0216 000 00 00", email: "info@atolye.test", efaturaSeri: "ATL", earsivSeri: "ARS", kdvAktif: true };
const cari0 = { id: "c", unvan: "Deniz & Oğulları A.Ş.", tip: "Müşteri", vergiNo: "1234567890", vergiDairesi: "Beşiktaş", adres: "Çarşı Cd. 5", il: "İstanbul", ilce: "Beşiktaş",
  efaturaMukellef: "evet", hareketler: [] };
const stok0 = [{ id: "m", ad: "Bot", kategori: "Mamul", variants: [{ renk: "Siyah", beden: "40", miktar: 10 }], hareketler: [] },
  { id: "d", ad: "Deri", kategori: "Hammadde", birim: "desi", variants: [{ renk: "Siyah", beden: "", miktar: 100 }], hareketler: [] }];
const fisGovde = (kalemler, ek = {}) => ({
  fisNo: "SF-0001", tip: "Satış", cariId: "c", kaynak: "Satış", stokTarihi: "2026-09-25T09:00:00.000Z", cariTarihi: "2026-09-25",
  kayitParaBirimi: "TRY", kurlar: { USD: 40 }, kurZorunlu: true, tutarYuvarla: true, birimFiyatBolerek: false,
  yon: "Borç", defter: "Genel", odemeSekli: "Nakit", vade: "", siparis: null, kalemler, ...ek,
});
const kalemBot = { urunId: "m", urunAd: "Bot", renk: "Siyah", beden: "40", birim: "çift", miktar: 2, birimFiyat: 100, paraBirimi: "TRY", kdvOrani: 10 };
const kalemDeri = { urunId: "d", urunAd: "Deri", renk: "Siyah", beden: "", birim: "desi", miktar: 3, birimFiyat: 50, paraBirimi: "TRY", kdvOrani: 20 };
const kes = (kalemler, ek, cari = cari0) => {
  const r = fisYaz(JSON.parse(JSON.stringify(stok0)), [JSON.parse(JSON.stringify(cari))], fisGovde(kalemler, ek));
  const cari2 = r.cariler[0];
  if (r.pesinHareket) { /* cari tarafı zaten r.cariler'de */ }
  const fis = tumFisleriTopla(r.cariler, r.stok).find((f) => f.fisNo === "SF-0001");
  return { fis, cari: cari2 };
};
const kur = (fis, cari, ek = {}) => faturaKur({ fis, cari, firma, kurlar: { USD: 40 }, kayit: ek.kayit || null, faturalar: ek.faturalar || [], bugun: "2026-09-27", saat: "10:00:00", ...ek });

console.log("Taslak fişten");
const { fis, cari } = kes([kalemBot, kalemDeri], { pesin: { tutar: 100, hesapId: "k1", hesapTur: "kasa", hesapAd: "Kasa", paraBirimi: "TRY" } });
const f = kur(fis, cari);
bekle("satırlar: ad, miktar, birim kodu, matrah, oran, KDV (peşin tahsilat satırı yok)",
  f.satirlar.map((s) => [s.ad, s.miktar, s.birimKodu, s.birimFiyat, s.matrah, s.kdvOrani, s.kdvTutari, s.tutar]),
  [["Bot Siyah 40", 2, "PR", 100, 200, 10, 20, 220], ["Deri Siyah", 3, "DMK", 50, 150, 20, 30, 180]]);
bekle("toplam = cariye yazılan", [f.toplam, f.cariToplam], [{ matrah: 350, kdv: 50, genelToplam: 400, oranlar: [{ oran: 10, matrah: 200, kdv: 20 }, { oran: 20, matrah: 150, kdv: 30 }] }, 400]);
bekle("senaryo cari kartından (mükellef → Temel), seri, önizleme no", [f.senaryo, f.seri, f.onizlemeNo], ["TEMELFATURA", "ATL", "ATL2026000000001"]);
bekle("eksiksiz: engel yok, uyarı yok", faturaDogrula(f), []);

console.log("Eksikler");
const kdvsiz = kes([{ ...kalemBot, kdvOrani: undefined }]);
bekle("KDV'siz fiş engel", faturaDogrula(kur(kdvsiz.fis, kdvsiz.cari)).map((d) => d.alan), ["kdv"]);
const bilinmeyen = kur(fis, { ...cari, efaturaMukellef: "" });
// Senaryo bilinmeyince seri de bilinemez; iki ayrı mesaj kullanıcıyı yanıltırdı — yalnız senaryo engeli.
bekle("mükellefiyet bilinmiyor → senaryo engeli", faturaDogrula(bilinmeyen).map((d) => d.alan), ["senaryo"]);
bekle("mükellef değil → e-Arşiv serisi + e-posta uyarısı", [kur(fis, { ...cari, efaturaMukellef: "hayir" }).seri, faturaDogrula(kur(fis, { ...cari, efaturaMukellef: "hayir" })).map((d) => d.seviye + ":" + d.alan)], ["ARS", ["uyari:alici"]]);
const eksikAlici = kur(fis, { ...cari, vergiDairesi: "", il: "", vergiNo: "1234567891" });
bekle("alıcı: hatalı vergi no, daire, il", faturaDogrula(eksikAlici).map((d) => d.alan + ":" + d.mesaj.slice(9, 25)),
  ["alici:vergi no / TC ki", "alici:vergi dairesi bo", "alici:adresi, ili ve i"]);
const eksikFirma = faturaKur({ fis, cari, firma: { ...firma, vergiDairesi: "", efaturaSeri: "AT" }, kurlar: {}, faturalar: [], bugun: "2026-09-27" });
bekle("satıcı daire + geçersiz seri", faturaDogrula(eksikFirma).map((d) => d.alan), ["seri", "satici"]);
const sifir = kes([{ ...kalemBot, kdvOrani: 0 }]);
bekle("%0 KDV → istisna kodu engeli, kod girilince kalkar", [faturaDogrula(kur(sifir.fis, sifir.cari)).map((d) => d.alan), faturaDogrula(kur(sifir.fis, sifir.cari, { kayit: { istisnaKodu: "351" } }))], [["istisnaKodu"], []]);
bekle("7 gün kuralı uyarısı", faturaDogrula(kur(fis, cari, { kayit: { tarih: "2026-10-10" } })).map((d) => d.seviye + ":" + d.alan), ["uyari:tarih"]);
bekle("engel var mı", [faturaEngelVarMi(faturaDogrula(f)), faturaEngelVarMi(faturaDogrula(bilinmeyen))], [false, true]);

console.log("Numara ve kimlik");
bekle("16 karakter biçim", [faturaNoBicimi("ATL", "2026", 42), faturaNoBicimi("ATL", "2026", 42).length], ["ATL2026000000042", 16]);
bekle("seri geçerliliği", [faturaSeriGecerliMi("ATL"), faturaSeriGecerliMi("A1B"), faturaSeriGecerliMi("at1"), faturaSeriGecerliMi("ATLX")], [true, true, false, false]);
const verilmis = [{ faturaNo: "ATL2026000000007" }, { faturaNo: "ATL2025000000099" }, { faturaNo: null }, { faturaNo: "ARS2026000000003" }];
bekle("sıra seri+yıl içinde, taslaklar (numarasız) sayılmaz", [sonrakiFaturaSirasi(verilmis, "ATL", "2026"), sonrakiFaturaSirasi(verilmis, "ATL", "2027"), sonrakiFaturaSirasi(verilmis, "ARS", "2026")], [8, 1, 4]);
const e = ettnUret();
bekle("ETTN UUID v4", /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/.test(e), true);
bekle("ticari profil Tanımlar'dan", efaturaVarsayilanSenaryo({ efaturaMukellef: "evet" }, { efaturaProfil: "TICARIFATURA" }), "TICARIFATURA");

console.log("UBL-TR XML");
const xml = ublTrXml({ ...f, ettn: "11111111-2222-4333-8444-555555555555" });
[["profil", "<cbc:ProfileID>TEMELFATURA</cbc:ProfileID>"], ["numara", "<cbc:ID>ATL2026000000001</cbc:ID>"], ["TR1.2", "<cbc:CustomizationID>TR1.2</cbc:CustomizationID>"],
  ["ETTN", "<cbc:UUID>11111111-2222-4333-8444-555555555555</cbc:UUID>"], ["satıcı VKN", '<cbc:ID schemeID="VKN">3230512384</cbc:ID>'],
  ["alıcı unvan kaçışlı", "<cbc:Name>Deniz &amp; Oğulları A.Ş.</cbc:Name>"], ["toplam KDV", '<cbc:TaxAmount currencyID="TRY">50.00</cbc:TaxAmount>'],
  ["%10 alt toplam", '<cbc:TaxableAmount currencyID="TRY">200.00</cbc:TaxableAmount>'], ["ödenecek", '<cbc:PayableAmount currencyID="TRY">400.00</cbc:PayableAmount>'],
  ["satır birimi", '<cbc:InvoicedQuantity unitCode="PR">2</cbc:InvoicedQuantity>'], ["KDV kodu", "<cbc:TaxTypeCode>0015</cbc:TaxTypeCode>"],
  ["yazıyla", "<cbc:Note>Yalnız dörtyüz TL</cbc:Note>"], ["fiş notu", "<cbc:Note>Fiş/İrsaliye: SF-0001</cbc:Note>"],
].forEach(([ad, p]) => var_(ad, xml, p));
bekle("satır sayısı", (xml.match(/<cac:InvoiceLine>/g) || []).length, 2);
bekle("TRY faturada kur yok", xml.includes("PricingExchangeRate"), false);
// Öğe sırası (şema): tedarikçi → alıcı → vergi toplamı → parasal toplam → satırlar
const sira = ["AccountingSupplierParty", "AccountingCustomerParty", "<cac:TaxTotal>", "LegalMonetaryTotal", "<cac:InvoiceLine>"].map((s) => xml.indexOf(s));
bekle("öğe sırası şemaya uygun", sira.every((v, i) => v > 0 && (i === 0 || v > sira[i - 1])), true);
const tcknCari = { ...cari, vergiNo: "", tckn: "10000000146", unvan: "Ali Veli Yılmaz", vergiDairesi: "" };
const tx = ublTrXml(kur(fis, tcknCari));
bekle("TCKN'li alıcı: şema ve ad/soyad, vergi dairesi zorunlu değil",
  [tx.includes('<cbc:ID schemeID="TCKN">10000000146</cbc:ID>'), tx.includes("<cbc:FirstName>Ali Veli</cbc:FirstName><cbc:FamilyName>Yılmaz</cbc:FamilyName>"), faturaDogrula(kur(fis, tcknCari))], [true, true, []]);
const usd = kes([{ ...kalemBot, paraBirimi: "USD", birimFiyat: 5 }], { kayitParaBirimi: "USD" }, { ...cari0, paraBirimi: "USD" });
const uf = kur(usd.fis, usd.cari);
const ux = ublTrXml(uf);
bekle("döviz: USD belge, kur 40", [uf.paraBirimi, uf.kur, uf.toplam.genelToplam], ["USD", 40, 11]);
[["belge PB", "<cbc:DocumentCurrencyCode>USD</cbc:DocumentCurrencyCode>"], ["kur", "<cbc:CalculationRate>40</cbc:CalculationRate>"], ["USD tutar", '<cbc:PayableAmount currencyID="USD">11.00</cbc:PayableAmount>'],
  ["yazıyla USD", "Yalnız onbir ABD Doları"]].forEach(([ad, p]) => var_(ad, ux, p));
bekle("taslakta seçilen kur kullanılır", kur(usd.fis, usd.cari, { kayit: { kur: 41.5 } }).kur, 41.5);

console.log("Birim ve yazıyla");
bekle("birim kodları", ["Adet", "çift", "metre", "desi", "kg", "koli", "top"].map((b) => efaturaBirimKodu(b)),
  [{ kod: "C62", bilinen: true }, { kod: "PR", bilinen: true }, { kod: "MTR", bilinen: true }, { kod: "DMK", bilinen: true }, { kod: "KGM", bilinen: true }, { kod: "CT", bilinen: true }, { kod: "C62", bilinen: false }]);
bekle("tutar yazıyla (çek bordrosuyla aynı yardımcı)", [faturaTutarYaziyla(400, "TRY"), faturaTutarYaziyla(1250.5, "TRY")],
  ["Yalnız dörtyüz TL", "Yalnız binikiyüzelli TL elli kuruş"]);

process.exit(hata);
