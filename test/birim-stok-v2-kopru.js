// BİRİM TESTİ — STOK v2 KÖPRÜSÜ (v1.726.0, src/038)
// Geçiş yapılmışsa (stk_ayar.aktif) ürünün varyant/hareket farkı REST'e satır satır değil, tek `rpc/stk_yaz` isteğiyle
// gider. Sahte bulutla ölçülür:
//   1. Yeni fiş: satırlar kimlikle gider (hammadde rengi adından, model rengi kodundan, beden adından); varyantlar /
//      stok_hareketleri tablolarına HİÇ istek gitmez.
//   2. Yeniden adlandırma (Tanımlar'da Taba → Taba Süet, ürünlerde de): hiçbir istek gitmez.
//   3. Kodsuz rengin model rengine çevrilmesi: hareket yeni kimlikle yeniden yazılır; eski varyant kaldırılır.
//   4. Silinen hareket iptal edilir; kaldırılan varyant kaldırılır; min stok değişimi gider.
//   5. İstek düşerse: söz reddedilir, bellek geri alınır (sonraki yazma aynı yükü yeniden gönderir), bekleyen defter dolar.
//   6. Büyük yük parçalanır: varyant açma ilk, iptal ve kaldırma son parçada.
//   7. Bayrak kapalıyken bugünkü yol (REST) aynen.
//   8. Türkçe ad karşılaştırması (İ/ı).
const bellek = {};
global.window = global.window || {};
global.window.localStorage = { getItem: (k) => (k in bellek ? bellek[k] : null), setItem: (k, v) => { bellek[k] = String(v); }, removeItem: (k) => { delete bellek[k]; } };
global.window.__supabaseYenidenDenemeMs = [];
const istekler = [];
let rpcDussun = false;
global.fetch = async (url, sec = {}) => {
  const yol = String(url).replace(/^.*\/rest\/v1\//, "");
  const yontem = sec.method || "GET";
  istekler.push({ yontem, yol, govde: sec.body ? String(sec.body) : "" });
  if (yol.startsWith("rpc/stk_yaz") && rpcDussun) throw new TypeError("Failed to fetch");
  if (yol.startsWith("rpc/stk_yaz")) {
    return { ok: true, status: 200, json: async () => ({ varyantAc: 0, satir: 0, iptal: 0, varyantKaldir: 0, atlanan: [] }), text: async () => "" };
  }
  const govde = yontem === "PATCH" ? [{ id: "x" }] : [];
  return { ok: true, status: 200, json: async () => govde, text: async () => "" };
};
const { supabaseTabloEsitle, tabloBaslangicTam, bekleyenKayitlariOku, surumleriYukle,
  stokV2Yuku, stokV2Parcala, stokV2Cozucu, stokV2Nrm, stokV2AktifAyarla, stokV2TanimlarAyarla } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const derin = (x) => JSON.parse(JSON.stringify(x));
const rpcYukleri = () => istekler.filter((r) => r.yol.startsWith("rpc/stk_yaz")).map((r) => JSON.parse(r.govde).p);
const altTabloIstegi = () => istekler.filter((r) => /^(varyantlar|stok_hareketleri)/.test(r.yol)).length;
const sifirla = () => { istekler.length = 0; };

const tanimlar = {
  renkler: [{ id: "r-siyah", ad: "Siyah" }, { id: "r-taba", ad: "Taba" }, { id: "r-kahve", ad: "Kahve" }],
  renkKombinasyonlari: [{ id: "kombi-1", kod: "1058", renkIdler: ["r-taba", "r-siyah"] }],
  bedenler: [{ id: "b-36", ad: "36", tip: "Beden" }, { id: "b-37", ad: "37", tip: "Beden" }],
};
const hrk = (id, renk, beden, miktar, fisNo, ek = {}) => ({ id, renk, beden, miktar, kaynak: "Satınalma", tarih: "2026-10-20T10:00:00.000Z", fisNo, ...ek });
const baslangic = [
  { id: "u-canta", ad: "Deri Çanta", kategori: "Mamul", olcuTipi: "Beden",
    variants: [{ renk: "1058 - Taba/Siyah", beden: "36", miktar: 10, minStok: 2 }, { renk: "Kahve", beden: "37", miktar: 3, minStok: 0 }],
    hareketler: [hrk("h1", "1058 - Taba/Siyah", "36", 10, "F-1"), hrk("h5", "Kahve", "37", 3, "F-5")] },
  { id: "u-kosele", ad: "Kösele", kategori: "Hammadde",
    variants: [{ renk: "Taba", renkId: "r-taba", beden: "Standart", miktar: 7, minStok: 1 }, { renk: "Siyah", renkId: "r-siyah", beden: "Standart", miktar: 0, minStok: 0 }],
    hareketler: [hrk("h2", "Taba", "Standart", 7, "F-1")] },
];

(async () => {
  stokV2AktifAyarla(true);
  stokV2TanimlarAyarla(tanimlar);
  tabloBaslangicTam("urunler", derin(baslangic));
  surumleriYukle("urunler", baslangic.map((u) => ({ id: u.id, surum: 1 })));

  console.log("1) Yeni fiş: kimlikle tek istek");
  sifirla();
  let stok = derin(baslangic);
  stok[0].hareketler.unshift(hrk("h10", "1058 - Taba/Siyah", "36", -2, "SAT-1", { siparisId: "sip-1", kalemId: "k-1" }));
  stok[1].hareketler.unshift(hrk("h11", "Taba", "Standart", 5, "ALS-2", { kullanici: "Ayşe" }));
  stok[0].variants[0].miktar = 8; stok[1].variants[0].miktar = 12;
  await supabaseTabloEsitle("urunler", stok);
  let y = rpcYukleri();
  bekle("tek rpc isteği", y.length, 1);
  bekle("alt tablolara REST isteği yok", altTabloIstegi(), 0);
  bekle("model rengi kodundan, beden adından", y[0].satirlar.find((s) => s.id === "h10") && [y[0].satirlar.find((s) => s.id === "h10").renkId, y[0].satirlar.find((s) => s.id === "h10").olcuId, y[0].satirlar.find((s) => s.id === "h10").fisId, y[0].satirlar.find((s) => s.id === "h10").kalemId], ["kombi-1", "b-36", "SAT-1", "k-1"]);
  bekle("hammadde rengi adından, Standart ölçüsüz", (({ renkId, olcuId, olcu, ek }) => [renkId, olcuId, olcu, ek.kullanici])(y[0].satirlar.find((s) => s.id === "h11")), ["r-taba", null, null, "Ayşe"]);
  bekle("miktarı değişen varyant gönderilmez (stok sunucuda hesaplanır)", y[0].varyantAc.length, 0);

  console.log("2) Yeniden adlandırma: istek yok");
  sifirla();
  const tanimlar2 = derin(tanimlar); tanimlar2.renkler[1].ad = "Taba Süet";
  stokV2TanimlarAyarla(tanimlar2);
  stok = derin(stok);
  stok[0].variants[0].renk = "1058 - Taba Süet/Siyah";
  stok[0].hareketler.forEach((h) => { if (h.renk === "1058 - Taba/Siyah") h.renk = "1058 - Taba Süet/Siyah"; });
  stok[1].variants[0].renk = "Taba Süet";
  stok[1].hareketler.forEach((h) => { if (h.renk === "Taba") h.renk = "Taba Süet"; });
  await supabaseTabloEsitle("urunler", stok);
  bekle("ad değişikliği hiçbir stok isteği üretmedi", [rpcYukleri().length, altTabloIstegi()], [0, 0]);

  console.log("3) Kodsuz renk model rengine: hareket yeni kimlikle, eski varyant kaldırılır");
  sifirla();
  stok = derin(stok);
  stok[0].variants = stok[0].variants.filter((v) => v.renk !== "Kahve");
  stok[0].variants.push({ renk: "1058 - Taba Süet/Siyah", beden: "37", miktar: 3, minStok: 0 });
  stok[0].hareketler.forEach((h) => { if (h.id === "h5") h.renk = "1058 - Taba Süet/Siyah"; });
  await supabaseTabloEsitle("urunler", stok);
  y = rpcYukleri();
  bekle("h5 yeniden yazıldı (kombi-1 / b-37)", y[0].satirlar.map((s) => [s.id, s.renkId, s.olcuId]), [["h5", "kombi-1", "b-37"]]);
  bekle("yeni varyant açıldı", y[0].varyantAc.map((v) => [v.renkId, v.olcuId]), [["kombi-1", "b-37"]]);
  bekle("eski varyant kaldırıldı", y[0].varyantKaldir.map((v) => [v.renkId, v.olcuId]), [["r-kahve", "b-37"]]);

  console.log("4) Silme → iptal; varyant kaldır; min stok");
  sifirla();
  stok = derin(stok);
  stok[0].hareketler = stok[0].hareketler.filter((h) => h.id !== "h10");
  stok[1].variants = stok[1].variants.filter((v) => v.renk !== "Siyah");
  stok[1].variants[0].minStok = 4;
  await supabaseTabloEsitle("urunler", stok);
  y = rpcYukleri();
  bekle("hareket iptal", y[0].iptal, ["h10"]);
  bekle("satır gönderilmedi", y[0].satirlar.length, 0);
  bekle("Siyah varyantı kaldırıldı", y[0].varyantKaldir.map((v) => [v.urunId, v.renkId]), [["u-kosele", "r-siyah"]]);
  bekle("min stok", y[0].varyantAc.map((v) => [v.renkId, v.minStok]), [["r-taba", 4]]);

  console.log("5) İstek düşerse: bellek geri, bekleyen defter, yeniden gönderim aynı yük");
  sifirla();
  rpcDussun = true;
  stok = derin(stok);
  stok[1].hareketler.unshift(hrk("h12", "Taba Süet", "Standart", -1, "SAT-2"));
  let red = null;
  await supabaseTabloEsitle("urunler", stok).catch((e) => { red = e; });
  bekle("söz reddedildi", !!red, true);
  bekle("bekleyen defterde ürünün hareketi", JSON.stringify(bekleyenKayitlariOku()).includes("h12"), true);
  rpcDussun = false;
  sifirla();
  await supabaseTabloEsitle("urunler", stok);
  y = rpcYukleri();
  bekle("yeniden gönderimde h12 yine gitti", y.length === 1 && y[0].satirlar.map((s) => s.id), ["h12"]);

  console.log("6) Büyük yük parçalanır");
  const buyuk = { varyantAc: [{ urunId: "u" }], iptal: ["x"], varyantKaldir: [{ urunId: "u" }],
    satirlar: Array.from({ length: 1200 }, (_, i) => ({ id: `s${i}`, fisId: "F", urunId: "u", miktar: 1 })) };
  const parcalar = stokV2Parcala(buyuk);
  bekle("üç parça (500/500/200)", parcalar.map((p) => p.satirlar.length), [500, 500, 200]);
  bekle("varyant açma ilk, iptal ve kaldırma son parçada", parcalar.map((p) => [p.varyantAc.length, p.iptal.length, p.varyantKaldir.length]), [[1, 0, 0], [0, 0, 0], [0, 1, 1]]);
  bekle("boş satırlı yük tek parça", stokV2Parcala({ varyantAc: [], satirlar: [], iptal: ["a"], varyantKaldir: [] }).length, 1);

  console.log("7) Fiş numarası olmayan hareket OTO- fişine");
  const oto = stokV2Yuku({ hareketFarki: { eklenen: [{ id: "q1", urun_id: "u-kosele", renk: "Siyah", beden: "Standart", miktar: 2, fis_no: null }], guncellenen: [], silinen: [] }, tanimlar });
  bekle("OTO-q1", [oto.satirlar[0].fisId, oto.otoFis], ["OTO-q1", ["q1"]]);

  console.log("8) Bayrak kapalı: bugünkü yol");
  stokV2AktifAyarla(false);
  sifirla();
  stok = derin(stok);
  stok[1].hareketler.unshift(hrk("h13", "Taba Süet", "Standart", 1, "ALS-3"));
  await supabaseTabloEsitle("urunler", stok);
  bekle("rpc yok, REST stok_hareketleri POST var", [rpcYukleri().length, istekler.some((r) => r.yontem === "POST" && r.yol.startsWith("stok_hareketleri"))], [0, true]);

  console.log("9) Türkçe ad karşılaştırması");
  const c = stokV2Cozucu({ renkler: [{ id: "r-isik", ad: "Işık Gri" }, { id: "r-ipek", ad: "İpek" }], bedenler: [{ id: "b-xl", ad: "XL", tip: "Beden" }, { id: "o-xl", ad: "XL", tip: "Boyut" }] });
  bekle("IŞIK GRİ / ipek / boşluklar", [c.renk("IŞIK  GRİ"), c.renk(" ipek "), c.renk("Standart"), c.renk("Yok")], ["r-isik", "r-ipek", null, null]);
  bekle("ölçü tipine göre", [c.olcu("XL", "Boyut"), c.olcu("xl", "Beden"), c.olcu("XL")], ["o-xl", "b-xl", "b-xl"]);
  bekle("stokV2Nrm", stokV2Nrm("  İSTANBUL   Kırmızı "), "istanbul kırmızı");

  console.log(hata ? "\nBAŞARISIZ" : "\nTAMAM");
  process.exit(hata);
})();
