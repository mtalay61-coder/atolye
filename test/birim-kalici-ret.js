// BİRİM — KALICI SUNUCU REDDİ (v1.744.0, F2): kural kodu okuma, açıklama, teslimli kalemin birleşmemesi.
const E = require("./erp.cjs");
let hata = 0;
const bak = (ad, gercek, beklenen) => { const ok = JSON.stringify(gercek) === JSON.stringify(beklenen); if (!ok) hata = 1;
  console.log(`  ${ok ? "✓" : "✗"} ${ad}${ok ? "" : `\n      beklenen: ${JSON.stringify(beklenen)}\n      çıkan:    ${JSON.stringify(gercek)}`}`); };
bak("KR kodu + stk_hareket satırı", E.kuralReddiOku(JSON.stringify({ code: "KR001", message: "Bağı çözülmüş … (stk_hareket hrk-1)" })),
  { kod: "KR001", mesaj: "Bağı çözülmüş … (stk_hareket hrk-1)", satirId: "hrk-1" });
bak("KR kodu + kalem satırı (iki nokta öncesi)", E.kuralReddiOku(JSON.stringify({ code: "KR002", message: "… silinemez (kalem k-9: Bot Siyah, teslim edilen 3)" })).satirId, "k-9");
bak("KR kodu + sipariş", E.kuralReddiOku(JSON.stringify({ code: "KR002", message: "Teslim geçmişi olan sipariş silinemez (sipariş s-4 SAT-4)" })).satirId, "s-4");
bak("42501 kural reddi sayılmaz", E.kuralReddiOku(JSON.stringify({ code: "42501", message: "permission denied" })), null);
bak("JSON olmayan gövde", E.kuralReddiOku("Bad gateway"), null);
bak("açıklama: kural reddi yetki / bağlantı değil", /veri kuralı/.test(E.bulutHatasiAciklamasi("Teslim … [KR002]") || ""), true);
const k = (id, karsilanan) => ({ id, urunId: "u", renk: "Siyah", beden: "41", birimFiyat: 10, paraBirimi: "TRY", miktar: 5, karsilanan, planlama: null });
bak("teslimsiz kalemler birleşir", E.bekleyenKalemleriBirlestir([k("a", 0), k("b", 0)]).map((x) => [x.id, x.miktar]), [["a", 10]]);
bak("teslimli kalem birleşmez (ne katılır ne alır)", E.bekleyenKalemleriBirlestir([k("a", 2), k("b", 0), k("c", 0), k("d", 1)]).map((x) => [x.id, x.miktar]), [["a", 5], ["b", 10], ["d", 5]]);
console.log(hata ? "── kalıcı ret birim testi HATALI ──" : "── kalıcı ret birim testi temiz ──");
process.exit(hata);
