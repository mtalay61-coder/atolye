// BİRİM TESTİ — TEKLİF (v1.715.0, 326-teklif): numara, durum, toplam, siparişe çevirme, doğrulama, gruplama, çıktı.
const { sonrakiTeklifNo, teklifDurumu, teklifToplami, teklifiSipariseCevir, teklifKalemHatasi, teklifKalemGruplari, teklifYazdirHtml } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
bekle("ilk numara TKL-1001", sonrakiTeklifNo([], []), "TKL-1001");
bekle("en büyük + 1, çöp dahil", sonrakiTeklifNo([{ teklifNo: "TKL-1003" }], [{ tur: "teklif", veri: { teklifNo: "TKL-1007" } }]), "TKL-1008");
bekle("durum: saklanan", teklifDurumu({ durum: "Gönderildi", gecerlilikTarihi: "2026-12-01" }, "2026-10-23"), "Gönderildi");
bekle("durum: süresi doldu (açık + tarih geçti)", teklifDurumu({ durum: "Hazırlanıyor", gecerlilikTarihi: "2026-10-01" }, "2026-10-23"), "Süresi doldu");
bekle("durum: dönüşmüş teklif süresi dolmaz", teklifDurumu({ durum: "Siparişe dönüştü", gecerlilikTarihi: "2026-10-01" }, "2026-10-23"), "Siparişe dönüştü");
const t = { id: "t1", teklifNo: "TKL-1001", cariId: "c2", tarih: "2026-10-23", gecerlilikTarihi: "2026-11-07", teslimTarihi: "2026-11-20", not: "30 gün vade", musteriKodu: "REF-9",
  kalemler: [
    { id: "a", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 3, birim: "çift", birimFiyat: 100, paraBirimi: "TRY", kdvOrani: 20 },
    { id: "b", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 2, birim: "çift", birimFiyat: 100, paraBirimi: "TRY", kdvOrani: 20 },
    { id: "c", urunId: "u3", urunAd: "Çizme", renk: "Taba", beden: "42", miktar: 1, birim: "çift", birimFiyat: 50, paraBirimi: "USD" },
  ] };
bekle("toplam para birimi başına (KDV'li)", teklifToplami(t), { TRY: { matrah: 500, kdv: 100, toplam: 600, adet: 5 }, USD: { matrah: 50, kdv: 0, toplam: 50, adet: 1 } });
const s = teklifiSipariseCevir(t, { siparisler: [{ siparisNo: "SAT-1004", tip: "Satış" }], cop: [], simdi: "2026-10-23T10:00:00.000Z", bugun: "2026-10-23" });
bekle("sipariş: SAT numarası, Satış, Bekliyor, teklif bağı", [s.siparisNo, s.tip, s.durum, s.teklifNo, s.teklifId, s.cariId, s.teslimTarihi, s.not, s.musteriKodu], ["SAT-1005", "Satış", "Bekliyor", "TKL-1001", "t1", "c2", "2026-11-20", "30 gün vade", "REF-9"]);
bekle("sipariş kalemleri birebir, yeni kimlik, karşılanan 0", s.kalemler.map((k) => [k.urunAd, k.renk, k.beden, k.miktar, k.karsilanan, k.birimFiyat, k.paraBirimi, k.kdvOrani, k.id !== "a"]),
  [["Bot", "Siyah", "41", 3, 0, 100, "TRY", 20, true], ["Bot", "Siyah", "40", 2, 0, 100, "TRY", 20, true], ["Çizme", "Taba", "42", 1, 0, 50, "USD", undefined, true]]);
bekle("sipariş kalemi ambalaj null, kdvsiz kalemde kdvOrani yok, planlama taşınmaz", [s.kalemler[0].ambalaj, "kdvOrani" in s.kalemler[2], s.kalemler[0].planlama], [null, false, undefined]);
const sNot = teklifiSipariseCevir({ ...t, kalemler: [{ ...t.kalemler[0], notlar: [{ proses: "Kesim", metin: "dikkat" }], ambalaj: { renk: "Kahve" }, planlama: { tip: "Üretim" } }] }, { siparisler: [], cop: [], simdi: "x", bugun: "2026-10-23" });
bekle("kalem notu ve ambalaj birebir geçer (form aynı)", [sNot.kalemler[0].notlar, sNot.kalemler[0].ambalaj, sNot.kalemler[0].planlama], [[{ proses: "Kesim", metin: "dikkat" }], { renk: "Kahve" }, undefined]);
bekle("doğrulama: boş", teklifKalemHatasi([]), "En az 1 kalem ekleyin");
bekle("doğrulama: miktarsız", teklifKalemHatasi([{ urunId: "u", urunAd: "Bot", miktar: 0 }]), "Bot: miktar girin");
bekle("doğrulama: tamam", teklifKalemHatasi(t.kalemler), null);
bekle("gruplama ürün+renk, ölçüler sıralı", teklifKalemGruplari(t.kalemler).map((g) => `${g.urunAd}|${g.renk}:${g.kalemler.map((k) => k.beden).join(",")}`), ["Bot|Siyah:40,41", "Çizme|Taba:42"]);
const html = teklifYazdirHtml(t, { unvan: "Müşteri B", adres: "İzmir" }, { unvan: "Test Atölye", kdvAktif: true }, []);
bekle("çıktı: başlık, müşteri, kalem, KDV ve toplam", [/TEKLİF/.test(html), /TKL-1001/.test(html), /Müşteri B/.test(html), /Bot/.test(html), /KDV/.test(html), /600(,00)? ₺/.test(html), /2026-11-07/.test(html)], [true, true, true, true, true, true, true]);
bekle("çıktı: HTML kaçışı", /&lt;b&gt;/.test(teklifYazdirHtml({ ...t, not: "<b>x</b>" }, {}, {}, [])), true);
if (hata) { console.log("BİRİM TESTİ HATA: teklif"); process.exit(1); }
console.log("birim-teklif: tamam");
